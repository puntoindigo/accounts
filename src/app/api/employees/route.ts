import { NextResponse } from 'next/server';
import { createEmployee, listEmployees } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET() {
  const employees = await listEmployees();
  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const body = await request.json();
  const legajo = String(body?.legajo || '').trim();
  const nombre = String(body?.nombre || '').trim();
  const empresa = String(body?.empresa || '').trim();

  if (!legajo || !nombre || !empresa) {
    return NextResponse.json(
      { error: 'legajo, nombre y empresa son requeridos' },
      { status: 400 }
    );
  }

  const employee = await createEmployee({ legajo, nombre, empresa });
  return NextResponse.json({ employee }, { status: 201 });
}
