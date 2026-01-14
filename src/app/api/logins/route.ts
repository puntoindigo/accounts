import { NextResponse } from 'next/server';
import { listLoginEvents } from '@/lib/identity-store';

export async function GET() {
  const events = await listLoginEvents();
  return NextResponse.json({ events });
}
