import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { signEmbedToken } from '@/lib/embed-token';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const secret = process.env.ACCOUNTS_EMBED_SECRET || '';
  if (!secret) {
    return NextResponse.json({ error: 'missing_secret' }, { status: 500 });
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    isAdmin: Boolean((session as any)?.isAdmin),
    iat: now,
    exp: now + 5 * 60
  };

  const token = signEmbedToken(payload, secret);
  return NextResponse.json({ token, user: payload });
}
