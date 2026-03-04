import { NextResponse } from 'next/server';
import { submitSkipReason, getAllPeople } from '@/lib/db';
import { sendNotification } from '@/lib/notify';

export async function POST(request) {
  const { personId, reason } = await request.json();

  if (!personId || !reason?.trim()) {
    return NextResponse.json(
      { error: 'personId and reason are required' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split('T')[0];
  await submitSkipReason(personId, reason.trim(), today);

  // Notify other people to vote
  try {
    const people = await getAllPeople();
    const skipper = people.find((p) => p.id === personId);
    const skipperName = skipper?.name || 'Someone';
    const others = people.filter((p) => p.id !== personId && p.ntfy_topic);

    for (const person of others) {
      await sendNotification(
        person.ntfy_topic,
        'Skip Vote Needed',
        `${skipperName} wants to skip: "${reason.trim()}". Open the app to vote!`
      );
    }
  } catch {
    // Don't fail the skip submission if notifications fail
  }

  return NextResponse.json({ success: true });
}
