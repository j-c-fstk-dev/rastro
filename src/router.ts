import { useEffect, useState } from 'react'

export interface Route {
  path: string[]
  params: URLSearchParams
}

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = raw.split('?')
  return { path: path.split('/').filter(Boolean), params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const update = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return route
}

export const go = (path: string) => {
  location.hash = `#/${path}`
}

/** Absolute link to a route, for QR codes and sharing. */
export const absoluteLink = (path: string) => `${location.origin}${location.pathname}#/${path}`
