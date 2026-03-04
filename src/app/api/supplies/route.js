import { NextResponse } from 'next/server';
import { getAllSupplies, addSupply, updateSupply, deleteSupply } from '@/lib/db';

export async function GET() {
  try {
    const supplies = await getAllSupplies();
    const today = new Date().toISOString().split('T')[0];
    const todayMs = new Date(today + 'T00:00:00').getTime();

    const enriched = supplies.map((s) => {
      const emptyDate = new Date(s.last_restocked + 'T00:00:00');
      emptyDate.setDate(emptyDate.getDate() + s.days_duration);
      const emptyDateStr = emptyDate.toISOString().split('T')[0];
      const daysRemaining = Math.max(0, Math.round((emptyDate.getTime() - todayMs) / (1000 * 60 * 60 * 24)));
      return { ...s, daysRemaining, emptyDate: emptyDateStr };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, daysDuration, alertDaysBefore, alertIntervalDays } = await request.json();
    if (!name?.trim() || !daysDuration) {
      return NextResponse.json({ error: 'name and daysDuration are required' }, { status: 400 });
    }
    await addSupply(name.trim(), daysDuration, alertDaysBefore, alertIntervalDays);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, ...fields } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await updateSupply(id, fields);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await deleteSupply(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
