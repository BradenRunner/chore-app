import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7', 10);

  if (days < 1 || days > 365) {
    return NextResponse.json({ error: 'days must be between 1 and 365' }, { status: 400 });
  }

  const history = await getHistory(days);
  return NextResponse.json({ days, history });
}
