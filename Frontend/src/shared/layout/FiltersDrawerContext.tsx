import useMediaQuery from '@mui/material/useMediaQuery'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface FiltersDrawerContextValue {
  /** Mobile / tablet temporary drawer */
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  /** Desktop persistent sidebar */
  desktopOpen: boolean
  setDesktopOpen: (open: boolean) => void
  /** Toggle the relevant panel for current breakpoint */
  toggle: () => void
  openFilters: () => void
  closeFilters: () => void
}

const FiltersDrawerContext = createContext<FiltersDrawerContextValue>({
  mobileOpen: false,
  setMobileOpen: () => undefined,
  desktopOpen: true,
  setDesktopOpen: () => undefined,
  toggle: () => undefined,
  openFilters: () => undefined,
  closeFilters: () => undefined,
})

export function FiltersDrawerProvider({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width:1200px)')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(true)

  const toggle = useCallback(() => {
    if (isDesktop) setDesktopOpen((v) => !v)
    else setMobileOpen((v) => !v)
  }, [isDesktop])

  const openFilters = useCallback(() => {
    if (isDesktop) setDesktopOpen(true)
    else setMobileOpen(true)
  }, [isDesktop])

  const closeFilters = useCallback(() => {
    if (isDesktop) setDesktopOpen(false)
    else setMobileOpen(false)
  }, [isDesktop])

  const value = useMemo(
    () => ({
      mobileOpen,
      setMobileOpen,
      desktopOpen,
      setDesktopOpen,
      toggle,
      openFilters,
      closeFilters,
    }),
    [mobileOpen, desktopOpen, toggle, openFilters, closeFilters],
  )

  return (
    <FiltersDrawerContext.Provider value={value}>{children}</FiltersDrawerContext.Provider>
  )
}

export function useFiltersDrawer() {
  return useContext(FiltersDrawerContext)
}
