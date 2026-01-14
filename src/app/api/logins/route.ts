import { NextResponse } from 'next/server';
import { listActivity } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  try {
    const events = await listActivity(status === 'failed' || status === 'success' ? status : undefined);
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando actividad' }, { status: 500 });
  }
}
