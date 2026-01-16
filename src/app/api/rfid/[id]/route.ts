import { NextResponse } from 'next/server';
import { deleteRfidCard } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    if (!cardId) {
      return NextResponse.json({ error: 'cardId requerido' }, { status: 400 });
    }
    const deleted = await deleteRfidCard(cardId);
    return NextResponse.json({ deleted });
  } catch (error) {
    debugError('Error eliminando tarjeta RFID:', error);
    return NextResponse.json({ error: 'Error eliminando tarjeta' }, { status: 500 });
  }
}
