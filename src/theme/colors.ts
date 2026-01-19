/**
 * Centralized theme colors for the app
 * Provides consistent colors across all screens
 */

export const lightColors = {
  background: '#FFFDE1',
  surface: '#FFFFFF',
  text: '#2D2A26',
  textSecondary: '#6B6560',
  border: '#E8E4D9',
  primary: '#93BD57',
  primaryDark: '#7AA042',
  primaryDeep: '#3D6B23',
  accent: '#FBE580',
  error: '#980404',
};

export const darkColors = {
  background: '#1A1918',
  surface: '#2D2A26',
  text: '#FFFDE1',
  textSecondary: '#B8B4A9',
  border: '#4A4640',
  primary: '#93BD57',
  primaryDark: '#7AA042',
  primaryDeep: '#3D6B23',
  accent: '#FBE580',
  error: '#C94444',
};

export type AppColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  accent: string;
  error: string;
};
