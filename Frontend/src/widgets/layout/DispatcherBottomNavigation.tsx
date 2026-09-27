import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, type MouseEvent } from 'react'
import { useAuth } from '@/shared/auth/AuthProvider'
import { ADMIN_NAV_ITEM, DISPATCHER_NAV } from '@/widgets/layout/nav'

/** Bottom inset reserved for floating / docked dispatcher nav */
export const DISPATCHER_BOTTOM_NAV_SPACE = {
  xs: '72px',
  md: '88px',
} as const

function NavItemButton({
  path,
  label,
  search,
}: {
  path: string
  label: string
  search: string
}) {
  return (
    <ButtonBase
      component={NavLink}
      to={{ pathname: path, search }}
      aria-label={label}
      sx={{
        flex: { xs: 1, md: '0 0 auto' },
        minWidth: { xs: 0, md: 88 },
        maxWidth: { md: 112 },
        borderRadius: 2,
        px: { xs: 0.35, md: 1.25 },
        py: { xs: 0.85, md: 1 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        textDecoration: 'none',
        transition: 'background-color 0.15s, color 0.15s',
        '&:hover': {
          bgcolor: 'rgba(40, 103, 216, 0.04)',
          color: 'primary.main',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
        '&.active': {
          bgcolor: 'rgba(40, 103, 216, 0.08)',
          color: 'primary.main',
        },
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: { xs: 11, sm: 12, md: 13 },
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </ButtonBase>
  )
}

export function DispatcherBottomNavigation() {
  const { hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isNarrow = useMediaQuery('(max-width:720px)')
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null)

  const isAdmin = hasRole('admin')
  if (!hasRole('dispatcher') && !isAdmin) return null

  const primaryItems = [...DISPATCHER_NAV]
  const overflowItems = isAdmin && isNarrow ? [ADMIN_NAV_ITEM] : []
  const inlineItems =
    isAdmin && !isNarrow ? [...primaryItems, ADMIN_NAV_ITEM] : primaryItems

  const moreOpen = Boolean(moreAnchor)
  const moreActive = overflowItems.some((item) => location.pathname === item.path)

  return (
    <Box
      component="nav"
      aria-label="Навигация"
      sx={{
        position: 'fixed',
        zIndex: (t) => t.zIndex.appBar,
        left: { xs: 0, md: '50%' },
        right: { xs: 0, md: 'auto' },
        bottom: { xs: 0, md: 20 },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        width: { xs: '100%', md: 'auto' },
        maxWidth: { md: 820 },
        px: { xs: 0, md: 1.5 },
        pointerEvents: 'none',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          gap: { xs: 0.25, md: 0.5 },
          px: { xs: 0.75, md: 1.25 },
          py: { xs: 0.75, md: 0.85 },
          minHeight: { xs: 52, md: 56 },
          borderRadius: { xs: '16px 16px 0 0', md: 2.75 },
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: {
            xs: '0 -4px 24px rgba(31, 70, 120, 0.08)',
            md: '0 8px 28px rgba(31, 70, 120, 0.1)',
          },
          width: { xs: '100%', md: 'fit-content' },
          mx: { md: 'auto' },
        }}
      >
        {inlineItems.map((item) => (
          <NavItemButton
            key={item.path}
            path={item.path}
            label={item.label}
            search={location.search}
          />
        ))}

        {overflowItems.length > 0 ? (
          <>
            <ButtonBase
              aria-label="Ещё"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={(e: MouseEvent<HTMLButtonElement>) => setMoreAnchor(e.currentTarget)}
              sx={{
                flex: 1,
                minWidth: 0,
                borderRadius: 2,
                px: 0.35,
                py: 0.85,
                color: moreActive ? 'primary.main' : 'text.secondary',
                bgcolor: moreActive ? 'rgba(40, 103, 216, 0.08)' : 'transparent',
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                }}
              >
                Ещё
              </Typography>
            </ButtonBase>
            <Menu
              anchorEl={moreAnchor}
              open={moreOpen}
              onClose={() => setMoreAnchor(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              {overflowItems.map((item) => (
                <MenuItem
                  key={item.path}
                  selected={location.pathname === item.path}
                  onClick={() => {
                    setMoreAnchor(null)
                    navigate({ pathname: item.path, search: location.search })
                  }}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}
      </Paper>
    </Box>
  )
}
