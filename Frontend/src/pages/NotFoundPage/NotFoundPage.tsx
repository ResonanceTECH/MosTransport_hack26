import { useEffect } from 'react'
import { Box } from '@mui/material'
import { NotFoundContent } from '@/components/errors/NotFoundContent'
import { NotFoundIllustration } from '@/components/errors/NotFoundIllustration'
import { NotFoundHeader } from './NotFoundHeader'
import { mainSx, pageRootSx } from './NotFoundPage.styles'

export function NotFoundPage() {
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => {
      if (mq.matches) {
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
      } else {
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <Box component="main" sx={pageRootSx}>
      <NotFoundHeader />

      <Box sx={mainSx}>
        <NotFoundContent />
        <NotFoundIllustration />
      </Box>
    </Box>
  )
}
