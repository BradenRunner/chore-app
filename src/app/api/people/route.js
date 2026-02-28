import { NextResponse } from 'next/server';

export async function GET() {
  const { getAllPeople } = require('@/lib/db');
  return NextResponse.json(getAllPeople());
}

export async function POST(request) {
  const { addPerson } = require('@/lib/db');
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  addPerson(name.trim());
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  const { updatePerson } = require('@/lib/db');
  const { id, name, ntfy_topic } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  updatePerson(id, { name, ntfy_topic });
  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const { deletePerson } = require('@/lib/db');
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  deletePerson(id);
  return NextResponse.json({ success: true });
}
