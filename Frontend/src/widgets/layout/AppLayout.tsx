import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import {
  FiltersDrawerProvider,
  useFiltersDrawer,
} from '@/shared/layout/FiltersDrawerContext'
import { Icon } from '@/shared/ui/Icon'
import { AppTopBar } from '@/widgets/layout/AppTopBar'
import {
  DispatcherBottomNavigation,
  DISPATCHER_BOTTOM_NAV_SPACE,
} from '@/widgets/layout/DispatcherBottomNavigation'
import { FiltersPanel } from '@/widgets/filters/FiltersPanel'
import { useAuth } from '@/shared/auth/AuthProvider'

export const FILTERS_SIDEBAR_WIDTH = 300

function LayoutShell({ children }: { children?: ReactNode }) {
  const { mobileOpen, setMobileOpen } = useFiltersDrawer()
  const { hasRole } = useAuth()
  const showBottomNav = hasRole('dispatcher') || hasRole('admin')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        height: '100dvh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppTopBar />

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: FILTERS_SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            p: 0,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            Параметры прогноза
          </Typography>
          <IconButton size="small" onClick={() => setMobileOpen(false)} aria-label="Закрыть">
            <Icon icon={Cancel01Icon} size={18} />
          </IconButton>
        </Stack>
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          <FiltersPanel variant="drawer" onApply={() => setMobileOpen(false)} />
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          pb: showBottomNav ? DISPATCHER_BOTTOM_NAV_SPACE : 0,
        }}
      >
        {children ?? <Outlet />}
      </Box>

      {showBottomNav ? <DispatcherBottomNavigation /> : null}
    </Box>
  )
}

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <FiltersDrawerProvider>
      <LayoutShell>{children}</LayoutShell>
    </FiltersDrawerProvider>
  )
}
