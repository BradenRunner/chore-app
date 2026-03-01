import { NextResponse } from 'next/server';
import { getTodayStatus, getStreak, getWeeklyCount } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const status = await getTodayStatus(today);

    const result = await Promise.all(
      status.map(async (person) => ({
        ...person,
        streak: await getStreak(person.id, today),
        weeklyCount: await getWeeklyCount(person.id, today),
      }))
    );

    return NextResponse.json({ date: today, people: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
