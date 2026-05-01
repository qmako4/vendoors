'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setActiveGalleryCookie } from '@/lib/active-gallery';

export async function switchGallery(id: string): Promise<void> {
  await setActiveGalleryCookie(id);
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard');
}

export async function createGallery(formData: FormData): Promise<void> {
  const handleRaw = String(formData.get('handle') ?? '').trim().toLowerCase();
  const handle = handleRaw.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const displayName = String(formData.get('display_name') ?? '').trim();

  if (!handle || handle.length < 2) {
    redirect('/dashboard/galleries?err=' + encodeURIComponent('Handle is required (2+ chars)'));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      owner_id: user.id,
      handle,
      display_name: displayName || handle,
      contact_email: user.email,
    })
    .select('id')
    .single();

  if (error || !data) {
    redirect('/dashboard/galleries?err=' + encodeURIComponent(error?.message ?? 'Failed to create'));
  }

  await setActiveGalleryCookie(data.id);
  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard');
}

export async function deleteGallery(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Refuse to delete if it's the user's only gallery
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);
  if ((count ?? 0) <= 1) {
    redirect('/dashboard/galleries?err=' + encodeURIComponent('Can\'t delete your only gallery'));
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);
  if (error) {
    redirect('/dashboard/galleries?err=' + encodeURIComponent(error.message));
  }

  // If we just deleted the active gallery, fall back to the next one.
  const { data: remaining } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (remaining?.id) await setActiveGalleryCookie(remaining.id);

  revalidatePath('/dashboard', 'layout');
  redirect('/dashboard/galleries');
}
