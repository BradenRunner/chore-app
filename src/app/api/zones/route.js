import { NextResponse } from 'next/server';
import { getAllZones, updateZoneGridCells } from '@/lib/db';

export async function GET() {
  try {
    const zones = await getAllZones();
    return NextResponse.json(zones);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, grid_cells } = await request.json();
    if (!id || !Array.isArray(grid_cells)) {
      return NextResponse.json({ error: 'id and grid_cells array are required' }, { status: 400 });
    }
    await updateZoneGridCells(id, grid_cells);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
