import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username?: string;
    roleName?: string | null;
    authVersion?: number;
  }

  interface Session {
    user: {
      username: string;
      roleName: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    roleName?: string | null;
    authVersion?: number;
  }
}
