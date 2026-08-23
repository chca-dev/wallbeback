type PageHeadingProps = {
  eyebrow?: string
  title: string
  accent?: string
  description?: string
}

export const PageHeading = ({ eyebrow, title, accent, description }: PageHeadingProps) => (
  <header className="mb-[34px] min-[821px]:mb-[46px]">
    {eyebrow ? (
      <div className="flex items-center gap-[9px] font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
        <span className="h-px w-[26px] bg-secondary" />
        {eyebrow}
      </div>
    ) : null}
    <h1 className="mb-3 mt-[14px] font-display text-[40px] font-semibold leading-none tracking-[-0.045em] min-[521px]:text-[44px] min-[821px]:text-[clamp(40px,5vw,60px)]">
      {title}
      {accent ? (
        <>
          <br />
          <span className="text-primary">{accent}</span>
        </>
      ) : null}
    </h1>
    {description ? <p className="max-w-[420px] text-sm leading-[1.65] text-muted">{description}</p> : null}
  </header>
)
