import type { Metadata } from 'next';
import Link from 'next/link';
import { listGalleries, getActiveGallery } from '@/lib/active-gallery';
import { createGallery } from './actions';
import { GalleryList } from './_components/GalleryList';

export const metadata: Metadata = { title: 'Galleries' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const galleries = await listGalleries();
  const active = await getActiveGallery();

  return (
    <div className="dash-page dash-page-narrow">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">YOUR GALLERIES</div>
        <h1 className="dash-h1">Galleries</h1>
        <p className="dash-lede">
          Run multiple shops from one account. Each gallery has its own URL,
          products, categories, photos, and contact details. Switch between
          them anytime.
        </p>
      </header>

      <section className="dash-section">
        <h2 className="dash-h2 dash-form-section">Your galleries</h2>
        <GalleryList
          galleries={galleries}
          activeId={active?.id ?? null}
        />
      </section>

      <section className="dash-section">
        <h2 className="dash-h2 dash-form-section">Create a new gallery</h2>
        <p className="dash-section-hint mono">
          Pick a unique handle for the URL. You&apos;ll be auto-switched into
          the new gallery once it&apos;s created.
        </p>
        <form action={createGallery} className="dash-form">
          <label className="dash-field">
            <span className="mono">DISPLAY NAME</span>
            <input
              type="text"
              name="display_name"
              required
              placeholder="My Other Brand"
            />
          </label>
          <label className="dash-field">
            <span className="mono">HANDLE</span>
            <div className="dash-slug">
              <span className="dash-slug-prefix mono">vendoors.co /</span>
              <input
                type="text"
                name="handle"
                required
                minLength={2}
                pattern="[a-z0-9-]+"
                placeholder="my-other-brand"
              />
            </div>
            <span className="dash-field-hint mono">
              Lowercase letters, numbers, dashes. This becomes your gallery URL.
            </span>
          </label>
          {err && <div className="auth-err mono">{err}</div>}
          <div className="dash-form-actions">
            <button type="submit" className="btn-primary btn-lg">
              Create gallery →
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
