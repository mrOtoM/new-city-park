export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-primary-800/60 animate-pulse rounded ${className}`} />
}
