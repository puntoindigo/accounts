import { NextResponse } from 'next/server';
import { saveFaceDescriptor } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const employeeId = String(body?.employeeId || '').trim();
  const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;

  if (!employeeId || !descriptor || descriptor.length === 0) {
    return NextResponse.json(
      { error: 'employeeId y descriptor son requeridos' },
      { status: 400 }
    );
  }

  const employee = await saveFaceDescriptor(employeeId, descriptor);
  if (!employee) {
    return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ employee });
}
