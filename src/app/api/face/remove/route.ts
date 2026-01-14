import { NextResponse } from 'next/server';
import { clearFaceDescriptor } from '@/lib/identity-store';

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body?.employeeId || '').trim();

  if (!employeeId) {
    return NextResponse.json(
      { error: 'employeeId es requerido' },
      { status: 400 }
    );
  }

  const employee = await clearFaceDescriptor(employeeId);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ employee });
}
