import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveGallery } from '@/lib/active-gallery';
import {
  CategoriesManager,
  type CategoryRow,
} from './_components/CategoriesManager';

export const metadata: Metadata = { title: 'Categories' };

export default async function Page() {
  const supabase = await createClient();
  const active = await getActiveGallery();
  const galleryId = active?.id ?? '';

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order')
    .eq('vendor_id', galleryId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div className="dash-page dash-page-narrow">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">CATEGORIES</div>
        <h1 className="dash-h1">Categories</h1>
        <p className="dash-lede">
          Categories are labels you use to organise your products. Each product
          can belong to one or more categories. Buyers see them as nav tabs on
          your gallery.
        </p>
      </header>

      <section className="dash-section">
        <CategoriesManager
          vendorId={galleryId}
          initial={(cats ?? []) as CategoryRow[]}
        />
      </section>
    </div>
  );
}
