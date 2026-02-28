'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Github, Mail, Lock, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/vibecheck/logo';
import { useAuth } from '@/lib/auth-context';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const { login, loginWithGithub } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Welcome back!');
        router.push('/scan');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setIsGithubLoading(true);
    try {
      // Trigger real GitHub OAuth via NextAuth — this performs a full redirect
      await signIn('github', { callbackUrl: '/scan' });
    } catch {
      toast.error('GitHub login failed. Please try again.');
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="glass-card rounded-2xl p-8 glow-cyan">
          {/* Logo and Header */}
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" />
            <p className="text-muted-foreground mt-2 text-center">
              AI-powered vulnerability intelligence for your codebase
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-semibold transition-all duration-300 group"
            >
              {isLoading ? (
                <motion.div
                  className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* GitHub Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGithubLogin}
            disabled={isGithubLoading}
            className="w-full h-12 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
          >
            {isGithubLoading ? (
              <motion.div
                className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Github className="mr-2 h-5 w-5" />
                Sign in with GitHub
              </>
            )}
          </Button>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Enterprise-grade security. SOC 2 Type II compliant.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
