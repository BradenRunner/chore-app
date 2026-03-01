import { NextResponse } from 'next/server';
import {
  getAllPunishmentItems,
  addPunishmentItem,
  updatePunishmentItem,
  deletePunishmentItem,
} from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getAllPunishmentItems());
}

export async function POST(request) {
  const { name, token_deduction } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  await addPunishmentItem(name.trim(), token_deduction || 0);
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  const { id, ...fields } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await updatePunishmentItem(id, fields);
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deletePunishmentItem(id);
  return NextResponse.json({ success: true });
}
