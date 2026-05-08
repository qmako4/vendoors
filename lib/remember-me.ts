export const REMEMBER_COOKIE = 'vd_remember';

type CookieOptions = {
  maxAge?: number;
  expires?: Date | number | string;
  [key: string]: unknown;
};

export function sessionizeIfNeeded<T extends CookieOptions | undefined>(
  options: T,
  remember: boolean,
): T {
  if (remember || !options) return options;
  const next = { ...options } as CookieOptions;
  delete next.maxAge;
  delete next.expires;
  return next as T;
}
