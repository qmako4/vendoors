import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './_components/ProfileForm';

export const metadata: Metadata = { title: 'Profile' };

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, handle, display_name, bio, city, contact_whatsapp, contact_wechat, contact_telegram, contact_instagram, contact_email, watermark_enabled, watermark_text',
    )
    .eq('id', user!.id)
    .maybeSingle();

  if (!profile) redirect('/');

  return (
    <div className="dash-page dash-page-narrow">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">YOUR PROFILE</div>
        <h1 className="dash-h1">Profile &amp; contact</h1>
        <p className="dash-lede">
          Edit how your gallery page appears to buyers. Contact channels show
          up as click-to-copy buttons.
        </p>
      </header>

      <ProfileForm initial={profile} />
    </div>
  );
}
