import { NextResponse } from 'next/server';
import { getTodayStatus } from '@/lib/db';
import { remindSlackers } from '@/lib/notify';

export async function GET(request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const status = await getTodayStatus(today);
  const incomplete = status.filter((p) => !p.done);

  if (incomplete.length === 0) {
    return NextResponse.json({ message: 'Everyone done!', reminded: 0 });
  }

  const results = await remindSlackers(status);

  return NextResponse.json({
    message: `Reminded ${results.length} people`,
    reminded: results.length,
    results,
  });
}
