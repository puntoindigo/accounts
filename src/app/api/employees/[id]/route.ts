import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { deleteEmployee, getEmployee, updateEmployee } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const employee = await getEmployee(id);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const updates = {
    legajo: body?.legajo ? String(body.legajo) : undefined,
    nombre: body?.nombre ? String(body.nombre) : undefined,
    empresa: body?.empresa ? String(body.empresa) : undefined
  };

  const employee = await updateEmployee(id, updates);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const removed = await deleteEmployee(id);
  if (!removed) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
