import { NextResponse } from 'next/server';
import { verifyPin, logLogin } from '@/lib/db';

export async function POST(request) {
  const { personId, pin } = await request.json();

  if (!personId || !pin) {
    return NextResponse.json(
      { error: 'personId and pin are required' },
      { status: 400 }
    );
  }

  const person = await verifyPin(personId, pin);
  if (!person) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
  }

  await logLogin(personId);

  return NextResponse.json({
    id: person.id,
    name: person.name,
    ntfy_topic: person.ntfy_topic,
  });
}
