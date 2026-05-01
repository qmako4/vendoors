import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listGalleries, getActiveGallery } from '@/lib/active-gallery';
import { DashboardNav } from './_components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const galleries = await listGalleries();
  const active = await getActiveGallery();

  return (
    <div className="dash">
      <DashboardNav
        email={user.email ?? ''}
        galleries={galleries}
        activeId={active?.id ?? null}
      />
      <main className="dash-main">{children}</main>
    </div>
  );
}
