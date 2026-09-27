import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
import { appConfig } from '@/shared/config/env'
import {
  demoLogin,
  demoLogout,
  getDemoUser,
  setOidcUserManager,
  type AppRole,
  type AppUser,
} from '@/shared/auth/token'

interface AuthContextValue {
  ready: boolean
  isAuthenticated: boolean
  user: AppUser | null
  roles: AppRole[]
  hasRole: (role: AppRole) => boolean
  loginDemo: (username: string, password: string) => void
  loginOidc: () => Promise<void>
  logout: () => Promise<void>
  handleCallback: () => Promise<void>
  mode: 'demo' | 'oidc'
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapOidcUser(user: User): AppUser {
  const profile = user.profile as Record<string, unknown>
  const realmAccess = profile.realm_access as { roles?: string[] } | undefined
  const resourceAccess = profile.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined
  const clientRoles = resourceAccess?.[appConfig.KEYCLOAK_CLIENT_ID]?.roles ?? []
  const roles = new Set<AppRole>()
  for (const role of [...(realmAccess?.roles ?? []), ...clientRoles]) {
    if (role === 'admin' || role === 'dispatcher') roles.add(role)
  }
  if (roles.size === 0) roles.add('dispatcher')
  return {
    username: String(profile.preferred_username ?? profile.email ?? 'user'),
    name: String(profile.name ?? profile.preferred_username ?? 'Пользователь'),
    roles: [...roles],
  }
}

function createUserManager(): UserManager | null {
  if (!appConfig.KEYCLOAK_URL || appConfig.DEMO_AUTH) return null
  const authority = `${appConfig.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${appConfig.KEYCLOAK_REALM}`
  return new UserManager({
    authority,
    client_id: appConfig.KEYCLOAK_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [manager] = useState(() => createUserManager())
  const mode: 'demo' | 'oidc' = manager ? 'oidc' : 'demo'

  useEffect(() => {
    setOidcUserManager(manager)
    let cancelled = false

    async function bootstrap() {
      if (manager) {
        try {
          const oidcUser = await manager.getUser()
          if (!cancelled && oidcUser && !oidcUser.expired) {
            setUser(mapOidcUser(oidcUser))
          }
          manager.events.addUserLoaded((u) => setUser(mapOidcUser(u)))
          manager.events.addUserUnloaded(() => setUser(null))
        } catch {
          /* ignore */
        }
      } else {
        setUser(getDemoUser())
      }
      if (!cancelled) setReady(true)
    }

    void bootstrap()
    return () => {
      cancelled = true
      setOidcUserManager(null)
    }
  }, [manager])

  const loginDemo = useCallback((username: string, password: string) => {
    const session = demoLogin(username, password)
    setUser(session.user)
  }, [])

  const loginOidc = useCallback(async () => {
    if (!manager) throw new Error('OIDC не настроен')
    await manager.signinRedirect()
  }, [manager])

  const logout = useCallback(async () => {
    if (manager) {
      await manager.signoutRedirect()
      return
    }
    demoLogout()
    setUser(null)
  }, [manager])

  const handleCallback = useCallback(async () => {
    if (!manager) return
    const oidcUser = await manager.signinRedirectCallback()
    setUser(mapOidcUser(oidcUser))
  }, [manager])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      isAuthenticated: Boolean(user),
      user,
      roles: user?.roles ?? [],
      hasRole: (role) => Boolean(user?.roles.includes(role)),
      loginDemo,
      loginOidc,
      logout,
      handleCallback,
      mode,
    }),
    [ready, user, loginDemo, loginOidc, logout, handleCallback, mode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
