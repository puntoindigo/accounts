import { NextResponse } from 'next/server';
import { deleteRfidCard, setRfidCardActive } from '@/lib/identity-store';
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    if (!cardId) {
      return NextResponse.json({ error: 'cardId requerido' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const nextActive = typeof body.active === 'boolean' ? body.active : false;
    const card = await setRfidCardActive(cardId, nextActive);
    if (!card) {
      return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    debugError('Error actualizando tarjeta RFID:', error);
    return NextResponse.json({ error: 'Error actualizando tarjeta' }, { status: 500 });
  }
}
