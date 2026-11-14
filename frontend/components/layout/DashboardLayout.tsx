'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { Bell, Search, Shield, ChevronRight, Home, HelpCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Sidebar Navigation */}
      <Sidebar currentRole={currentRole} onRoleChange={setCurrentRole} />

      {/* Main Workspace View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8">
          {/* Breadcrumbs or Title */}
          <div className="flex items-center space-x-2 pl-12 md:pl-0 text-xs text-[#627D98]">
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

          {/* Action Tools */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center relative">
              <Search className="w-4 h-4 text-[#829AB1] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dossiers, files, clauses..."
                className="pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#202938] placeholder-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#172B4D] focus:bg-white w-56 transition-all"
              />
            </div>

            <Link
              href="/dashboard/notifications"
              className="p-1.5 text-[#627D98] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C62828]" />
            </Link>

            <Link
              href="/dashboard/assistant"
              className="p-1.5 text-[#627D98] hover:text-[#172B4D] hover:bg-[#F0F4F8] rounded transition-colors"
              title="USCIS Guidelines & AI Assistant"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            <div className="h-6 w-px bg-[#E2E8F0]" />

            <div className="flex items-center space-x-2">
              <Badge variant="navy" size="sm">
                Live API 5001
              </Badge>
            </div>
          </div>
        </header>

        {/* Page Header (if title specified) */}
        {title && (
          <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
            <h1 className="text-xl font-bold text-[#172B4D] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs text-[#627D98]">{subtitle}</p>
            )}
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

