import { NextRequest, NextResponse } from 'next/server';
import { getPersonByEmail, listPersons } from '@/lib/identity-store';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';
import { recordActivityEvent } from '@/lib/identity-store';

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

// Obtener metadata de la request
async function getRequestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
  const city = request.headers.get('x-vercel-ip-city');
  const country = request.headers.get('x-vercel-ip-country');
  const userAgent = request.headers.get('user-agent');
  return { ip, city, country, userAgent };
}

// Autenticación por email (Google)
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
      await recordActivityEvent({
        personId: null,
        email,
        provider: 'crm',
        status: 'failed',
        reason: 'not_found',
        ...(await getRequestMeta(request))
      });
      return NextResponse.json({ authenticated: false, reason: 'not_found' }, { status: 404 });
    }

    if (!person.active) {
      await recordActivityEvent({
        personId: person.id,
        email,
        provider: 'crm',
        status: 'failed',
        reason: 'inactive',
        ...(await getRequestMeta(request))
      });
      return NextResponse.json({ authenticated: false, reason: 'inactive' }, { status: 403 });
    }

    await recordActivityEvent({
      personId: person.id,
      email,
      provider: 'crm',
      status: 'success',
      reason: null,
      ...(await getRequestMeta(request))
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: person.id,
        email: person.email,
        nombre: person.nombre,
        empresa: person.empresa,
        isAdmin: person.isAdmin,
        hasFaceRecognition: !!person.faceDescriptor,
        faceImageUrl: person.faceImageUrl
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error autenticando usuario' },
      { status: 500 }
    );
  }
}

// Autenticación por reconocimiento facial
export async function PUT(request: NextRequest) {
  if (!verifyCrmToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;

    if (!descriptor || descriptor.length === 0) {
      return NextResponse.json(
        { error: 'descriptor es requerido' },
        { status: 400 }
      );
    }

    const persons = await listPersons();
    const match = findEmployeeByFace(descriptor, persons);

    if (!match) {
      await recordActivityEvent({
        personId: null,
        email: null,
        provider: 'crm_face',
        status: 'failed',
        reason: 'no_match',
        ...(await getRequestMeta(request))
      });
      return NextResponse.json({ authenticated: false, reason: 'no_match' }, { status: 404 });
    }

    const person = persons.find(p => p.id === match.id);
    if (!person || !person.active) {
      await recordActivityEvent({
        personId: person?.id ?? null,
        email: person?.email ?? null,
        provider: 'crm_face',
        status: 'failed',
        reason: person ? 'inactive' : 'not_found',
        ...(await getRequestMeta(request))
      });
      return NextResponse.json(
        { authenticated: false, reason: person ? 'inactive' : 'not_found' },
        { status: person ? 403 : 404 }
      );
    }

    await recordActivityEvent({
      personId: person.id,
      email: person.email,
      provider: 'crm_face',
      status: 'success',
      reason: null,
      ...(await getRequestMeta(request))
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: person.id,
        email: person.email,
        nombre: person.nombre,
        empresa: person.empresa,
        isAdmin: person.isAdmin,
        hasFaceRecognition: true,
        faceImageUrl: person.faceImageUrl,
        confidence: match.confidence,
        distance: match.distance
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error autenticando por reconocimiento facial' },
      { status: 500 }
    );
  }
}
