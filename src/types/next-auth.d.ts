import type { DefaultSession } from "next-auth";

/**
 * Adds `githubId` to the session/JWT shapes Auth.js ships by default. Set in
 * the `jwt`/`session` callbacks in src/auth.ts; read in
 * ai/meson/key-resolution.ts to pick the GitHub-scoped (25/day) quota
 * instead of the anonymous IP-scoped (15/day) one.
 */
declare module "next-auth" {
  interface Session {
    user: {
      /** GitHub numeric user id (stringified), present only when signed in via GitHub. */
      githubId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
  }
}
