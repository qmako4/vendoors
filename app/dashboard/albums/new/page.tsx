import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveGallery } from '@/lib/active-gallery';
import { NewProductForm } from './_components/NewProductForm';

export const metadata: Metadata = { title: 'New product' };

export default async function Page() {
  const supabase = await createClient();
  const active = await getActiveGallery();
  const galleryId = active?.id ?? '';

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('vendor_id', galleryId)
    .order('name');
  const categories = (cats ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="dash-page dash-page-narrow">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">NEW PRODUCT</div>
        <h1 className="dash-h1">Create a product.</h1>
        <p className="dash-lede">
          Set the basics, attach photos, and publish in one step. Sizes, colors,
          and links can be tweaked on the next screen.
        </p>
      </header>

      <NewProductForm vendorId={galleryId} categories={categories} />
    </div>
  );
}
