import { NextRequest, NextResponse } from 'next/server';
import { getPersonByEmail } from '@/lib/identity-store';

export const runtime = 'nodejs';

// Verificar token API del CRM
function verifyCrmToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  const expectedToken = process.env.CRM_API_TOKEN || '';
  return expectedToken && token === expectedToken;
}

// Verificar si un usuario existe y está activo (sin autenticar)
export async function POST(request: NextRequest) {
  if (!verifyCrmToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'email es requerido' }, { status: 400 });
    }

    const person = await getPersonByEmail(email);
    if (!person) {
      return NextResponse.json({ exists: false, active: false });
    }

    return NextResponse.json({
      exists: true,
      active: person.active,
      user: {
        id: person.id,
        email: person.email,
        nombre: person.nombre,
        empresa: person.empresa,
        isAdmin: person.isAdmin
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error verificando usuario' },
      { status: 500 }
    );
  }
}
