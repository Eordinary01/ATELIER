export const fontFamilies = {
  headline: ['Playfair Display', 'serif'],
  body: ['Inter', 'sans-serif'],
  mono: ['monospace'],
} as const;

export const fontSizes = {
  'headline-display': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '600' }],
  'headline-display-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'headline-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.01em', fontWeight: '500' }],
  'headline-lg-mobile': ['28px', { lineHeight: '36px', letterSpacing: '0em', fontWeight: '500' }],
  'headline-md': ['28px', { lineHeight: '36px', letterSpacing: '0em', fontWeight: '500' }],
  'headline-sm': ['22px', { lineHeight: '28px', letterSpacing: '0em', fontWeight: '500' }],
  'title-lg': ['18px', { lineHeight: '26px', letterSpacing: '-0.005em', fontWeight: '600' }],
  'title-md': ['16px', { lineHeight: '24px', letterSpacing: '0em', fontWeight: '600' }],
  'body-lg': ['18px', { lineHeight: '28px', letterSpacing: '0em', fontWeight: '400' }],
  'body-md': ['15px', { lineHeight: '24px', letterSpacing: '0.005em', fontWeight: '400' }],
  'body-sm': ['13px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '400' }],
  'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.04em', fontWeight: '600' }],
  'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
  'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '500' }],
  'price-lg': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'price-md': ['16px', { lineHeight: '22px', letterSpacing: '0em', fontWeight: '600' }],
} as const;
