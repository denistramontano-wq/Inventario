import { useEffect, type ReactNode } from 'react'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border-t border-line bg-card px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <h2 className="mb-4 text-xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
