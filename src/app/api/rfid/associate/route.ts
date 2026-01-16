import { NextResponse } from 'next/server';
import { createRfidCard, getPerson, getRfidCardByUid } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = String(body?.personId || '').trim();
    const uid = String(body?.uid || '').trim();

    if (!personId || !uid) {
      return NextResponse.json({ error: 'personId y uid son requeridos' }, { status: 400 });
    }

    const person = await getPerson(personId);
    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    const existing = await getRfidCardByUid(uid);
    if (existing) {
      return NextResponse.json({ error: 'UID ya asociado', card: existing }, { status: 409 });
    }

    const card = await createRfidCard({ personId, uid });
    return NextResponse.json({ card });
  } catch (error) {
    debugError('Error asociando tarjeta RFID:', error);
    return NextResponse.json({ error: 'Error asociando tarjeta' }, { status: 500 });
  }
}
