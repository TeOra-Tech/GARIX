import type { Config } from 'tailwindcss';

// Brand palette derived from the Garix logo:
// electric blue hexagon, signal-orange car, near-black ground.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#070B14',   // logo background
          soft: '#0D1424',
          line: '#1B2740',
        },
        volt: {
          DEFAULT: '#1E7FE8',   // hexagon blue
          bright: '#3D9BFF',
          deep: '#0B5AC2',
        },
        signal: {
          DEFAULT: '#F97316',   // car orange
          soft: '#FDBA74',
        },
        paper: '#F6F7FB',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { hex: '1.25rem' },
    },
  },
  plugins: [],
};
export default config;
