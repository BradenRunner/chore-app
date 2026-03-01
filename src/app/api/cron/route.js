import { NextResponse } from 'next/server';
import {
  getTodayStatus,
  getNotificationSchedule,
  hasNotificationBeenSent,
  markNotificationSent,
} from '@/lib/db';
import { remindSlackers } from '@/lib/notify';

export async function GET(request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0');
  const currentSlot = `${hours}:${minutes}`;
  const today = now.toISOString().split('T')[0];

  const schedule = await getNotificationSchedule();
  const match = schedule.find((s) => s.time === currentSlot);

  if (!match) {
    return NextResponse.json({ message: 'No notification scheduled for this time', slot: currentSlot });
  }

  const alreadySent = await hasNotificationBeenSent(currentSlot, today);
  if (alreadySent) {
    return NextResponse.json({ message: 'Already sent for this slot today', slot: currentSlot });
  }

  const status = await getTodayStatus(today);
  const incomplete = status.filter((p) => !p.done);

  if (incomplete.length === 0) {
    await markNotificationSent(currentSlot, today, 0);
    return NextResponse.json({ message: 'Everyone done!', reminded: 0 });
  }

  const results = await remindSlackers(status);
  await markNotificationSent(currentSlot, today, results.length);

  return NextResponse.json({
    message: `Reminded ${results.length} people`,
    reminded: results.length,
    results,
  });
}
