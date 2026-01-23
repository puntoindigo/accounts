import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { deletePerson, getPerson, updatePerson, listPersons } from '@/lib/identity-store';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

const getAlwaysAllowedEmails = () => {
  const raw = process.env.ALWAYS_ALLOWED_EMAILS || process.env.OWNER_GOOGLE_EMAIL || '';
  return raw
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
};

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
    // Obtener la persona actual antes de actualizar
    const currentPerson = await getPerson(id);
    if (!currentPerson) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 });
    }

    // Validaciones de seguridad antes de deshabilitar
    if (updates.active === false) {
      const alwaysAllowed = getAlwaysAllowedEmails();
      const personEmail = currentPerson.email.toLowerCase();
      
      // 1. No permitir deshabilitar emails en ALWAYS_ALLOWED_EMAILS
      if (alwaysAllowed.includes(personEmail)) {
        return NextResponse.json({ 
          error: 'No se puede deshabilitar este usuario. Está en la lista de emails siempre permitidos (ALWAYS_ALLOWED_EMAILS). Esto es necesario para mantener acceso de administración.' 
        }, { status: 403 });
      }

      // 2. No permitir deshabilitar el usuario actual (el que está logueado)
      const session = await getServerSession(authOptions);
      if (session?.user?.email && session.user.email.toLowerCase() === personEmail) {
        return NextResponse.json({ 
          error: 'No podés deshabilitar tu propia cuenta. Esto te dejaría sin acceso al sistema.' 
        }, { status: 403 });
      }

      // 3. Verificar si es el último admin activo
      if (currentPerson.isAdmin) {
        const allPersons = await listPersons();
        const activeAdmins = allPersons.filter(p => p.isAdmin && p.active && p.id !== id);
        if (activeAdmins.length === 0) {
          return NextResponse.json({ 
            error: 'No se puede deshabilitar el último administrador activo. Necesitás al menos un administrador activo en el sistema.' 
          }, { status: 403 });
        }
      }
    }

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
