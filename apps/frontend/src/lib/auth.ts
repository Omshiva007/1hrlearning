import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { loginSchema } from '@1hrlearning/shared';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';
const refreshRequests = new Map<string, Promise<Record<string, unknown>>>();

function tokenExpiry(accessToken: string): number {
  try {
    // This timestamp only schedules refresh; backend signature verification remains the authorization boundary.
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1]!, 'base64url').toString()) as { exp?: number };
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

async function performBackendRefresh(token: Record<string, unknown>) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!response.ok) throw new Error('Refresh failed');
    const { data } = await response.json();
    return {
      ...token,
      accessToken: data.accessToken as string,
      refreshToken: (data.refreshToken ?? token.refreshToken) as string,
      accessTokenExpires: tokenExpiry(data.accessToken as string),
      authError: undefined,
    };
  } catch {
    // Remove the unusable access credential so the session cannot appear authenticated after refresh failure.
    return {
      ...token,
      accessToken: undefined,
      authError: 'RefreshAccessTokenError',
    };
  }
}

async function refreshBackendToken(token: Record<string, unknown>) {
  const refreshToken = String(token.refreshToken ?? '');
  if (!refreshToken) return { ...token, accessToken: undefined, authError: 'RefreshAccessTokenError' };

  // Auth.js may evaluate the same encrypted session concurrently; share one rotation request so
  // a second callback cannot replay the just-consumed refresh token and invalidate the browser.
  const pending = refreshRequests.get(refreshToken);
  if (pending) return pending;
  const request = performBackendRefresh(token).finally(() => refreshRequests.delete(refreshToken));
  refreshRequests.set(refreshToken, request);
  return request;
}
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials before forwarding them across the server-to-server trust boundary.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });

          if (!res.ok) return null;

          const { data } = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.displayName,
            image: data.user.avatarUrl,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            username: data.user.username,
            role: data.user.role,
          };
        } catch {
          return null;
        }
      },
    }),
    // Only register OAuth providers whose credentials are actually configured.
    ...(process.env.GOOGLE_CLIENT_ID
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    ...(process.env.GITHUB_CLIENT_ID
      ? [GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as Record<string, unknown>).accessToken as string;
        token.refreshToken = (user as Record<string, unknown>).refreshToken as string;
        token.username = (user as Record<string, unknown>).username as string;
        token.role = (user as Record<string, unknown>).role as string;
        token.accessTokenExpires = tokenExpiry(token.accessToken);
        token.sub = user.id ?? token.sub;
      }
      // Refresh slightly early to avoid an access token expiring during an in-flight request.
      if (token.accessToken && Date.now() < ((token.accessTokenExpires as number) - 30_000)) {
        return token;
      }
      return refreshBackendToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.username = token.username as string;
      session.user.role = token.role as string;
      session.user.id = token.sub ?? '';
      session.authError = token.authError as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
