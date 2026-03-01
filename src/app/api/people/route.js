import { NextResponse } from 'next/server';
import { getAllPeople, addPerson, updatePerson, deletePerson } from '@/lib/db';

export async function GET() {
  const people = await getAllPeople();
  // Strip pin from response for security
  const safe = people.map(({ pin, ...rest }) => rest);
  return NextResponse.json(safe);
}

export async function POST(request) {
  const { name, pin } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  await addPerson(name.trim(), pin || undefined);
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  const { id, name, ntfy_topic, pin } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await updatePerson(id, { name, ntfy_topic, pin });
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deletePerson(id);
  return NextResponse.json({ success: true });
}
