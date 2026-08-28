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
        };
      },
    }),
  ],
});
