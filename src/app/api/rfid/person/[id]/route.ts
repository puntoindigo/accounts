import { NextResponse } from 'next/server';
import { listRfidCards } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const personId = params.id;
    if (!personId) {
      return NextResponse.json({ error: 'personId requerido' }, { status: 400 });
    }

    const cards = await listRfidCards(personId);
    return NextResponse.json({ cards });
  } catch (error) {
    debugError('Error listando tarjetas RFID:', error);
    return NextResponse.json({ error: 'Error listando tarjetas' }, { status: 500 });
  }
}
