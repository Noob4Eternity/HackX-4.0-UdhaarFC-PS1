import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    githubUsername?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    provider?: string;
    githubUsername?: string;
    avatarUrl?: string;
  }
}
