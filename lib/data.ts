export type Swatch = readonly [string, string];

export type Album = {
  id: string;
  title: string;
  vendor: string;
  category: string;
  photoCount: number;
  updatedDays: number;
  swatch: Swatch;
  label: string;
};

export type Category = {
  id: string;
  label: string;
  count: number;
};

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All categories', count: 38018 },
  { id: 'outerwear', label: 'Outerwear', count: 4210 },
  { id: 'knitwear', label: 'Knitwear', count: 2884 },
  { id: 'denim', label: 'Denim', count: 3105 },
  { id: 'tailoring', label: 'Tailoring', count: 1672 },
  { id: 'footwear', label: 'Footwear', count: 5921 },
  { id: 'bags', label: 'Bags', count: 2410 },
  { id: 'eyewear', label: 'Eyewear', count: 988 },
  { id: 'jewelry', label: 'Jewelry', count: 1244 },
  { id: 'archive', label: 'Archive', count: 612 },
  { id: 'workwear', label: 'Workwear', count: 1801 },
  { id: 'leather', label: 'Leather goods', count: 1422 },
  { id: 'accessories', label: 'Accessories', count: 3088 },
  { id: 'home', label: 'Home objects', count: 740 },
];

const SWATCHES: Swatch[] = [
  ['#1c1c1a', '#2a2a27'],
  ['#e9e3d6', '#dcd4c2'],
  ['#3a2f25', '#4a3c2e'],
  ['#7a3b2c', '#5e2c20'],
  ['#2d3a3a', '#1f2a2a'],
  ['#c9b89a', '#b9a684'],
  ['#48402f', '#352d20'],
  ['#8a8478', '#6f6a5f'],
  ['#a85a3c', '#8c4a30'],
  ['#1f2933', '#141c24'],
  ['#d9cdb4', '#c4b89c'],
  ['#5d4a36', '#473828'],
];

const ALBUM_TITLES = [
  'No.142 / Felted overcoat — charcoal',
  'No.118 / Cropped chore jacket',
  'No.207 / Aran fisherman knit',
  'No.091 / Selvedge denim, indigo dye',
  'No.155 / Pleated trouser, wool flannel',
  'No.063 / Derby shoe, brown calf',
  'No.222 / Tote bag, vegetable tan',
  'No.044 / Round acetate frame',
  'No.301 / Signet ring, brass',
  'No.012 / Archive parka — 1996',
  'No.176 / Painter pant, ecru',
  'No.250 / Patch-pocket cardigan',
  'No.087 / Penny loafer, oxblood',
  'No.198 / Field trouser, sand',
  'No.029 / Crewneck sweat, faded black',
  'No.260 / Camp-collar shirt, stripe',
  'No.105 / Mohair crewneck',
  'No.073 / Mountain parka, olive',
  'No.181 / Pleated kilt skirt',
  'No.014 / Hand-knit beanie',
  'No.213 / Suede chelsea boot',
  'No.137 / Linen trouser, bone',
  'No.066 / Quilted liner jacket',
  'No.245 / Rugby shirt, hooped',
  'No.019 / Watch cap, navy',
  'No.288 / Suede sneaker, low',
  'No.121 / Polo shirt, milano knit',
  'No.054 / Trench coat, stone',
  'No.232 / Fair-isle vest',
  'No.099 / Canvas backpack, 22L',
  'No.147 / Heavyweight tee, ivory',
  'No.270 / Dress shirt, oxford blue',
];

const VENDORS = [
  'Atelier Mori', 'Studio Hexa', 'North/South', 'Maison Verre',
  'Tabula Rasa', 'Folio & Co.', 'Common Goods', 'Workroom 9',
  'Field Notes', 'Hemlock', 'Plain Index', 'Object Permanence',
];

const CATS_FOR_ALBUM = [
  'outerwear', 'knitwear', 'denim', 'tailoring', 'footwear',
  'bags', 'eyewear', 'jewelry', 'archive', 'workwear',
  'leather', 'accessories',
];

export type Photo = {
  idx: number;
  w: number;
  h: number;
  swatch: Swatch;
  caption: string;
};

const PHOTO_RATIOS: Array<[number, number]> = [
  [4, 5], [4, 5], [3, 2], [4, 5], [1, 1],
  [4, 5], [3, 4], [2, 3], [4, 5], [3, 2],
  [4, 5], [1, 1], [4, 5], [4, 5],
];

export function photosForAlbum(album: Album): Photo[] {
  const baseIdx = SWATCHES.findIndex((s) => s[0] === album.swatch[0] && s[1] === album.swatch[1]);
  return Array.from({ length: album.photoCount }).map((_, i) => {
    const [w, h] = PHOTO_RATIOS[i % PHOTO_RATIOS.length];
    return {
      idx: i + 1,
      w,
      h,
      swatch: SWATCHES[(baseIdx + i) % SWATCHES.length],
      caption: `Plate ${String(i + 1).padStart(2, '0')}`,
    };
  });
}

export function getAlbum(id: string): Album | undefined {
  return ALBUMS.find((a) => a.id === id);
}

export const ALBUMS: Album[] = Array.from({ length: 64 }).map((_, i) => {
  const swatch = SWATCHES[i % SWATCHES.length];
  const title = ALBUM_TITLES[i % ALBUM_TITLES.length];
  const vendor = VENDORS[i % VENDORS.length];
  const category = CATS_FOR_ALBUM[i % CATS_FOR_ALBUM.length];
  const photoCount = 8 + ((i * 7) % 22);
  const updatedDays = 1 + ((i * 3) % 60);
  return {
    id: `vd-${String(1000 + i).padStart(4, '0')}`,
    title,
    vendor,
    category,
    photoCount,
    updatedDays,
    swatch,
    label: title.split(' / ')[1] || title,
  };
});
