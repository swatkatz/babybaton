/**
 * Color palette for Baby Baton app
 * Based on design doc: soft blues/teals for calm baby app aesthetic
 */

export const colors = {
  // Primary colors (soft blue/teal for calm baby app)
  primary: '#5B9BD5',
  primaryLight: '#A8D5F2',
  primaryDark: '#2E6FA8',

  // Accent (warm peach/coral)
  accent: '#FFB6A3',

  // Functional colors
  success: '#7BC96F', // Green for confirm actions
  warning: '#FFD93D', // Yellow for attention
  error: '#FF6B6B', // Red for delete actions

  // Neutrals
  background: '#F8F9FA', // Light gray background
  surface: '#FFFFFF', // White cards/surfaces
  border: '#E1E8ED', // Light borders

  // Text colors
  textPrimary: '#2C3E50', // Dark gray for primary text
  textSecondary: '#7F8C9A', // Medium gray for secondary text
  textLight: '#A8B4C0', // Light gray for hints/disabled

  // Activity type colors (matching your design doc)
  feed: '#5B9BD5', // Blue
  diaper: '#FFB6A3', // Peach
  sleep: '#B19CD9', // Purple

  // Caregiver badge colors
  caregiverColors: [
    { bg: '#E8D5F2', text: '#7B2CBF' }, // Purple
    { bg: '#CFE2FF', text: '#0D6EFD' }, // Blue
    { bg: '#FFE5D9', text: '#D85A2B' }, // Orange
    { bg: '#D5F4E6', text: '#2A9D8F' }, // Teal
    { bg: '#FFE0E6', text: '#D84A70' }, // Pink
  ],
} as const;

// Type for accessing colors
export type Colors = typeof colors;

// Helper function to get caregiver color by ID
export const getCaregiverColor = (caregiverId: string) => {
  // Simple hash function to consistently map ID to color
  const hash = caregiverId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % colors.caregiverColors.length;
  return colors.caregiverColors[index];
};
