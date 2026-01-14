import { NextResponse } from 'next/server';
import { createPerson, listPersons } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET() {
  const persons = await listPersons();
  return NextResponse.json({ persons });
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const nombre = String(body?.nombre || '').trim();
  const empresa = String(body?.empresa || '').trim();

  if (!email || !nombre || !empresa) {
    return NextResponse.json(
      { error: 'email, nombre y empresa son requeridos' },
      { status: 400 }
    );
  }

  if (!email.includes('@')) {
    return NextResponse.json(
      { error: 'email inválido' },
      { status: 400 }
    );
  }

  const person = await createPerson({ email, nombre, empresa });
  return NextResponse.json({ person }, { status: 201 });
}
