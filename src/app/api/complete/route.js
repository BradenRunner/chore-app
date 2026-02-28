import { NextResponse } from 'next/server';

export async function POST(request) {
  const { logChore } = require('@/lib/db');

  const body = await request.json();
  const { personId, description } = body;

  if (!personId || !description?.trim()) {
    return NextResponse.json(
      { error: 'personId and description are required' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const result = logChore(personId, description.trim(), today);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ success: true, date: today });
}

export async function DELETE(request) {
  const { deleteCompletion } = require('@/lib/db');
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  deleteCompletion(id);
  return NextResponse.json({ success: true });
}
