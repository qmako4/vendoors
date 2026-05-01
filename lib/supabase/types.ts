/**
 * Database types — hand-written to match supabase/migrations/0001_initial_schema.sql.
 *
 * Replace with generated types once the Supabase CLI is set up:
 *   npx supabase gen types typescript --linked > lib/supabase/types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  plan: 'free' | 'studio' | 'atelier';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  contact_whatsapp: string | null;
  contact_wechat: string | null;
  contact_telegram: string | null;
  contact_instagram: string | null;
  contact_email: string | null;
  watermark_enabled: boolean;
  watermark_text: string | null;
  created_at: string;
};

export type AlbumLink = { label: string; url: string };
export type AlbumColor = { name: string; hex: string };

type Album = {
  id: string;
  vendor_id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  links: AlbumLink[];
  sizes: string[];
  colors: AlbumColor[];
  is_public: boolean;
  is_featured: boolean;
  password_hash: string | null;
  cover_photo_id: string | null;
  photo_count: number;
  created_at: string;
  updated_at: string;
};

type Photo = {
  id: string;
  album_id: string;
  media_id: string | null;
  storage_key: string;
  cf_image_id: string | null;
  width: number;
  height: number;
  sort_order: number;
  caption: string | null;
  created_at: string;
};

export type MediaClassification = {
  category: 'footwear' | 'clothing' | 'accessory' | 'other';
  title: string;
  dominant_colors: AlbumColor[];
  descriptors: string[];
};

type MediaItem = {
  id: string;
  vendor_id: string;
  storage_key: string;
  width: number;
  height: number;
  filename: string | null;
  classification: MediaClassification | null;
  processed_at: string | null;
  created_at: string;
};

type Inquiry = {
  id: string;
  album_id: string;
  buyer_name: string | null;
  buyer_contact: string;
  buyer_channel: 'whatsapp' | 'wechat' | 'telegram' | 'email';
  message: string | null;
  status: 'new' | 'replied' | 'closed';
  created_at: string;
};

type AccessGrant = {
  id: string;
  album_id: string;
  buyer_email: string;
  buyer_name: string | null;
  token: string;
  expires_at: string;
  opens: number;
  last_opened_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Cart = {
  id: string;
  vendor_handle: string | null;
  items: Json;
  buyer_note: string | null;
  buyer_name: string | null;
  created_at: string;
};

type Category = {
  id: string;
  vendor_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
};

type ProductCategory = {
  album_id: string;
  category_id: string;
  sort_order: number;
};

type Insertable<T, Required extends keyof T = never> =
  & Pick<T, Required>
  & Partial<Omit<T, Required>>;

type Updateable<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insertable<Profile, 'id' | 'handle' | 'display_name'>;
        Update: Updateable<Profile>;
        Relationships: [];
      };
      albums: {
        Row: Album;
        Insert: Insertable<Album, 'vendor_id' | 'slug' | 'title'>;
        Update: Updateable<Album>;
        Relationships: [];
      };
      photos: {
        Row: Photo;
        Insert: Insertable<Photo, 'album_id' | 'storage_key' | 'width' | 'height'>;
        Update: Updateable<Photo>;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: Insertable<Inquiry, 'album_id' | 'buyer_contact' | 'buyer_channel'>;
        Update: Updateable<Inquiry>;
        Relationships: [];
      };
      access_grants: {
        Row: AccessGrant;
        Insert: Insertable<AccessGrant, 'album_id' | 'buyer_email' | 'token' | 'expires_at'>;
        Update: Updateable<AccessGrant>;
        Relationships: [];
      };
      media: {
        Row: MediaItem;
        Insert: Insertable<MediaItem, 'vendor_id' | 'storage_key' | 'width' | 'height'>;
        Update: Updateable<MediaItem>;
        Relationships: [];
      };
      carts: {
        Row: Cart;
        Insert: Insertable<Cart>;
        Update: Updateable<Cart>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Insertable<Category, 'vendor_id' | 'name' | 'slug'>;
        Update: Updateable<Category>;
        Relationships: [];
      };
      product_categories: {
        Row: ProductCategory;
        Insert: Insertable<ProductCategory, 'album_id' | 'category_id'>;
        Update: Updateable<ProductCategory>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
