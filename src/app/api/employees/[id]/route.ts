import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { deletePerson, getPerson, updatePerson } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const person = await getPerson(id);
    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ person });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error obteniendo persona' }, { status: 500 });
  }
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

  try {
    const person = await updatePerson(id, updates);
    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ person });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando persona' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const removed = await deletePerson(id);
    if (!removed) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando persona' }, { status: 500 });
  }
}
