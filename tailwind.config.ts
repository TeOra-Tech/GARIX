import type { Config } from 'tailwindcss';

// Garix brand system (Brand Identity Guidelines v1.0).
// Primary Navy #0B1F4D · Gold accent #D4AF37 (max 10–15% of UI) · white ground.
// The `ink/volt/signal/paper` names are kept as back-compat aliases that now
// resolve to the light brand, so existing utility classes read correctly:
//   bg-ink → white surface · bg-ink-soft → light grey · border-ink-line → border
//   text-paper → charcoal body text · text-volt → navy · text-signal → gold
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1F4D', soft: '#14357A', deep: '#081737' },
        gold: { DEFAULT: '#D4AF37', soft: '#E9CC6A', ink: '#8A6D1B' },
        charcoal: '#1F2937',
        line: '#E5E7EB',
        // status
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#2563EB',
        // --- back-compat aliases (resolve to the light brand) ---
        ink: { DEFAULT: '#FFFFFF', soft: '#F8FAFC', line: '#E5E7EB' },
        volt: { DEFAULT: '#0B1F4D', bright: '#14357A', deep: '#081737' },
        signal: { DEFAULT: '#D4AF37', soft: '#8A6D1B' }, // soft = readable deep-gold for text on white
        paper: '#1F2937', // was a light tint; now charcoal so `text-paper` = readable body text
      },
      fontFamily: {
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        body: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { hex: '1.25rem' },
    },
  },
  plugins: [],
};
export default config;
