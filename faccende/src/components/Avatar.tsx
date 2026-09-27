export function Avatar({
  avatar,
  color,
  size = 36,
  ring = false,
}: {
  avatar: string
  color: string
  size?: number
  ring?: boolean
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${color}, ${color}aa)`,
        fontSize: size * 0.52,
        boxShadow: ring ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${color}` : undefined,
      }}
      aria-hidden
    >
      {avatar}
    </span>
  )
}
