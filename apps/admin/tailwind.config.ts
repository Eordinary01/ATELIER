import type { Config } from 'tailwindcss';
import { atelierTailwindPreset } from '@atelier/tokens';

const config: Config = {
  presets: [atelierTailwindPreset as any],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
