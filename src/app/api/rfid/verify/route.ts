import { NextResponse } from 'next/server';
import { getPerson, getRfidCardByUid } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uid = String(body?.uid || '').trim();
    if (!uid) {
      return NextResponse.json({ error: 'UID requerido' }, { status: 400 });
    }

    const card = await getRfidCardByUid(uid);
    if (!card) {
      return NextResponse.json({ found: false, uid });
    }

    const person = await getPerson(card.personId);
    if (!person || !person.active) {
      return NextResponse.json({ found: false, uid, reason: 'inactive' });
    }

    return NextResponse.json({
      found: true,
      uid,
      card,
      person: {
        id: person.id,
        email: person.email,
        nombre: person.nombre,
        empresa: person.empresa,
        active: person.active
      }
    });
  } catch (error) {
    debugError('Error verificando tarjeta RFID:', error);
    return NextResponse.json({ error: 'Error verificando tarjeta' }, { status: 500 });
  }
}
