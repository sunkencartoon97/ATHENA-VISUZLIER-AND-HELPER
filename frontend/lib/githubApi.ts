const GITHUB_API = 'https://api.github.com'

type Json = Record<string, unknown>

let authHeader: string | undefined

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${detail || res.statusText}`)
  }

  return (await res.json()) as T
}

export const GitHubApi = {
  auth(token?: string) {
    authHeader = token ? `token ${token}` : undefined
    return Promise.resolve(authHeader)
  },
  createGist(body: Json) {
    return request<Json>('/gists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  editGist(id: string, body: Json) {
    return request<Json>(`/gists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  getGist(id: string) {
    return request<Json>(`/gists/${id}`)
  },
}

