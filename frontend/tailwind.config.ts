import type { Config } from 'tailwindcss';
import { colors } from './lib/design-tokens';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Phase 2 Enterprise Brand Design Tokens
        brand: {
          navy: colors.primaryNavy,       // #1E2B4A
          deep: colors.deepNavy,          // #17243E
          muted: colors.mutedBlue,        // #526D94
          bg: colors.primaryBg,           // #F7F8FA
          surface: colors.surface,        // #FFFFFF
          text: colors.textPrimary,       // #202938
          secondary: colors.textSecondary,// #64748B
          border: colors.border,          // #E2E8F0
          success: colors.success,        // #39805B
          warning: colors.warning,        // #C58A36
          error: colors.error,            // #C74C4C
        },
        // Semantic and legacy palette mappings for stability
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#829AB1',
          500: '#627D98',
          600: '#486581',
          700: '#334E68',
          800: '#243B53',
          900: '#1E2B4A', // Primary Navy
          950: '#17243E', // Deep Navy
        },
        surface: {
          DEFAULT: '#FFFFFF',
          bg: '#F7F8FA',
          subtle: '#F8FAFC',
          border: '#E2E8F0',
        },
        charcoal: {
          DEFAULT: '#202938',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        status: {
          success: '#39805B',
          warning: '#C58A36',
          danger: '#C74C4C',
          info: '#2A6F97',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        sm: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px -1px rgba(16, 24, 40, 0.05)',
        md: '0 4px 6px -1px rgba(16, 24, 40, 0.06), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
