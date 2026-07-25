export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b py-6 first:pt-0 last:border-b-0">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-pretty">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}
