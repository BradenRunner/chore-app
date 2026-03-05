import { NextResponse } from 'next/server';
import { getAllChores, addChore, deleteChore, updateChoreTokenValue, updateChoreName } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getAllChores());
}

export async function POST(request) {
  const { name, token_value } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  await addChore(name.trim(), token_value);
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  try {
    const { id, token_value, name } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (name !== undefined) {
      await updateChoreName(id, name.trim());
    }
    if (token_value !== undefined) {
      await updateChoreTokenValue(id, token_value);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteChore(id);
  return NextResponse.json({ success: true });
}
