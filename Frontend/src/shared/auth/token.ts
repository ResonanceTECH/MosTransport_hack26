const DEMO_TOKEN_KEY = 'mt.demo.token'
const DEMO_USER_KEY = 'mt.demo.user'

export type AppRole = 'dispatcher' | 'admin'

export interface AppUser {
  username: string
  name: string
  roles: AppRole[]
}

export interface DemoSession {
  token: string
  user: AppUser
}

const DEMO_USERS: Record<string, { password: string; user: AppUser }> = {
  demo_dispatcher: {
    password: 'dispatcher',
    user: {
      username: 'demo_dispatcher',
      name: 'Иван Петров',
      roles: ['dispatcher'],
    },
  },
  demo_admin: {
    password: 'admin',
    user: {
      username: 'demo_admin',
      name: 'Администратор',
      roles: ['dispatcher', 'admin'],
    },
  },
}

let oidcUserManager: import('oidc-client-ts').UserManager | null = null

export function setOidcUserManager(manager: import('oidc-client-ts').UserManager | null) {
  oidcUserManager = manager
}

export async function getAccessToken(): Promise<string | null> {
  if (oidcUserManager) {
    const user = await oidcUserManager.getUser()
    if (user && !user.expired && user.access_token) return user.access_token
  }
  return localStorage.getItem(DEMO_TOKEN_KEY)
}

export function getDemoUser(): AppUser | null {
  const raw = localStorage.getItem(DEMO_USER_KEY)
  if (!raw) return null
  try {
    const stored = JSON.parse(raw) as AppUser
    const canonical = DEMO_USERS[stored.username]?.user
    if (canonical) {
      // Keep display name / roles in sync with DEMO_USERS (stale localStorage after code changes)
      if (
        stored.name !== canonical.name ||
        JSON.stringify(stored.roles) !== JSON.stringify(canonical.roles)
      ) {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(canonical))
      }
      return canonical
    }
    return stored
  } catch {
    return null
  }
}

export function demoLogin(username: string, password: string): DemoSession {
  const entry = DEMO_USERS[username]
  if (!entry || entry.password !== password) {
    throw new Error('Неверный логин или пароль')
  }
  const token = `demo.${username}.${Date.now()}`
  localStorage.setItem(DEMO_TOKEN_KEY, token)
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(entry.user))
  return { token, user: entry.user }
}

export function demoLogout() {
  localStorage.removeItem(DEMO_TOKEN_KEY)
  localStorage.removeItem(DEMO_USER_KEY)
}

export async function refreshAccessToken(): Promise<boolean> {
  if (oidcUserManager) {
    try {
      const user = await oidcUserManager.signinSilent()
      return Boolean(user?.access_token)
    } catch {
      return false
    }
  }
  return Boolean(localStorage.getItem(DEMO_TOKEN_KEY))
}

export async function forceLogin(): Promise<void> {
  demoLogout()
  if (oidcUserManager) {
    await oidcUserManager.signinRedirect()
    return
  }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  }
}

export { DEMO_USERS }
