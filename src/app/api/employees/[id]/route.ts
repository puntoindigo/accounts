import { NextResponse } from 'next/server';
import { deleteEmployee, getEmployee, updateEmployee } from '@/lib/identity-store';

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  const employee = await getEmployee(context.params.id);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const body = await request.json();
  const updates = {
    legajo: body?.legajo ? String(body.legajo) : undefined,
    nombre: body?.nombre ? String(body.nombre) : undefined,
    empresa: body?.empresa ? String(body.empresa) : undefined
  };

  const employee = await updateEmployee(context.params.id, updates);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const removed = await deleteEmployee(context.params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
