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
        branchId: { label: 'Branch ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await prisma.erpUser.findUnique({
          where: { email: credentials.email },
          include: { branch: true },
        });

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        const selectedBranchId = credentials.branchId || null;
        let finalBranchId = user.branchId;
        let branchName = user.branch?.name || null;

        if (user.role === 'admin') {
          finalBranchId = selectedBranchId;
          if (selectedBranchId) {
            const branch = await prisma.erpBranch.findUnique({ where: { id: selectedBranchId } });
            branchName = branch?.name || null;
          } else {
            branchName = 'All Branches';
          }
        } else {
          // Non-admin must have selected their assigned branch (or maybe the frontend didn't pass it properly)
          // If they passed a branch and it doesn't match, reject.
          if (selectedBranchId && selectedBranchId !== user.branchId) {
            throw new Error('You do not have access to this branch');
          }
          // Ensure they actually have a branch
          if (!user.branchId) {
             throw new Error('You are not assigned to any branch');
          }
          finalBranchId = user.branchId;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department || null,
          branchId: finalBranchId,
          branchName: branchName,
          permissions: user.permissions || null,
        };
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
        token.permissions = u.permissions || null;
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
        (session.user as any).permissions = token.permissions || null;
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
            changes: JSON.stringify({ method: 'credentials', timestamp: new Date().toISOString() }),
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
