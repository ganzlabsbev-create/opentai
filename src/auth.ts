import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * GitHub Login for the app's own users (not to be confused with the
 * Pollinations shared-token setup, or Puter's separate client-side sign-in —
 * see ai/meson/providers/pollinations-chat.ts and features/puter/).
 *
 * Standard OAuth Authorization Code flow via Auth.js: the developer creates
 * one GitHub OAuth App (github.com/settings/developers), once, and sets
 * AUTH_GITHUB_ID / AUTH_GITHUB_SECRET / AUTH_SECRET / AUTH_URL on Vercel —
 * see .env.example. End users never create a token themselves; they just
 * click "Authorize" on GitHub's own confirmation page.
 *
 * Session strategy is JWT (no database) — the session just needs to carry
 * the GitHub user id so ai/meson/key-resolution.ts can pick the 25/day
 * quota scope instead of the 15/day IP-scoped one for anonymous visitors.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    /** Runs on sign-in (and every subsequent request) — `profile` is only present on the initial sign-in call, so that's when we stash the GitHub numeric user id into the token. */
    async jwt({ token, profile }) {
      if (profile && typeof profile.id !== "undefined" && profile.id !== null) {
        token.githubId = String(profile.id);
      }
      return token;
    },
    /** Surfaces `githubId` on `session.user` so server code can call `auth()` and read it directly (see key-resolution.ts) without touching the raw JWT. */
    async session({ session, token }) {
      if (token.githubId && session.user) {
        session.user.githubId = token.githubId as string;
      }
      return session;
    },
  },
});
