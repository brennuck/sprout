import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--surface-base) / <alpha-value>)',
        foreground: 'hsl(var(--text-primary) / <alpha-value>)',
        surface: {
          DEFAULT: 'hsl(var(--surface-raised) / <alpha-value>)',
          muted: 'hsl(var(--surface-muted) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'hsl(var(--text-primary) / <alpha-value>)',
          secondary: 'hsl(var(--text-secondary) / <alpha-value>)',
          muted: 'hsl(var(--text-muted) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          strong: 'hsl(var(--brand-strong) / <alpha-value>)',
          soft: 'hsl(var(--brand-soft) / <alpha-value>)',
        },
        positive: 'hsl(var(--positive) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        focus: 'hsl(var(--focus) / <alpha-value>)',
        line: 'hsl(var(--border-subtle) / <alpha-value>)',
        // Earthy green palette
        sage: {
          50: '#f6f7f4',
          100: '#e4e8de',
          200: '#c9d1be',
          300: '#a7b496',
          400: '#879875',
          500: '#5f714f',
          600: '#536345',
          700: '#424e38',
          800: '#374030',
          900: '#2f3729',
          950: '#181d14',
        },
        // Warm cream tones
        cream: {
          50: '#fefdfb',
          100: '#fcf9f3',
          200: '#f8f1e4',
          300: '#f2e4ce',
          400: '#e9d1ae',
          500: '#ddb88b',
          600: '#cd9c6a',
          700: '#b97f53',
          800: '#976848',
          900: '#7b573e',
        },
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'in': 'animateIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        animateIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

