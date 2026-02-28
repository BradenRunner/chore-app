import { NextResponse } from 'next/server';

export async function GET() {
  const { getAllChores } = require('@/lib/db');
  return NextResponse.json(getAllChores());
}

export async function POST(request) {
  const { addChore } = require('@/lib/db');
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  addChore(name.trim());
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { deleteChore } = require('@/lib/db');
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  deleteChore(id);
  return NextResponse.json({ success: true });
}
