'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(
        error === 'access_denied'
          ? 'You denied access to your GitHub account.'
          : `Authentication error: ${error}`
      );
      return;
    }

    // NextAuth handles the code exchange automatically via /api/auth/callback/github.
    // If we land here, the session is already established.
    setStatus('success');
    setTimeout(() => {
      router.push('/scan');
    }, 1500);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center animated-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto"
      >
        {status === 'loading' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-flex mb-6"
            >
              <Loader2 className="h-12 w-12 text-primary" />
            </motion.div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authenticating with GitHub...
            </h2>
            <p className="text-muted-foreground">Please wait while we verify your identity.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex mb-6"
            >
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </motion.div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Successful!
            </h2>
            <p className="text-muted-foreground">Redirecting to scanner...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Failed
            </h2>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push('/login')}
              className="text-primary hover:underline"
            >
              &larr; Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center animated-bg">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
