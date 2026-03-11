import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4B2AAD',
          hover: '#7E5BFF',
          foreground: '#FFFFFF',
        },
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        success: '#24C38B',
        warning: '#FF8A5C',
      },
      fontFamily: {
        sans: ['"Inter"', '"Outfit"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '24px',
        lg: '16px',
        md: '12px',
        DEFAULT: '8px',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};

export default config;

