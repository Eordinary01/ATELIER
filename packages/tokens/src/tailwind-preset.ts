import { colors } from './colors.js';
import { fontSizes } from './typography.js';
import { spacing } from './spacing.js';
import { borderRadius } from './radii.js';

export const atelierTailwindPreset = {
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius,
      fontFamily: {
        headline: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
        'headline-display': ['Playfair Display', 'serif'],
        'price-lg': ['Inter', 'sans-serif'],
        'headline-sm': ['Playfair Display', 'serif'],
        'price-md': ['Inter', 'sans-serif'],
        'headline-lg': ['Playfair Display', 'serif'],
        'body-md': ['Inter', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'],
        'title-lg': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'title-md': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'headline-lg-mobile': ['Playfair Display', 'serif'],
        'headline-md': ['Playfair Display', 'serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'headline-display-mobile': ['Playfair Display', 'serif'],
      },
      fontSize: fontSizes,
      boxShadow: {
        sm: '0 1px 2px 0 rgba(20, 20, 19, 0.05)',
        md: '0 4px 6px -1px rgba(20, 20, 19, 0.06)',
        modal: '0 8px 30px rgba(20, 20, 19, 0.08)',
      },
    },
  },
};
