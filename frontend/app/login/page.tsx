'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, Lock, Mail, ArrowRight, AlertCircle, Eye, KeyRound, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/services/apiClient';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Password Reset Modal State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleOpenReset = (initialEmail?: string) => {
    setResetEmail(initialEmail || email || '');
    setResetStep(1);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError(null);
    setResetSuccess(null);
    setIsResetOpen(true);
  };

  const handleRequestResetToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      const res = await apiClient.forgotPassword(resetEmail.trim());
      setResetSuccess(res.message);
      // If dev token returned in development mode, automatically advance and set it
      if ((res as any).devResetToken) {
        setResetToken((res as any).devResetToken);
        setResetStep(2);
      } else {
        setResetStep(2);
      }
    } catch (err: any) {
      setResetError(err.message || 'Unable to request password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setResetError('Password reset token is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setResetError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      const res = await apiClient.resetPassword(resetToken.trim(), newPassword);
      setSuccessNotice('Password successfully updated! You can now log in with your new password.');
      setEmail(resetEmail);
      setPassword('');
      setIsResetOpen(false);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password. The token may be expired.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const data = await apiClient.login({ email: email.trim(), password });
      if (typeof window !== 'undefined') {
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        if (data.user) {
          localStorage.setItem('dossier_user_session', JSON.stringify(data.user));
        }
      }
      setIsLoading(false);
      router.push(redirectTarget);
    } catch (err: unknown) {
      setIsLoading(false);
      const apiErr = err as { statusCode?: number; message?: string };
      if (apiErr.statusCode === 503) {
        setError('Database service unavailable: The backend cannot reach MongoDB Atlas. Please try again shortly.');
      } else if (apiErr.statusCode === 0) {
        setError('Network error: Unable to reach backend server. Please check your internet connection or verify the API service.');
      } else if (apiErr.message) {
        setError(apiErr.message);
      } else {
        setError('Invalid email address or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <Link href="/landing" className="flex items-center justify-center space-x-3 mb-6 group">
          <div className="w-10 h-10 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-[#0F1B2D] transition-colors">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-[#172B4D] block tracking-tight">
              Immigration Dossier Builder
            </span>
            <span className="text-xs text-[#627D98] block">
              Enterprise LegalTech Application
            </span>
          </div>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sign In to Workspace</CardTitle>
              <Badge variant="navy" size="sm">Secure Gateway</Badge>
            </div>
            <CardDescription>
              {redirectTarget !== '/dashboard'
                ? 'Sign in to proceed to your destination.'
                : 'Access your immigration dossier and collaborative case files.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {successNotice && (
              <div className="p-3 bg-[#EBF5F0] border border-[#C6E3D3] rounded text-xs text-[#2D6A4F] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2D6A4F]" />
                <span className="font-medium">{successNotice}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-[#FFF5F5] border border-[#FFCDD2] rounded text-xs text-[#C62828] space-y-1">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                {error.includes('No account found') && (
                  <div className="pl-6 pt-1">
                    <Link
                      href={`/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTarget)}`}
                      className="underline font-semibold text-[#172B4D] hover:text-[#0F1B2D]"
                    >
                      Click here to create your account now →
                    </Link>
                  </div>
                )}
                {(error.includes('Incorrect password') || error.includes('Invalid email address or password')) && (
                  <div className="pl-6 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenReset(email)}
                      className="underline font-semibold text-[#172B4D] hover:text-[#0F1B2D] cursor-pointer"
                    >
                      Forgot your password? Click here to reset it now →
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Work or Legal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#829AB1] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-[#172B4D]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenReset(email)}
                    className="text-[11px] text-[#426B91] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#829AB1] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="md"
                className="w-full justify-center space-x-1.5 mt-2"
                isLoading={isLoading}
              >
                <span>Sign In to Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Public Demo Preview Mode — Completely Isolated from Real Authentication */}
            <div className="pt-3 border-t border-[#F1F5F9]">
              <div className="p-3 bg-[#F0F4F8] border border-[#D9E2EC] rounded-md">
                <div className="flex items-center space-x-2 text-[#172B4D] font-semibold text-xs mb-1">
                  <Eye className="w-3.5 h-3.5 text-[#426B91]" />
                  <span>Public Demo Preview (Read-Only)</span>
                </div>
                <p className="text-[11px] text-[#627D98] mb-2 leading-relaxed">
                  Want to explore the platform interface without signing in? View our read-only dashboard preview with sample data. Demo mode never accesses private applicant files.
                </p>
                <Link
                  href="/dashboard-preview"
                  className="inline-flex items-center text-xs font-semibold text-[#172B4D] hover:text-[#0F1B2D] hover:underline"
                >
                  <span>Open Public Dashboard Preview</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-[#627D98]">
            <div>
              Don&apos;t have an account?{' '}
              <Link
                href={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
                className="font-semibold text-[#172B4D] hover:underline"
              >
                Register here
              </Link>
            </div>
            <div>
              <Link href="/landing" className="text-[#426B91] hover:underline">
                Back to Landing Page
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
      {/* Password Reset Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 bg-[#091E42]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-[#CBD5E1] w-full max-w-md overflow-hidden">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-[#172B4D]" />
                <span className="text-sm font-bold text-[#172B4D]">
                  {resetStep === 1 ? 'Reset Workspace Password' : 'Set New Secure Password'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="text-[#829AB1] hover:text-[#172B4D] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-[#FFF5F5] border border-[#FFCDD2] rounded text-xs text-[#C62828] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestResetToken} className="space-y-4">
                  <p className="text-xs text-[#627D98] leading-relaxed">
                    Enter your registered account email. A secure verification reset token will be generated to authorize your new password.
                  </p>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#172B4D]">
                      Account Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsResetOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      isLoading={resetLoading}
                    >
                      Generate Reset Token
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleExecuteReset} className="space-y-4">
                  {resetSuccess && (
                    <div className="p-3 bg-[#EBF5F0] border border-[#C6E3D3] rounded text-xs text-[#2D6A4F] flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{resetSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#172B4D]">
                      Reset Authorization Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste 64-character reset token"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#172B4D]">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 chars with upper, lower & number"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#172B4D]">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-1 focus:ring-[#172B4D]"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-xs text-[#426B91] hover:underline"
                    >
                      ← Back to Email
                    </button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsResetOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        isLoading={resetLoading}
                      >
                        Confirm New Password
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}

