const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
// Font/layout tokens ported from MarketHub's dashboard, but colors stay
// BazaarKE's own teal/amber — primary/secondary keep numbered shades (used
// across the existing storefront, e.g. bg-primary-600) plus a DEFAULT +
// foreground pair so the ported shadcn components' unnumbered classes
// (bg-primary, text-secondary-foreground, etc.) resolve correctly too.
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    fontFamily: {
      sans: ['Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      heading: ['Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // One page width for the whole storefront — header, content and footer
      // all read `max-w-page`, so widening the layout is a single edit here
      // instead of four class strings that can drift out of step.
      maxWidth: {
        page: '90rem', // 1440px
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          ...colors.teal,
          DEFAULT: colors.teal[600],
          foreground: '#ffffff',
        },
        secondary: {
          ...colors.amber,
          DEFAULT: colors.amber[500],
          foreground: colors.gray[900],
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        dark: colors.gray,
      },
      // Every corner in the app derives from the single `--radius` token in
      // index.css — set that to `0` and the whole UI goes square-cornered.
      //
      // Tailwind's own defaults are overridden (not just extended) so a stray
      // `rounded` or `rounded-xl` can't reintroduce a fixed pixel radius that
      // ignores the token. `max(0px, ...)` keeps the smaller steps from going
      // negative — an invalid border-radius is dropped entirely, which would
      // leave those elements square while everything else stayed round.
      //
      // `rounded-full` is deliberately absent from the token scale: avatars,
      // status dots, badge pills and the toggle switch are circles by intent,
      // not corner styling, and must stay circular at any --radius.
      borderRadius: {
        none: '0px',
        sm: 'max(0px, calc(var(--radius) - 4px))',
        DEFAULT: 'max(0px, calc(var(--radius) - 2px))',
        md: 'max(0px, calc(var(--radius) - 2px))',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
        full: '9999px',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        tilt: {
          '0%, 100%': { transform: 'rotate(-5deg) translateY(0)' },
          '50%': { transform: 'rotate(5deg) translateY(-5px)' },
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        float: 'float 4s ease-in-out infinite',
        tilt: 'tilt 1.5s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
