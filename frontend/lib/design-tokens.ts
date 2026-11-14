/**
 * Centralized Design Tokens for Immigration & Work Visa Dossier Builder
 * Phase 2 Design System — Enterprise LegalTech SaaS Architecture
 */

export const colors = {
  // Brand Palette (Enterprise Navy & Muted Blue)
  primaryNavy: '#1E2B4A',
  deepNavy: '#17243E',
  mutedBlue: '#526D94',

  // Surfaces & Backgrounds
  primaryBg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  surfaceHover: '#F1F5F9',

  // Typography & Text Content
  textPrimary: '#202938',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',

  // Semantic Status: Success (Restrained Emerald)
  success: '#39805B',
  successBg: '#EBF5F0',
  successBorder: '#C6E3D3',

  // Semantic Status: Warning (Restrained Amber)
  warning: '#C58A36',
  warningBg: '#FDF8EC',
  warningBorder: '#F4DEB2',

  // Semantic Status: Error (Restrained Crimson)
  error: '#C74C4C',
  errorBg: '#FDF2F2',
  errorBorder: '#F7C5C5',

  // Semantic Status: Info / Informational
  info: '#2A6F97',
  infoBg: '#EDF6FA',
  infoBorder: '#BDE0FE',
} as const;

export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  pageTitle: 'text-2xl sm:text-3xl font-bold tracking-tight text-[#202938]',
  sectionHeading: 'text-lg sm:text-xl font-semibold text-[#1E2B4A]',
  cardHeading: 'text-base font-semibold text-[#1E2B4A]',
  bodyText: 'text-sm sm:text-base text-[#202938] leading-relaxed',
  secondaryText: 'text-xs sm:text-sm text-[#64748B]',
  captionText: 'text-xs text-[#94A3B8]',
} as const;

export const shadows = {
  xs: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
  sm: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px -1px rgba(16, 24, 40, 0.05)',
  md: '0 4px 6px -1px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
} as const;

export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  colors: 'transition-colors duration-150 ease-in-out',
} as const;

