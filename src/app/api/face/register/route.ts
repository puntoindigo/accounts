import { NextResponse } from 'next/server';
import { saveFaceDescriptor } from '@/lib/identity-store';
import { debugError } from '@/lib/debug';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: any = null;
  try {
    body = await request.json();
  } catch (error) {
    debugError('Error parseando JSON en /api/face/register:', error);
    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );
  }
  const personId = String(body?.personId || body?.employeeId || '').trim();
  const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;
  const imageUrl = body?.imageUrl ? String(body.imageUrl) : null;

  if (!personId || !descriptor || descriptor.length === 0) {
    return NextResponse.json(
      { error: 'personId y descriptor son requeridos' },
      { status: 400 }
    );
  }

  try {
    const person = await saveFaceDescriptor(personId, descriptor, imageUrl);
    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch (error: any) {
    debugError('Error en /api/face/register:', error);
    return NextResponse.json({ error: error?.message || 'Error registrando rostro' }, { status: 500 });
  }
}
