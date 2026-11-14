'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ShieldCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-[#0F1B2D] transition-colors shrink-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="truncate">
              <span className="font-bold text-sm sm:text-base text-[#172B4D] tracking-tight block leading-tight truncate">
                Immigration Dossier Builder
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#627D98] tracking-normal font-normal block truncate">
                Employment-Based Visa Preparation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-[#486581]">
            <Link
              href="#how-it-works"
              className="hover:text-[#172B4D] transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#visas"
              className="hover:text-[#172B4D] transition-colors"
            >
              Supported Visas
            </Link>
            <Link
              href="#features"
              className="hover:text-[#172B4D] transition-colors"
            >
              Platform Capabilities
            </Link>
            <Link
              href="#attorney-review"
              className="hover:text-[#172B4D] transition-colors"
            >
              Attorney Workspace
            </Link>
            <Link
              href="#security"
              className="hover:text-[#172B4D] transition-colors"
            >
              Security
            </Link>
            <Link
              href="#faq"
              className="hover:text-[#172B4D] transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard-preview">
              <Button variant="outline" size="sm" className="text-xs">
                Dashboard Preview
              </Button>
            </Link>
            <Link href="/dashboard/applications/create">
              <Button variant="primary" size="sm" className="space-x-1.5 text-xs">
                <span>Start Your Visa Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Header Actions: Prominent Sign In + Hamburger Menu Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs px-2.5 py-1 min-h-[36px] font-semibold border-slate-300 text-[#172B4D]">
                Sign In
              </Button>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-[#172B4D]" />
              ) : (
                <Menu className="w-6 h-6 text-[#172B4D]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Smooth Overlay & Slide Down) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 flex flex-col bg-white">
          <div
            className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs -z-10"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-white shadow-xl border-b border-[#E2E8F0]">
            <nav className="flex flex-col space-y-1 text-sm font-medium text-[#486581]">
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                How It Works
              </Link>
              <Link
                href="#visas"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                Supported Visas
              </Link>
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                Platform Capabilities
              </Link>
              <Link
                href="#attorney-review"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                Attorney Workspace
              </Link>
              <Link
                href="#security"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                Security & Compliance
              </Link>
              <Link
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-md hover:bg-[#F0F4F8] hover:text-[#172B4D] min-h-[44px] flex items-center font-semibold"
              >
                FAQ
              </Link>
            </nav>

            <div className="pt-4 border-t border-[#F1F5F9] flex flex-col space-y-2.5">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="md" className="w-full justify-center min-h-[44px] font-semibold text-[#172B4D] border border-slate-200">
                  Sign In to Workspace
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="md" className="w-full justify-center min-h-[44px] font-semibold bg-[#172B4D] text-white">
                  Create New Account
                </Button>
              </Link>
              <Link href="/dashboard-preview" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" className="w-full justify-center min-h-[44px] font-medium text-slate-600">
                  Dashboard Preview
                </Button>
              </Link>
              <Link
                href="/dashboard/applications/create"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="primary" size="md" className="w-full justify-center min-h-[44px] font-bold bg-[#2E7D32] hover:bg-[#205b23] text-white space-x-1.5">
                  <span>Start Your Visa Dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

