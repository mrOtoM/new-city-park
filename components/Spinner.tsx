export default function Spinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="spinner" />
      {text && <p className="text-primary-300 text-sm">{text}</p>}
    </div>
  )
}
