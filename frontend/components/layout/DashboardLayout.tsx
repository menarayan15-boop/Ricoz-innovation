'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { Bell, Search, Shield, ChevronRight, Home, HelpCircle, Menu, Scale } from 'lucide-react';
import { UserRole } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs = [],
}) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('applicant');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />

      {/* Main Workspace View */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Left section: Mobile Hamburger + Logo OR Desktop Breadcrumbs */}
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-md bg-[#172B4D] text-white hover:bg-[#0F1B2D] focus:outline-none focus:ring-2 focus:ring-[#426B91] min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors shadow-xs"
              aria-label="Open workspace navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Compact Brand Header */}
            <Link href="/dashboard" className="flex md:hidden items-center space-x-2">
              <div className="w-7 h-7 rounded bg-[#172B4D] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-[#172B4D] tracking-tight truncate max-w-[150px] sm:max-w-none">
                Immigration Dossier
              </span>
            </Link>

            {/* Desktop Breadcrumbs */}
            <div className="hidden md:flex items-center space-x-2 text-xs text-[#627D98]">
              <Link
                href="/dashboard"
                className="flex items-center hover:text-[#172B4D] transition-colors"
              >
                <Home className="w-3.5 h-3.5 mr-1" />
                <span>Workspace</span>
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3 h-3 text-[#CBD5E1]" />
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-[#172B4D] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#172B4D]">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-[#829AB1] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dossiers, files, clauses..."
                className="pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#202938] placeholder-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#172B4D] focus:bg-white w-48 lg:w-56 transition-all"
              />
            </div>

            <Link
              href="/dashboard/notifications"
              className="p-2 text-[#627D98] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded-md relative transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C62828]" />
            </Link>

            <Link
              href="/dashboard/assistant"
              className="p-2 text-[#627D98] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded-md transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="USCIS Guidelines & AI Assistant"
              aria-label="AI Assistant"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            <div className="h-5 w-px bg-[#E2E8F0]" />

            <div className="flex items-center">
              <Badge variant="navy" size="sm" className="hidden sm:inline-flex">
                Live API
              </Badge>
              <span className="sm:hidden w-2.5 h-2.5 rounded-full bg-emerald-500" title="Live API active" />
            </div>
          </div>
        </header>

        {/* Page Header (if title specified) */}
        {title && (
          <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-4 sm:py-5">
            <h1 className="text-lg sm:text-xl font-bold text-[#172B4D] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 sm:mt-1 text-xs text-[#627D98]">{subtitle}</p>
            )}
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

