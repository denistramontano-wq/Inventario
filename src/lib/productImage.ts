import { supabase } from './supabase'

const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.82

/**
 * Ridimensiona/comprime una foto (tipicamente scattata da fotocamera, quindi
 * potenzialmente enorme) in JPEG prima dell'upload, per non riempire lo
 * storage e velocizzare il caricamento su rete mobile.
 */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', JPEG_QUALITY)
  })
}

export async function uploadProductImage(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const path = `${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage.from('product-images').upload(path, compressed, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw error

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
