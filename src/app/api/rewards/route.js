import { NextResponse } from 'next/server';
import { getAllRewards, addReward, updateReward, deleteReward } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getAllRewards());
}

export async function POST(request) {
  const { name, token_cost } = await request.json();

  if (!name?.trim() || !token_cost) {
    return NextResponse.json({ error: 'name and token_cost are required' }, { status: 400 });
  }

  await addReward(name.trim(), token_cost);
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  const { id, ...fields } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await updateReward(id, fields);
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteReward(id);
  return NextResponse.json({ success: true });
}
