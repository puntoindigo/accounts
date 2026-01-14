import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { deletePerson, getPerson, updatePerson } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const person = await getPerson(id);
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
  }
  return NextResponse.json({ person });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const updates = {
    email: body?.email ? String(body.email) : undefined,
    nombre: body?.nombre ? String(body.nombre) : undefined,
    empresa: body?.empresa ? String(body.empresa) : undefined,
    active: typeof body?.active === 'boolean' ? body.active : undefined,
    isAdmin: typeof body?.isAdmin === 'boolean' ? body.isAdmin : undefined
  };

  const person = await updatePerson(id, updates);
  if (!person) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
  }
  return NextResponse.json({ person });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const removed = await deletePerson(id);
  if (!removed) {
    return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
