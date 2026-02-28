import { NextResponse } from 'next/server';

export async function GET() {
  const { getTodayStatus, getStreak, getWeeklyCount } = require('@/lib/db');

  const today = new Date().toISOString().split('T')[0];
  const status = getTodayStatus(today);

  const result = status.map((person) => ({
    ...person,
    streak: getStreak(person.id, today),
    weeklyCount: getWeeklyCount(person.id, today),
  }));

  return NextResponse.json({ date: today, people: result });
}
