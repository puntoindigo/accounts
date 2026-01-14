import { NextResponse } from 'next/server';
import { saveFaceDescriptor } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const personId = String(body?.personId || body?.employeeId || '').trim();
  const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;

  if (!personId || !descriptor || descriptor.length === 0) {
    return NextResponse.json(
      { error: 'personId y descriptor son requeridos' },
      { status: 400 }
    );
  }

  const person = await saveFaceDescriptor(personId, descriptor);
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ person });
}
