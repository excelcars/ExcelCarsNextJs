import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Credentials providers require JWT sessions. Keep them short-lived; the
  // server-side authVersion check in auth.ts handles revocation.
  session: { strategy: "jwt", maxAge: 10 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [],
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
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
        session.user.roleName = token.roleName as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
