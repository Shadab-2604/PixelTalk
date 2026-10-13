/**
 * File: tailwind.config.js
 *
 * Responsibility:
 * Tailwind CSS design system configuration:
 * Defines PixelTalk color palette tokens as references to the CSS custom properties in
 * app/globals.css (`:root` = Light Mode, `.dark` = Dark Mode), typography scales,
 * custom pixel offset box-shadows, and keyframe animations.
 *
 * THEME ARCHITECTURE:
 * Every color maps to `rgb(var(--pt-*) / <alpha-value>)` so a single variable swap
 * re-themes the whole app while opacity modifiers (`bg-primary/40`) keep working.
 * Shadow colors resolve through CSS variables too, so the signature pixel offset
 * shadows switch from brown (#6E3511) to near-black in Dark Mode automatically.
 *
 * Layer:
 * Frontend / Styling Configuration
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './features/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgb(var(--pt-surface) / <alpha-value>)',
        'surface-dim': 'rgb(var(--pt-surface-dim) / <alpha-value>)',
        'surface-bright': 'rgb(var(--pt-surface-bright) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--pt-surface-container-lowest) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--pt-surface-container-low) / <alpha-value>)',
        'surface-container': 'rgb(var(--pt-surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--pt-surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--pt-surface-container-highest) / <alpha-value>)',
        'surface-variant': 'rgb(var(--pt-surface-variant) / <alpha-value>)',
        'on-surface': 'rgb(var(--pt-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--pt-on-surface-variant) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--pt-inverse-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--pt-inverse-on-surface) / <alpha-value>)',
        outline: 'rgb(var(--pt-outline) / <alpha-value>)',
        'outline-variant': 'rgb(var(--pt-outline-variant) / <alpha-value>)',
        'surface-tint': 'rgb(var(--pt-surface-tint) / <alpha-value>)',
        primary: 'rgb(var(--pt-primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--pt-on-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--pt-primary-container) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--pt-on-primary-container) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--pt-inverse-primary) / <alpha-value>)',
        secondary: 'rgb(var(--pt-secondary) / <alpha-value>)',
        'on-secondary': 'rgb(var(--pt-on-secondary) / <alpha-value>)',
        'secondary-container': 'rgb(var(--pt-secondary-container) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--pt-on-secondary-container) / <alpha-value>)',
        tertiary: 'rgb(var(--pt-tertiary) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--pt-on-tertiary) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--pt-tertiary-container) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--pt-on-tertiary-container) / <alpha-value>)',
        'primary-fixed': 'rgb(var(--pt-primary-fixed) / <alpha-value>)',
        'primary-fixed-dim': 'rgb(var(--pt-primary-fixed-dim) / <alpha-value>)',
        'on-primary-fixed': 'rgb(var(--pt-on-primary-fixed) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--pt-on-primary-fixed-variant) / <alpha-value>)',
        'secondary-fixed': 'rgb(var(--pt-secondary-fixed) / <alpha-value>)',
        'secondary-fixed-dim': 'rgb(var(--pt-secondary-fixed-dim) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--pt-on-secondary-fixed) / <alpha-value>)',
        'on-secondary-fixed-variant': 'rgb(var(--pt-on-secondary-fixed-variant) / <alpha-value>)',
        'tertiary-fixed': 'rgb(var(--pt-tertiary-fixed) / <alpha-value>)',
        'tertiary-fixed-dim': 'rgb(var(--pt-tertiary-fixed-dim) / <alpha-value>)',
        'on-tertiary-fixed': 'rgb(var(--pt-on-tertiary-fixed) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--pt-on-tertiary-fixed-variant) / <alpha-value>)',
        error: 'rgb(var(--pt-error) / <alpha-value>)',
        'on-error': 'rgb(var(--pt-on-error) / <alpha-value>)',
        'error-container': 'rgb(var(--pt-error-container) / <alpha-value>)',
        'on-error-container': 'rgb(var(--pt-on-error-container) / <alpha-value>)',
        brown: 'rgb(var(--pt-brown-rgb) / <alpha-value>)',
        grass: 'rgb(var(--pt-grass) / <alpha-value>)',
        amberpix: 'rgb(var(--pt-amberpix) / <alpha-value>)',
        brick: 'rgb(var(--pt-brick) / <alpha-value>)',
      },
      fontFamily: {
        'display': ['"Pixelify Sans"', '"Space Grotesk"', 'sans-serif'],
        'body': ['"Pixelify Sans"', '"Plus Jakarta Sans"', 'sans-serif'],
        'mono': ['"Pixelify Sans"', '"Space Mono"', 'monospace'],
        'pixel': ['"Pixelify Sans"', 'cursive', 'sans-serif'],
      },
      fontSize: {
        'label-sm': ['10px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        'label-md': ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'label-lg': ['13px', { lineHeight: '18px', letterSpacing: '0.04em' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'headline-sm': ['18px', { lineHeight: '24px' }],
        'headline-md': ['22px', { lineHeight: '28px' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em' }],
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }],
        'display-lg-mobile': ['30px', { lineHeight: '36px', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'pixel-sm': '2px 2px 0 0 var(--pt-shadow-soft)',
        'pixel-sm-solid': '2px 2px 0 0 var(--pt-shadow)',
        'pixel-md': '3px 3px 0 0 var(--pt-shadow)',
        'pixel-lg': '6px 6px 0 0 var(--pt-shadow)',
        'pixel-terracotta': '2px 2px 0 0 var(--pt-shadow-terracotta)',
        'topbar': '0 2px 0 0 var(--pt-shadow-soft)',
      },
      keyframes: {
        pixelDrift: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pixelBounce: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        'pixel-float': 'pixelDrift 4s ease-in-out infinite',
        'pixel-float-delayed': 'pixelDrift 5s ease-in-out 1.5s infinite',
        'pixel-bounce-1': 'pixelBounce 1s steps(2) infinite 0ms',
        'pixel-bounce-2': 'pixelBounce 1s steps(2) infinite 200ms',
        'pixel-bounce-3': 'pixelBounce 1s steps(2) infinite 400ms',
      },
    },
  },
  plugins: [],
};
