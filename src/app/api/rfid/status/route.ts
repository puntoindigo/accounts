import { NextResponse } from 'next/server';
import { hasRfidCards } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const available = await hasRfidCards();
    return NextResponse.json({ available });
  } catch (error) {
    debugError('Error consultando estado RFID:', error);
    return NextResponse.json({ error: 'Error consultando RFID' }, { status: 500 });
  }
}
