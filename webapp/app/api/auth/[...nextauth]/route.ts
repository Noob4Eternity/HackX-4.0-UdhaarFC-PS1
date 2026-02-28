import NextAuth, { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'repo read:user user:email',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access_token and user info in the JWT
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      if (profile) {
        token.githubUsername = (profile as Record<string, unknown>).login as string;
        token.avatarUrl = (profile as Record<string, unknown>).avatar_url as string;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose accessToken and GitHub info to the client session
      session.accessToken = token.accessToken as string;
      session.githubUsername = token.githubUsername as string;
      if (session.user) {
        session.user.image = token.avatarUrl as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  theme: {
    colorScheme: 'dark',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
