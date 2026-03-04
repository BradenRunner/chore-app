import { NextResponse } from 'next/server';
import {
  getTodayStatus,
  getNotificationSchedule,
  getEligibleScheduleEntries,
  hasNotificationBeenSent,
  markNotificationSent,
  getAllPeople,
  getSuppliesDueForAlert,
  markSupplyAlerted,
} from '@/lib/db';
import { remindSlackers, sendNotification } from '@/lib/notify';

export async function GET(request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentSlot = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  const schedule = await getNotificationSchedule();
  const eligible = getEligibleScheduleEntries(schedule, hours, minutes);

  if (eligible.length === 0) {
    return NextResponse.json({ message: 'No notification scheduled for this time', slot: currentSlot });
  }

  const alreadySent = await hasNotificationBeenSent(currentSlot, today);
  if (alreadySent) {
    return NextResponse.json({ message: 'Already sent for this slot today', slot: currentSlot });
  }

  const match = eligible[0];
  const status = await getTodayStatus(today);
  const incomplete = status.filter((p) => !p.done);

  if (incomplete.length === 0) {
    await markNotificationSent(currentSlot, today, 0);
    return NextResponse.json({ message: 'Everyone done!', reminded: 0 });
  }

  const results = await remindSlackers(status, match.title, match.body);
  await markNotificationSent(currentSlot, today, results.length);

  // ---- Supply alerts ----
  const dueSupplies = await getSuppliesDueForAlert(today);
  const supplyAlerts = [];

  if (dueSupplies.length > 0) {
    const people = await getAllPeople();
    for (const supply of dueSupplies) {
      const emptyDate = new Date(supply.last_restocked + 'T00:00:00');
      emptyDate.setDate(emptyDate.getDate() + supply.days_duration);
      const daysLeft = Math.max(0, Math.round((emptyDate.getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)));
      const msg = daysLeft === 0
        ? `Running low on ${supply.name}! It's empty!`
        : `Running low on ${supply.name}! ~${daysLeft} days left`;

      for (const person of people) {
        await sendNotification(person.ntfy_topic, 'Supply Alert', msg);
      }
      await markSupplyAlerted(supply.id, today);
      supplyAlerts.push({ supply: supply.name, daysLeft });
    }
  }

  return NextResponse.json({
    message: `Reminded ${results.length} people`,
    reminded: results.length,
    results,
    supplyAlerts,
  });
}
