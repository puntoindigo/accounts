import { NextResponse } from 'next/server';
import { clearFaceDescriptor } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const personId = String(body?.personId || body?.employeeId || '').trim();

  if (!personId) {
    return NextResponse.json(
      { error: 'personId es requerido' },
      { status: 400 }
    );
  }

  const person = await clearFaceDescriptor(personId);
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ person });
}
