import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthConfig, updateAuthConfig } from '@/lib/identity-store';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const config = await getAuthConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const config = await updateAuthConfig({
    allowedGoogleEmails: Array.isArray(body?.allowedGoogleEmails) ? body.allowedGoogleEmails : [],
    allowedFaceLegajos: Array.isArray(body?.allowedFaceLegajos) ? body.allowedFaceLegajos : [],
    allowedFaceEmployeeIds: Array.isArray(body?.allowedFaceEmployeeIds) ? body.allowedFaceEmployeeIds : []
  });

  return NextResponse.json({ config });
}
