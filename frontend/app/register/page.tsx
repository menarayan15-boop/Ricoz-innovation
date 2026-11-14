'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale, Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserRole } from '@/types';
import { apiClient } from '@/services/apiClient';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || '/dashboard/applications/create';

  const initialEmail = searchParams?.get('email') || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('applicant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });

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
        setError('Database connection error: Unable to reach MongoDB Atlas. Please try again shortly.');
      } else if (apiErr.statusCode === 0) {
        setError('Network error: Unable to reach backend server. Please verify the API gateway connection.');
      } else if (apiErr.message) {
        setError(apiErr.message);
      } else {
        setError('Failed to create account. Please check your details.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
              <CardTitle>Create Your Account</CardTitle>
              <Badge variant="navy" size="sm">Phase 2 Gate</Badge>
            </div>
            <CardDescription>
              Set up your profile to start preparing attorney-ready visa dossiers.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {error && (
              <div className="p-3 bg-[#FFF5F5] border border-[#FFCDD2] rounded text-xs text-[#C62828] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Full Legal Name <span className="text-[#C62828]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#829AB1] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Siddharth Rao"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-sm bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-2 focus:ring-[#172B4D] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Work or Legal Email <span className="text-[#C62828]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#829AB1] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-sm bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-2 focus:ring-[#172B4D] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Account Role <span className="text-[#C62828]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'applicant' as UserRole, label: 'Applicant' },
                    { id: 'employer' as UserRole, label: 'Employer' },
                    { id: 'attorney' as UserRole, label: 'Attorney' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2.5 px-2 rounded-md border text-center font-semibold transition-colors cursor-pointer min-h-[44px] flex items-center justify-center ${
                        role === r.id
                          ? 'bg-[#172B4D] text-white border-[#172B4D] shadow-xs'
                          : 'bg-white text-[#486581] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B4D]">
                  Password <span className="text-[#C62828]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#829AB1] absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-11 py-2.5 min-h-[44px] text-sm bg-white border border-[#CBD5E1] rounded-md text-[#202938] focus:outline-none focus:ring-2 focus:ring-[#172B4D] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 p-1 text-[#829AB1] hover:text-[#172B4D] focus:outline-none min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-[#627D98] block leading-tight pt-0.5">
                  Must be at least 8 characters with uppercase, lowercase &amp; number.
                </span>
              </div>

              <Button
                type="submit"
                size="md"
                className="w-full justify-center space-x-1.5 mt-2 min-h-[44px] text-sm font-semibold"
                isLoading={isLoading}
              >
                <span>Register &amp; Proceed to Dossier Setup</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-[#627D98]">
            <div>
              Already have an account?{' '}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
                className="font-semibold text-[#172B4D] hover:underline"
              >
                Sign in here
              </Link>
            </div>
            <div>
              <Link href="/dashboard-preview" className="text-[#426B91] hover:underline">
                Explore Public Demo without registering
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">Loading...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}

