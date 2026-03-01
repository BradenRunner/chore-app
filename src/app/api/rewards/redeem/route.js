import { NextResponse } from 'next/server';
import { redeemReward } from '@/lib/db';

export async function POST(request) {
  const { personId, rewardId } = await request.json();

  if (!personId || !rewardId) {
    return NextResponse.json({ error: 'personId and rewardId are required' }, { status: 400 });
  }

  try {
    const result = await redeemReward(personId, rewardId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
