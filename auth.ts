import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
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
          name: user.displayName || user.userName,
          username: user.userName,
          roleName: user.roleName,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.username = user.username;
        token.roleName = user.roleName;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.username = token.username as string;
        session.user.roleName = token.roleName as string | null;
      }
      return session;
    },
  },
});
