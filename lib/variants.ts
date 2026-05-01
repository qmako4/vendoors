import type { AlbumColor } from './supabase/types';

export type SizeSet = {
  id: string;
  label: string;
  sizes: string[];
};

export const SIZE_SETS: SizeSet[] = [
  {
    id: 'clothing',
    label: 'Clothing',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  },
  {
    id: 'shoes-uk',
    label: 'UK Shoes',
    sizes: ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'UK 13'],
  },
  {
    id: 'shoes-us',
    label: 'US Shoes',
    sizes: ['US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12', 'US 13'],
  },
  {
    id: 'shoes-eu',
    label: 'EU Shoes',
    sizes: ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45', 'EU 46'],
  },
  {
    id: 'waist',
    label: 'Waist',
    sizes: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  },
];

export const PRESET_COLORS: AlbumColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Beige', hex: '#D6D3D1' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Cream', hex: '#FEF3C7' },
];

/** Compute variants from selected sizes and colors. */
export function buildVariants(
  sizes: string[],
  colors: AlbumColor[],
): Array<{ size: string | null; color: AlbumColor | null }> {
  if (sizes.length === 0 && colors.length === 0) return [];
  if (sizes.length === 0)
    return colors.map((color) => ({ size: null, color }));
  if (colors.length === 0) return sizes.map((size) => ({ size, color: null }));
  return sizes.flatMap((size) =>
    colors.map((color) => ({ size, color })),
  );
}
