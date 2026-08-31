import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signOut(message) {
      if (!('token' in message)) return
      const userId = Number(message.token?.sub)
      if (!Number.isInteger(userId) || userId <= 0) return

      await prisma.userTable.update({
        where: { userId },
        data: { lastLogoutTime: new Date() },
      }).catch(() => {
        // Sign-out should still complete even if the audit timestamp update fails.
      })
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
          return null;
        }

        const user = await prisma.userTable.findFirst({
          where: { userName: username },
        });

        if (!user || !user.passwordHash) return null;
        if (user.status !== "Active") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.userTable.update({
          where: { userId: user.userId },
          data: { lastLoginTime: new Date() },
        });

        return {
          id: String(user.userId),
          name: user.displayName || user.userName || undefined,
          username: user.userName || undefined,
          roleName: user.roleName ?? null,
          authVersion: user.authVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.roleName = user.roleName;
        token.authVersion = user.authVersion;
      }

      const userId = Number(token.sub);
      if (!Number.isInteger(userId) || userId <= 0) return null;

      // JWTs are not trusted for account state. This centralized check makes
      // status changes and authVersion bumps revoke every device.
      const currentUser = await prisma.userTable.findUnique({
        where: { userId },
        select: { status: true, authVersion: true },
      });

      if (!currentUser || currentUser.status !== "Active" || currentUser.authVersion !== token.authVersion) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.username = token.username as string;
      session.user.roleName = token.roleName as string | null;
      return session;
    },
  },
});
