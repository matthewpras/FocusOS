export function PageHeader({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/35">
          Focus OS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
      </div>
      <p className="max-w-md text-sm leading-6 text-white/50">{detail}</p>
    </header>
  )
}
