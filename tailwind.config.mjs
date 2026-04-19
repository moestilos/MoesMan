/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Capas del fondo — OKLCH-inspired, calidez sutil
        bg: {
          DEFAULT: '#08080b',
          raised: '#0e0e12',
          elevated: '#14141a',
          card: '#1a1a22',
          hover: '#22222b',
          sunken: '#050507',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.12)',
          hover: 'rgba(255,255,255,0.18)',
        },
        fg: {
          DEFAULT: '#f5f5f7',
          muted: '#b5b5bd',
          subtle: '#7c7c86',
          faint: '#4a4a52',
        },
        // Brand — parametrizado via CSS vars (ver :root y [data-theme="X"])
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
          DEFAULT: 'rgb(var(--brand-500) / <alpha-value>)',
        },
        // Accent secundario — violeta para variedad
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // Estados
        success: { 400: '#4ade80', 500: '#22c55e' },
        warning: { 400: '#fbbf24', 500: '#f59e0b' },
        info: { 400: '#60a5fa', 500: '#3b82f6' },
      },
      fontFamily: {
        sans: ['"Zen Kaku Gothic New"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Zen Kaku Gothic New"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        brand: ['"Zen Kaku Gothic New"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['0.95rem', { lineHeight: '1.55rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.65rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        '3xl': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        '5xl': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        '6xl': ['4rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        '2xs': '0.25rem',
        xs: '0.375rem',
      },
      boxShadow: {
        'glow-sm': '0 0 20px -8px rgb(var(--brand-500) / 0.4)',
        glow: '0 0 50px -12px rgb(var(--brand-500) / 0.55)',
        'glow-lg': '0 0 80px -15px rgb(var(--brand-500) / 0.6)',
        card: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.6)',
        'card-lg': '0 4px 8px rgba(0,0,0,0.4), 0 24px 48px -16px rgba(0,0,0,0.7)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
        'ring-brand': '0 0 0 3px rgb(var(--brand-500) / 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, rgb(var(--brand-400)) 0%, rgb(var(--brand-600)) 55%, rgb(var(--brand-800)) 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245, 53, 106, 0.15), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(139, 92, 246, 0.08), transparent 60%)',
        'mesh-dark': `
          radial-gradient(at 14% 8%, rgba(245, 53, 106, 0.10) 0px, transparent 45%),
          radial-gradient(at 88% 4%, rgba(139, 92, 246, 0.08) 0px, transparent 45%),
          radial-gradient(at 50% 100%, rgba(245, 53, 106, 0.05) 0px, transparent 50%)
        `,
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 53, 106, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(245, 53, 106, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245, 53, 106, 0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
