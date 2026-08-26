import { handlers } from "@/auth";

/** Standard Auth.js route handler — handles /api/auth/signin, /callback/github, /session, /signout, etc. */
export const { GET, POST } = handlers;
