import { NextResponse } from 'next/server';
import { logPunishment } from '@/lib/db';

export async function POST(request) {
  const { personId, punishmentItemId } = await request.json();

  if (!personId || !punishmentItemId) {
    return NextResponse.json(
      { error: 'personId and punishmentItemId are required' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const result = await logPunishment(personId, punishmentItemId, today);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
