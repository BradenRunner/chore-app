import { NextResponse } from 'next/server';
import { castSkipVote, getPendingSkipVotesForVoter } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const voterId = searchParams.get('voterId');

  if (!voterId) {
    return NextResponse.json({ error: 'voterId is required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const pending = await getPendingSkipVotesForVoter(Number(voterId), today);
  return NextResponse.json(pending);
}

export async function POST(request) {
  const { skipReasonId, voterId, vote } = await request.json();

  if (!skipReasonId || !voterId || !vote) {
    return NextResponse.json(
      { error: 'skipReasonId, voterId, and vote are required' },
      { status: 400 }
    );
  }

  if (vote !== 'valid' && vote !== 'invalid') {
    return NextResponse.json(
      { error: 'vote must be "valid" or "invalid"' },
      { status: 400 }
    );
  }

  const result = await castSkipVote(skipReasonId, voterId, vote);
  return NextResponse.json(result);
}
