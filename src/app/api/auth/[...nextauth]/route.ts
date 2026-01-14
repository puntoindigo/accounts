import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { listEmployees } from '@/lib/identity-store';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';
import { recordLoginEvent } from '@/lib/identity-store';

const allowedGoogleEmails = (process.env.ALLOWED_GOOGLE_EMAILS || process.env.OWNER_GOOGLE_EMAIL || '')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean);

const allowedFaceIds = (process.env.ALLOWED_FACE_EMPLOYEE_IDS || process.env.OWNER_EMPLOYEE_ID || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const allowedFaceLegajos = (process.env.ALLOWED_FACE_LEGAJOS || process.env.OWNER_LEGAJO || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const handler = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
    CredentialsProvider({
      id: 'face',
      name: 'Face Recognition',
      credentials: {
        descriptor: { label: 'descriptor', type: 'text' }
      },
      async authorize(credentials) {
        const raw = credentials?.descriptor;
        if (!raw) return null;

        let descriptor: number[] | null = null;
        try {
          descriptor = JSON.parse(raw) as number[];
        } catch {
          return null;
        }

        if (!Array.isArray(descriptor) || descriptor.length === 0) {
          return null;
        }

        const employees = await listEmployees();
        const match = findEmployeeByFace(descriptor, employees);
        if (!match) return null;

        if (allowedFaceIds.length > 0 && !allowedFaceIds.includes(match.id)) {
          return null;
        }
        if (allowedFaceLegajos.length > 0 && !allowedFaceLegajos.includes(match.legajo)) {
          return null;
        }

        return {
          id: match.id,
          name: match.nombre,
          email: null,
          image: null,
          legajo: match.legajo,
          empresa: match.empresa,
          provider: 'face'
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase() || '';
        if (allowedGoogleEmails.length > 0 && !allowedGoogleEmails.includes(email)) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
        token.provider = account?.provider;
        token.legajo = (user as any).legajo;
        token.empresa = (user as any).empresa;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        name: token.name as string | undefined,
        email: token.email as string | undefined
      };
      (session as any).provider = token.provider;
      (session as any).legajo = token.legajo;
      (session as any).empresa = token.empresa;
      return session;
    }
  },
  events: {
    async signIn({ user, account }) {
      await recordLoginEvent({
        provider: account?.provider || 'unknown',
        userId: user.id || user.email || 'unknown',
        name: user.name || 'Sin nombre',
        email: user.email ?? null
      });
    }
  }
});

export { handler as GET, handler as POST };
