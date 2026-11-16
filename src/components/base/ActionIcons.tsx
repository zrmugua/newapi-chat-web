import type { SVGProps } from 'react'

const Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  />
)

export const ExpandIcon = () => (
  <Icon>
    <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
  </Icon>
)
export const CollapseIcon = () => (
  <Icon>
    <path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5" />
  </Icon>
)
export const CodeIcon = () => (
  <Icon>
    <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14" />
  </Icon>
)
export const PreviewIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M3 9h18m-14-3h.01M10 6h.01" />
  </Icon>
)
export const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const InputTokensIcon = () => (
  <Icon>
    <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
  </Icon>
)
export const OutputTokensIcon = () => (
  <Icon>
    <path d="M12 15V3m-4 4 4-4 4 4M5 16v4h14v-4" />
  </Icon>
)
