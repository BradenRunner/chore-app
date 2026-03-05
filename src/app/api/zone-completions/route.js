import { NextResponse } from 'next/server';
import { getLatestZoneCompletions, logZoneCompletions } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const choreType = searchParams.get('choreType');
    if (!choreType) {
      return NextResponse.json({ error: 'choreType is required' }, { status: 400 });
    }
    const zones = await getLatestZoneCompletions(choreType);
    return NextResponse.json(zones);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { zoneIds, choreType, personId } = await request.json();
    if (!Array.isArray(zoneIds) || !zoneIds.length || !choreType || !personId) {
      return NextResponse.json({ error: 'zoneIds, choreType, and personId are required' }, { status: 400 });
    }
    const today = new Date().toISOString().split('T')[0];
    await logZoneCompletions(zoneIds, choreType, personId, today);
    return NextResponse.json({ success: true, date: today });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
