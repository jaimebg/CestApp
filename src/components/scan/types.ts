/**
 * Shared types for the review screen components
 */

export type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

export interface ReviewColors {
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
}
