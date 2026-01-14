import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { listPersons, recordLoginEvent, getPersonByEmail } from '@/lib/identity-store';
import { findEmployeeByFace } from '@/lib/biometric/face-matcher';

const normalizeEmail = (value: string | null | undefined) => (value || '').trim().toLowerCase();

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    error: '/'
  },
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

        const persons = await listPersons();
        const match = findEmployeeByFace(descriptor, persons);
        if (!match) return null;

        const person = persons.find(item => item.id === match.id);
        if (!person || !person.active) return null;

        return {
          id: match.id,
          name: match.nombre,
          email: match.email || null,
          image: null,
          empresa: match.empresa,
          isAdmin: person.isAdmin,
          provider: 'face'
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = normalizeEmail(user.email);
        const persons = await listPersons();
        if (persons.length === 0) {
          return true;
        }
        const person = persons.find(item => item.email.toLowerCase() === email);
        if (!person || !person.active) {
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
        token.empresa = (user as any).empresa;
        token.isAdmin = (user as any).isAdmin;
      }
      if (token.email && token.provider === 'google') {
        const person = await getPersonByEmail(String(token.email));
        if (person) {
          token.personId = person.id;
          token.empresa = person.empresa;
          token.isAdmin = person.isAdmin;
        }
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
      (session as any).empresa = token.empresa;
      (session as any).isAdmin = token.isAdmin;
      (session as any).personId = token.personId;
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
