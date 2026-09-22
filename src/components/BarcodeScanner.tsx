import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls
        if (result && !cancelled) {
          cancelled = true
          controls.stop()
          onDetected(result.getText())
        }
      })
      .catch((err) => {
        setError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.')
        console.error(err)
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-medium">Inquadra il codice a barre</span>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
        >
          Chiudi
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-64 rounded-lg border-2 border-green-400/80" />
        </div>
      </div>
      {error && (
        <div className="bg-red-600 p-3 text-center text-sm text-white">{error}</div>
      )}
    </div>
  )
}
