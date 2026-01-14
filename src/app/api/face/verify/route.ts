import { NextResponse } from 'next/server';
import { listEmployees } from '@/lib/identity-store';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json();
  const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;

  if (!descriptor || descriptor.length === 0) {
    return NextResponse.json(
      { error: 'descriptor es requerido' },
      { status: 400 }
    );
  }

  const employees = await listEmployees();
  const match = findEmployeeByFace(descriptor, employees);

  if (!match) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, match });
}
