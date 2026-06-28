import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, users, accounts, sessions, verificationTokens } from "@seichi/db";
import { eq } from "drizzle-orm";
import { isDevCredentialsEnabled } from "./dev-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.DISCORD_CLIENT_ID
      ? [
          Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "開發用登入",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "名稱", type: "text" },
      },
      async authorize(credentials) {
        if (!isDevCredentialsEnabled()) return null;
        const email = credentials?.email as string;
        const name = (credentials?.name as string) || "測試使用者";
        if (!email) return null;

        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing) {
          return { id: existing.id, email: existing.email, name: existing.name };
        }

        const [created] = await db
          .insert(users)
          .values({ email, name, username: email.split("@")[0] })
          .returning();

        return { id: created.id, email: created.email, name: created.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
