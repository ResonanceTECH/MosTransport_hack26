import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from '@hugeicons/react'

export type IconProps = Omit<HugeiconsIconProps, 'icon'> & {
  icon: IconSvgElement
}

export function Icon({ icon, size = 20, strokeWidth = 1.5, ...rest }: IconProps) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} {...rest} />
}
