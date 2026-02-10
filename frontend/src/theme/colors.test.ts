import { colors, getCaregiverColor } from './colors';

describe('colors', () => {
  it('should export primary color values', () => {
    expect(colors.primary).toBe('#5B9BD5');
    expect(colors.primaryLight).toBe('#A8D5F2');
    expect(colors.primaryDark).toBe('#2E6FA8');
  });

  it('should export activity type colors', () => {
    expect(colors.feed).toBeDefined();
    expect(colors.diaper).toBeDefined();
    expect(colors.sleep).toBeDefined();
  });

  it('should have caregiver colors array with at least one entry', () => {
    expect(colors.caregiverColors).toBeDefined();
    expect(colors.caregiverColors.length).toBeGreaterThan(0);
  });

  it('should have bg and text properties on each caregiver color', () => {
    colors.caregiverColors.forEach((color) => {
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('text');
      expect(typeof color.bg).toBe('string');
      expect(typeof color.text).toBe('string');
    });
  });
});

describe('getCaregiverColor', () => {
  it('should return a color object with bg and text properties', () => {
    const color = getCaregiverColor('some-caregiver-id');
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
  });

  it('should return the same color for the same caregiver ID (deterministic)', () => {
    const color1 = getCaregiverColor('caregiver-abc');
    const color2 = getCaregiverColor('caregiver-abc');
    expect(color1).toEqual(color2);
  });

  it('should return a valid caregiver color from the palette', () => {
    const color = getCaregiverColor('test-id');
    const isInPalette = colors.caregiverColors.some(
      (c) => c.bg === color.bg && c.text === color.text
    );
    expect(isInPalette).toBe(true);
  });

  it('should handle different IDs and potentially return different colors', () => {
    // Test with many IDs to confirm we can get different colors
    const uniqueColors = new Set<string>();
    const testIds = [
      'id-1',
      'id-2',
      'id-3',
      'id-alpha',
      'id-beta',
      'id-gamma',
      'id-delta',
      'long-caregiver-id-12345',
      'a',
      'z',
    ];
    testIds.forEach((id) => {
      const color = getCaregiverColor(id);
      uniqueColors.add(color.bg);
    });
    // We should get at least 2 different colors from 10 different IDs
    expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
  });

  it('should handle empty string ID without crashing', () => {
    const color = getCaregiverColor('');
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
  });
});
