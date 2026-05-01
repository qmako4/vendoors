import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, display_name')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="dash">
      <DashboardNav
        email={user.email ?? ''}
        handle={profile?.handle ?? null}
        displayName={profile?.display_name ?? null}
      />
      <main className="dash-main">{children}</main>
    </div>
  );
}
