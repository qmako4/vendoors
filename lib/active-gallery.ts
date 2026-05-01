import { cookies } from 'next/headers';
import { createClient } from './supabase/server';

const COOKIE = 'active_gallery';

export type Gallery = {
  id: string;
  handle: string;
  display_name: string;
};

/** All galleries owned by the current user, oldest first. */
export async function listGalleries(): Promise<Gallery[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });
  return (data ?? []) as Gallery[];
}

/**
 * Returns the currently-active gallery for the signed-in user. The active
 * gallery is stored in a cookie and falls back to the user's first/oldest
 * gallery when the cookie is missing or invalid.
 */
export async function getActiveGallery(): Promise<Gallery | null> {
  const galleries = await listGalleries();
  if (galleries.length === 0) return null;
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE)?.value;
  return galleries.find((g) => g.id === id) ?? galleries[0];
}

export async function setActiveGalleryCookie(id: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
