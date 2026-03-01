import { NextResponse } from 'next/server';
import { submitSkipReason } from '@/lib/db';

export async function POST(request) {
  const { personId, reason } = await request.json();

  if (!personId || !reason?.trim()) {
    return NextResponse.json(
      { error: 'personId and reason are required' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split('T')[0];
  await submitSkipReason(personId, reason.trim(), today);

  return NextResponse.json({ success: true });
}
