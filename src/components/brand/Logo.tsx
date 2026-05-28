interface LogoProps {
  className?: string
}

// Calendar with a coral accent dot — used in headers and as the favicon source.
export function Logo({ className = 'w-7 h-7' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        className="stroke-teal-600"
        strokeWidth="2"
      />
      <line x1="8" y1="3" x2="8" y2="7" className="stroke-teal-600" strokeWidth="2" />
      <line x1="16" y1="3" x2="16" y2="7" className="stroke-teal-600" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" className="stroke-teal-600" strokeWidth="2" />
      <circle cx="16.5" cy="15.5" r="2" className="fill-[#ff7e6b]" />
    </svg>
  )
}

interface BrandProps {
  className?: string
  logoClassName?: string
  textClassName?: string
}

// Logo + wordmark, side-by-side. The wordmark is optional via textClassName="hidden".
export function Brand({
  className = 'flex items-center gap-2',
  logoClassName = 'w-7 h-7',
  textClassName = 'text-base font-semibold tracking-tight',
}: BrandProps) {
  return (
    <div className={className}>
      <Logo className={logoClassName} />
      <span className={textClassName}>Event Planner</span>
    </div>
  )
}
