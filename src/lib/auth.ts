import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { listEmployees, recordLoginEvent, getAuthConfig } from '@/lib/identity-store';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';

const parseList = (value: string | undefined, normalize?: (v: string) => string) =>
  (value || '')
    .split(',')
    .map(item => (normalize ? normalize(item) : item).trim())
    .filter(Boolean);

const getAllowedLists = async () => {
  const config = await getAuthConfig();
  const envGoogle = parseList(process.env.ALLOWED_GOOGLE_EMAILS || process.env.OWNER_GOOGLE_EMAIL, value => value.toLowerCase());
  const envFaceIds = parseList(process.env.ALLOWED_FACE_EMPLOYEE_IDS || process.env.OWNER_EMPLOYEE_ID);
  const envFaceLegajos = parseList(process.env.ALLOWED_FACE_LEGAJOS || process.env.OWNER_LEGAJO);

  const allowedGoogleEmails = Array.from(new Set([...envGoogle, ...config.allowedGoogleEmails]));
  const allowedFaceEmployeeIds = Array.from(new Set([...envFaceIds, ...config.allowedFaceEmployeeIds]));
  const allowedFaceLegajos = Array.from(new Set([...envFaceLegajos, ...config.allowedFaceLegajos]));

  return { allowedGoogleEmails, allowedFaceEmployeeIds, allowedFaceLegajos };
};

export const authOptions: NextAuthOptions = {
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

        const { allowedFaceEmployeeIds, allowedFaceLegajos } = await getAllowedLists();
        if (allowedFaceEmployeeIds.length > 0 && !allowedFaceEmployeeIds.includes(match.id)) {
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
        const { allowedGoogleEmails } = await getAllowedLists();
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
};
