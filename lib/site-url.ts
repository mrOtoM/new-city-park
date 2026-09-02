/**
 * NEXT_PUBLIC_SITE_URL builds every auth redirect. Interpolating it unchecked
 * turns a missing value into "undefined/auth/callback", which breaks password
 * resets with no error anywhere. This fails loudly instead.
 */
export function siteOrigin(value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  if (!value) throw new Error('NEXT_PUBLIC_SITE_URL nie je nastavené')

  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL nie je platná URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL musí používať http alebo https')
  }

  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new Error('NEXT_PUBLIC_SITE_URL musí byť samotný pôvod, bez cesty a parametrov')
  }

  return parsed.origin
}

/** The only approved OAuth and recovery destination. */
export function authCallbackUrl(params: Record<string, string> = {}, origin: string = siteOrigin()): string {
  const url = new URL('/auth/callback', origin)

  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  return url.toString()
}
