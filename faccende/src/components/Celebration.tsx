import { useMemo } from 'react'
import { useHome } from '../contexts/HomeContext'

const COLORS = ['#3b9ee6', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#fb923c']

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (seed % 7)
        const dist = 110 + ((i * 37 + seed) % 120)
        return {
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist - 60}px`,
          rot: `${(i * 97) % 720}deg`,
          color: COLORS[i % COLORS.length],
          delay: `${(i % 6) * 18}ms`,
        }
      }),
    [seed],
  )
  return (
    <div className="pointer-events-none fixed top-1/2 left-1/2 z-[60]">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              background: p.color,
              animationDelay: p.delay,
              '--dx': p.dx,
              '--dy': p.dy,
              '--rot': p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

export function Celebration() {
  const { cheer } = useHome()
  if (!cheer) return null
  return (
    <>
      <Confetti key={cheer.id} seed={cheer.id} />
      <div
        key={`t${cheer.id}`}
        className="animate-pop pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-[60] flex justify-center"
      >
        <div className="rounded-full bg-good px-5 py-2.5 text-base font-extrabold text-black shadow-lg shadow-good/30">
          🎉 {cheer.text}
        </div>
      </div>
    </>
  )
}
