import { NextResponse } from 'next/server';
import { getTokenBalance, getTokenTransactions, adjustTokenBalance } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const personId = searchParams.get('personId');

  if (!personId) {
    return NextResponse.json({ error: 'personId is required' }, { status: 400 });
  }

  const balance = await getTokenBalance(Number(personId));
  const transactions = await getTokenTransactions(Number(personId));

  return NextResponse.json({ balance, transactions });
}

export async function POST(request) {
  const { personId, amount, description } = await request.json();

  if (!personId || amount === undefined) {
    return NextResponse.json({ error: 'personId and amount are required' }, { status: 400 });
  }

  const newBalance = await adjustTokenBalance(
    personId,
    amount,
    'admin',
    description || 'Admin adjustment'
  );

  return NextResponse.json({ success: true, balance: newBalance });
}
