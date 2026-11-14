'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ShieldCheck, Scale } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-[#0F1B2D] transition-colors">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-[#172B4D] tracking-tight block leading-tight">
                Immigration Dossier Builder
              </span>
              <span className="text-[11px] text-[#627D98] tracking-normal font-normal block">
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

          {/* CTAs */}
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

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#486581] hover:text-[#172B4D] hover:bg-[#F0F4F8]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E8F0] bg-white px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#486581]">
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              How It Works
            </Link>
            <Link
              href="#visas"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              Supported Visas
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              Platform Capabilities
            </Link>
            <Link
              href="#attorney-review"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              Attorney Workspace
            </Link>
            <Link
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              Security
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#F0F4F8] hover:text-[#172B4D]"
            >
              FAQ
            </Link>
          </nav>
          <div className="pt-2 border-t border-[#F1F5F9] flex flex-col space-y-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-center">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard-preview" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full justify-center">
                Dashboard Preview
              </Button>
            </Link>
            <Link
              href="/dashboard/applications/create"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="primary" size="sm" className="w-full justify-center">
                Start Your Visa Dossier
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

