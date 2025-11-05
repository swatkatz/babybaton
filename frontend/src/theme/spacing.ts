import { Dimensions } from 'react-native';

/**
 * Responsive spacing system
 * Scales based on screen width for consistent look across devices
 */

const { width, height } = Dimensions.get('window');

export const spacing = {
  // Base spacing scale (in pixels on 375px wide screen)
  xs: Math.round(width * 0.02), // ~8px
  sm: Math.round(width * 0.04), // ~16px
  md: Math.round(width * 0.06), // ~24px
  lg: Math.round(width * 0.08), // ~32px
  xl: Math.round(width * 0.12), // ~48px
} as const;

export const layout = {
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,

  // Common layout values
  cardWidth: Math.min(width * 0.9, 450), // 90% width, max 450px
  maxContentWidth: 480, // Max width for content on tablets

  // Touch targets (minimum 44x44 per iOS HIG)
  minTouchTarget: 44,

  // Border radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusRound: 9999, // Fully rounded (pills, circles)
} as const;

export const typography = {
  // Font sizes (fixed for consistent web and mobile)
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type Spacing = typeof spacing;
export type Layout = typeof layout;
export type Typography = typeof typography;
