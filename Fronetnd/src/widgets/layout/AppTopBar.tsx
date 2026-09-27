import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import {
  ArrowDown01Icon,
  FilterHorizontalIcon,
  Logout01Icon,
  Moon02Icon,
  Settings01Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { AppLogo } from '@/components/branding/AppLogo'
import { useAuth } from '@/shared/auth/AuthProvider'
import { useFiltersDrawer } from '@/shared/layout/FiltersDrawerContext'
import { useColorMode } from '@/shared/theme/ColorModeProvider'
import { Icon } from '@/shared/ui/Icon'

const ROLE_LABELS = {
  dispatcher: 'Диспетчер',
  admin: 'Администратор',
} as const

const bentoSx = {
  display: 'flex',
  alignItems: 'center',
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2.5,
  boxShadow: '0 4px 18px rgba(31, 70, 120, 0.05)',
  minHeight: 48,
} as const

function Bento({
  children,
  sx,
  onClick,
}: {
  children: ReactNode
  sx?: object
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <Paper elevation={0} onClick={onClick} sx={{ ...bentoSx, ...sx }}>
      {children}
    </Paper>
  )
}

export function AppTopBar() {
  const { user, roles, hasRole, logout } = useAuth()
  const { mode, toggleColorMode } = useColorMode()
  const { toggle: toggleFilters, desktopOpen, mobileOpen } = useFiltersDrawer()
  const isDesktop = useMediaQuery('(min-width:1200px)')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const primaryRole = roles.includes('admin')
    ? 'admin'
    : roles.includes('dispatcher')
      ? 'dispatcher'
      : null

  const displayName = user?.name ?? user?.username ?? 'Иван Петров'
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] : 'Диспетчер'

  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const filtersActive = isDesktop ? desktopOpen : mobileOpen

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 1.25 },
        px: { xs: 1.25, md: 1.75 },
        pt: { xs: 1.25, md: 1.5 },
        pb: { xs: 0.75, md: 1 },
        flexShrink: 0,
        bgcolor: 'transparent',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
        <Bento sx={{ p: 0.25 }}>
          <Tooltip title={filtersActive ? 'Скрыть параметры' : 'Показать параметры'}>
            <IconButton
              onClick={toggleFilters}
              aria-label={
                filtersActive ? 'Скрыть параметры прогноза' : 'Показать параметры прогноза'
              }
              aria-pressed={filtersActive}
              sx={{
                width: 40,
                height: 40,
                bgcolor: filtersActive ? 'rgba(40, 103, 216, 0.08)' : 'transparent',
                color: filtersActive ? 'primary.main' : 'text.secondary',
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(40, 103, 216, 0.12)' },
              }}
            >
              <Icon icon={FilterHorizontalIcon} size={20} />
            </IconButton>
          </Tooltip>
        </Bento>

        <Bento
          sx={{
            display: { xs: 'none', sm: 'flex' },
            px: 1.5,
            py: 0.75,
          }}
        >
          <AppLogo variant="header" />
        </Bento>
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
        <Bento sx={{ p: 0.25 }}>
          <Tooltip title={mode === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
            <IconButton
              onClick={toggleColorMode}
              aria-label="Переключить тему"
              size="small"
              sx={{ width: 40, height: 40, borderRadius: 2, color: 'text.secondary' }}
            >
              <Icon icon={mode === 'light' ? Sun03Icon : Moon02Icon} size={20} />
            </IconButton>
          </Tooltip>
        </Bento>

        <Bento
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            cursor: 'pointer',
            gap: 1,
            pl: 0.75,
            pr: { xs: 1, sm: 1.25 },
            py: 0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'primary.main',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap lineHeight={1.2}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {roleLabel}
            </Typography>
          </Box>
          <Icon icon={ArrowDown01Icon} size={16} color="currentColor" />
        </Bento>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {hasRole('admin') ? (
          <MenuItem
            component={RouterLink}
            to="/admin/system"
            onClick={() => setAnchorEl(null)}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon icon={Settings01Icon} size={16} />
              <span>Система</span>
            </Stack>
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            setAnchorEl(null)
            void logout()
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon icon={Logout01Icon} size={16} />
            <span>Выйти</span>
          </Stack>
        </MenuItem>
      </Menu>
    </Box>
  )
}
