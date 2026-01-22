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

// Obtener información de usuario por email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  if (!verifyCrmToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam).trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'email es requerido' }, { status: 400 });
    }

    const person = await getPersonByEmail(email);
    if (!person) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: person.id,
        email: person.email,
        nombre: person.nombre,
        empresa: person.empresa,
        isAdmin: person.isAdmin,
        active: person.active,
        hasFaceRecognition: !!person.faceDescriptor,
        faceImageUrl: person.faceImageUrl,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error obteniendo usuario' },
      { status: 500 }
    );
  }
}
