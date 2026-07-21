import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[Auth] Authorize function called for email:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Authorize error: Missing email or password');
          throw new Error('Email and password required');
        }

        try {
          console.log('[Auth] Querying erpUser in database...');
          const user = await prisma.erpUser.findUnique({
            where: { email: credentials.email },
            include: { branch: true },
          });

          console.log('[Auth] DB lookup user found:', user ? { id: user.id, email: user.email, isActive: user.isActive } : 'null');

          if (!user || !user.isActive) {
            console.log('[Auth] Authorize warning: User not found or inactive');
            throw new Error('Invalid credentials');
          }

          console.log('[Auth] Comparing hashed passwords...');
          const isValid = await bcrypt.compare(credentials.password, user.password);
          console.log('[Auth] Hashed password compare result:', isValid);

          if (!isValid) {
            console.log('[Auth] Authorize warning: Invalid password');
            throw new Error('Invalid credentials');
          }

          console.log('[Auth] Authorize success for user:', user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department || null,
            branchId: user.branchId,
            branchName: user.branch?.name || null,
          };
        } catch (error) {
          console.error('[Auth] Unexpected error during authorize callback:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.department = u.department || null;
        token.branchId = u.branchId || null;
        token.branchName = u.branchName || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).department = token.department || null;
        (session.user as any).branchId = token.branchId || null;
        (session.user as any).branchName = token.branchName || null;
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message?.user) {
        try {
          const { logAudit } = await import('./audit');
          await logAudit({
            userId: message.user.email || message.user.id,
            userName: message.user.name || message.user.email || 'System',
            action: 'LOGIN',
            entityType: 'UserSession',
            entityId: message.user.id,
            changes: { method: 'credentials', timestamp: new Date().toISOString() },
          });
        } catch (err) {
          console.error('[Auth] Failed to write signIn audit log:', err);
        }
      }
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
