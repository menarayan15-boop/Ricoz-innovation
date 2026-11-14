'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FilePlus2,
  FileText,
  Bot,
  Briefcase,
  Bell,
  Settings,
  Scale,
  LogOut,
  ChevronRight,
  Shield,
  ShieldCheck,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/services/apiClient';

interface SidebarProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole = 'applicant',
  onRoleChange,
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(currentRole);
  const [userName, setUserName] = useState<string>('Alex Morgan');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dossier_user_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.role) {
            setRole(parsed.role);
            if (onRoleChange) onRoleChange(parsed.role);
          }
        } catch {
          // ignore
        }
      }

      // Synchronize authenticated profile with real backend session
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient
          .getProfile()
          .then((res) => {
            if (res.success && res.user) {
              setUserName(res.user.name);
              setUserEmail(res.user.email);
              setRole(res.user.role);
              if (onRoleChange) onRoleChange(res.user.role);
              localStorage.setItem('dossier_user_session', JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // Keep local state on temporary network issue
          });
      }
    }
  }, [onRoleChange]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('dossier_user_session');
    }
    window.location.href = '/login';
  };

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    if (onRoleChange) onRoleChange(newRole);
  };

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
    },
    {
      label: 'My Applications',
      href: '/dashboard/applications',
      icon: FolderKanban,
      roles: ['applicant', 'employer'],
    },
    {
      label: 'Create Application',
      href: '/dashboard/applications/create',
      icon: FilePlus2,
      roles: ['applicant', 'employer'],
    },
    {
      label: 'Attorney Workspace',
      href: '/dashboard/attorney',
      icon: Scale,
      roles: ['attorney', 'admin'],
      badge: 'Casework',
    },
    {
      label: 'Documents',
      href: '/dashboard/documents',
      icon: FileText,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
    },
    {
      label: 'Evidence Intelligence',
      href: '/dashboard/evidence',
      icon: ShieldCheck,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
      badge: 'Phase 7',
    },
    {
      label: 'AI Assistant',
      href: '/dashboard/assistant',
      icon: Bot,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
    },
    {
      label: 'Dossier Builder',
      href: '/dashboard/dossier',
      icon: Briefcase,
      roles: ['applicant', 'attorney'],
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
      badge: '3',
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['applicant', 'attorney', 'employer', 'admin'],
    },
  ];

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#172B4D] text-white select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#243B53] justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded bg-[#426B91] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white block">
              Immigration Dossier
            </span>
            <span className="text-[10px] text-[#9FB3C8] block leading-none">
              LegalTech Suite
            </span>
          </div>
        </Link>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-[#9FB3C8] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Switcher (Preview Control) */}
      <div className="px-4 py-3 bg-[#0F1B2D] border-b border-[#243B53]">
        <div className="flex items-center justify-between text-[11px] text-[#9FB3C8] mb-1.5 font-medium">
          <span className="flex items-center">
            <Shield className="w-3 h-3 mr-1 text-[#426B91]" />
            Active Role View
          </span>
          <span className="uppercase text-[10px] tracking-wider text-[#BCCCDC]">
            {role}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {(['applicant', 'attorney', 'employer', 'admin'] as UserRole[]).map(
            (r) => (
              <button
                key={r}
                onClick={() => handleRoleSelect(r)}
                className={cn(
                  'px-2 py-1 rounded text-left text-[11px] font-medium transition-colors capitalize',
                  role === r
                    ? 'bg-[#426B91] text-white shadow-xs font-semibold'
                    : 'text-[#9FB3C8] hover:bg-[#243B53] hover:text-white'
                )}
              >
                {r === 'attorney' ? 'Attorney' : r}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] uppercase tracking-wider font-semibold text-[#829AB1]">
          Workspace Menu
        </div>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-[#243B53] text-white border-l-3 border-[#426B91] pl-2.5'
                  : 'text-[#BCCCDC] hover:bg-[#243B53]/60 hover:text-white'
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-[#829AB1]')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded text-[10px] font-semibold',
                    item.badge === 'Casework'
                      ? 'bg-[#B78103] text-white'
                      : 'bg-[#426B91] text-white'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#243B53] bg-[#0F1B2D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#426B91] flex items-center justify-center font-bold text-xs text-white shrink-0">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'IV'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-[10px] text-[#9FB3C8] truncate capitalize">
                {userEmail || `${role} Workspace`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-[#9FB3C8] hover:text-white hover:bg-[#243B53] rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Trigger Button */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md bg-[#172B4D] text-white shadow-md focus:outline-none focus:ring-2 focus:ring-[#426B91]"
          aria-label="Open workspace menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#172B4D]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

