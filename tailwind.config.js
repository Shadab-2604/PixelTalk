/**
 * File: tailwind.config.js
 *
 * Responsibility:
 * Tailwind CSS design system configuration:
 * Defines PixelTalk color palette tokens (#6E3511, #91AC67, #597928, #FCECD8, etc.),
 * typography scales, custom pixel offset box-shadows, and keyframe animations.
 *
 * Layer:
 * Frontend / Styling Configuration
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './features/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#fff8f3',
        'surface-dim': '#e7d8c4',
        'surface-bright': '#fff8f3',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fff2e2',
        'surface-container': '#fcecd8',
        'surface-container-high': '#f6e6d2',
        'surface-container-highest': '#f0e0cd',
        'surface-variant': '#f0e0cd',
        'on-surface': '#221a0e',
        'on-surface-variant': '#44483b',
        'inverse-surface': '#382f22',
        'inverse-on-surface': '#feeeda',
        outline: '#747969',
        'outline-variant': '#c4c8b7',
        'surface-tint': '#496718',
        primary: '#426010',
        'on-primary': '#ffffff',
        'primary-container': '#597928',
        'on-primary-container': '#dfffad',
        'inverse-primary': '#aed376',
        secondary: '#4e6629',
        'on-secondary': '#ffffff',
        'secondary-container': '#d0eda1',
        'on-secondary-container': '#546c2f',
        tertiary: '#844721',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#a25e37',
        'on-tertiary-container': '#fff1ec',
        'primary-fixed': '#c9ef8f',
        'primary-fixed-dim': '#aed376',
        'on-primary-fixed': '#121f00',
        'on-primary-fixed-variant': '#324f00',
        'secondary-fixed': '#d0eda1',
        'secondary-fixed-dim': '#b4d087',
        'on-secondary-fixed': '#121f00',
        'on-secondary-fixed-variant': '#374d13',
        'tertiary-fixed': '#ffdbca',
        'tertiary-fixed-dim': '#ffb68f',
        'on-tertiary-fixed': '#331100',
        'on-tertiary-fixed-variant': '#703713',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        brown: '#6E3511',
        grass: '#91AC67',
        amberpix: '#DFA035',
        brick: '#B84A39',
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
        'pixel-sm': '2px 2px 0 0 rgba(110, 53, 17, 0.15)',
        'pixel-sm-solid': '2px 2px 0 0 #6E3511',
        'pixel-md': '3px 3px 0 0 #6E3511',
        'pixel-lg': '6px 6px 0 0 #6E3511',
        'pixel-terracotta': '2px 2px 0 0 #844721',
        'topbar': '0 2px 0 0 rgba(110, 53, 17, 0.15)',
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
