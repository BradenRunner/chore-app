import { NextResponse } from 'next/server';
import {
  getNotificationSchedule,
  addNotificationTime,
  deleteNotificationTime,
} from '@/lib/db';

export async function GET() {
  const schedule = await getNotificationSchedule();
  return NextResponse.json(schedule);
}

export async function POST(request) {
  const { time } = await request.json();

  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Invalid time format. Use HH:MM.' }, { status: 400 });
  }

  const [h, m] = time.split(':').map(Number);
  if (h < 0 || h > 23 || ![0, 15, 30, 45].includes(m)) {
    return NextResponse.json({ error: 'Hours must be 0-23, minutes must be 00/15/30/45.' }, { status: 400 });
  }

  await addNotificationTime(time);
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await deleteNotificationTime(id);
  return NextResponse.json({ success: true });
}
