import { NextResponse } from 'next/server';
import { getRecentRedemptions } from '@/lib/db';

export async function GET() {
  try {
    const redemptions = await getRecentRedemptions(10);
    return NextResponse.json(redemptions);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
