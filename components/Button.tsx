import { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  href?: string
  icon?: ReactNode
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm',
  secondary: 'bg-primary-600 hover:bg-primary-500 text-white',
  outline: 'border border-primary-300 text-primary-200',
  ghost: ' bg-primary-900 hover:text-primary-100 text-primary-200',
  accent: 'bg-accent-500 hover:bg-accent-600 text-primary-800',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-4 py-3 text-base rounded-md',
  lg: 'px-6 py-3 text-lg rounded-md',
}

function ButtonSpinner() {
  return <div className="spinner-mini" />
}

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  icon,
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer whitespace-nowrap',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    loading || disabled ? 'opacity-70 pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href && !loading) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {children}
      </Link>
    )
  }

  return (
    <button className={`${classes} relative`} disabled={loading || disabled} {...props}>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <ButtonSpinner />
        </span>
      )}
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
        {icon}
        {children}
      </span>
    </button>
  )
}
