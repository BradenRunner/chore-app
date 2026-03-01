import { NextResponse } from 'next/server';
import { logChore, deleteCompletion, getChoreByName, adjustTokenBalance } from '@/lib/db';

export async function POST(request) {
  const body = await request.json();
  const { personId, description } = body;

  if (!personId || !description?.trim()) {
    return NextResponse.json(
      { error: 'personId and description are required' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split('T')[0];
  await logChore(personId, description.trim(), today);

  // Award tokens based on chore's token_value
  try {
    const chore = await getChoreByName(description.trim());
    if (chore && chore.token_value) {
      await adjustTokenBalance(
        personId,
        chore.token_value,
        'chore',
        `Completed: ${chore.name}`,
        chore.id
      );
    }
  } catch {
    // Chore lookup may fail for free-text entries; skip token award
  }

  return NextResponse.json({ success: true, date: today });
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteCompletion(id);
  return NextResponse.json({ success: true });
}
