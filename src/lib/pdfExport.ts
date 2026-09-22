import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMoney } from './currency'
import { LOCATION_LABELS } from './types'
import type { Household, InventoryItemWithProduct } from './types'

const GREEN: [number, number, number] = [22, 163, 74]
const GRAY: [number, number, number] = [107, 114, 128]
const RED: [number, number, number] = [220, 38, 38]
const ORANGE: [number, number, number] = [234, 88, 12]

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86_400_000)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function generateInventoryPdf(household: Household, items: InventoryItemWithProduct[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  // --- Intestazione ---
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Inventario di casa', margin, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(household.name, margin, 22)

  const generatedOn = new Date().toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  doc.setFontSize(9)
  doc.text(`Generato il ${generatedOn}`, pageWidth - margin, 22, { align: 'right' })

  let y = 36

  // --- Riepilogo ---
  const valueByCurrency: Record<string, number> = {}
  for (const item of items) {
    if (item.price != null) valueByCurrency[item.currency] = (valueByCurrency[item.currency] ?? 0) + item.price
  }
  const valueText =
    Object.entries(valueByCurrency).length > 0
      ? Object.entries(valueByCurrency)
          .map(([c, v]) => formatMoney(v, c))
          .join(' · ')
      : '—'

  const expiringSoon = items.filter((i) => i.expiry_date && daysUntil(i.expiry_date) <= 7 && daysUntil(i.expiry_date) >= 0).length
  const expired = items.filter((i) => i.expiry_date && daysUntil(i.expiry_date) < 0).length

  doc.setTextColor(...GRAY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`${items.length}`, margin, y)
  doc.text(`${valueText}`, margin + 45, y)
  doc.text(`${expiringSoon}`, margin + 110, y)
  doc.text(`${expired}`, margin + 150, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('prodotti totali', margin, y + 4)
  doc.text('valore stimato', margin + 45, y + 4)
  doc.text('in scadenza (7gg)', margin + 110, y + 4)
  doc.text('scaduti', margin + 150, y + 4)

  y += 12
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // --- Tabelle per posizione ---
  const locationOrder = ['dispensa', 'frigo', 'freezer', 'cantina', 'altro']
  const byLocation = new Map<string, InventoryItemWithProduct[]>()
  for (const item of items) {
    const loc = item.location ?? 'altro'
    if (!byLocation.has(loc)) byLocation.set(loc, [])
    byLocation.get(loc)!.push(item)
  }

  for (const loc of locationOrder) {
    const locItems = byLocation.get(loc)
    if (!locItems || locItems.length === 0) continue

    locItems.sort((a, b) => a.product.name.localeCompare(b.product.name))

    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage()
      y = 20
    }

    doc.setTextColor(...GREEN)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(LOCATION_LABELS[loc] ?? loc, margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Prodotto', 'Marca', 'Quantità', 'Scadenza', 'Prezzo']],
      body: locItems.map((item) => [
        item.product.name,
        item.product.brand ?? '—',
        `${item.quantity} ${item.unit}`,
        item.expiry_date ? formatDate(item.expiry_date) : '—',
        item.price != null ? formatMoney(item.price, item.currency) : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [246, 250, 247] },
      didParseCell: (data) => {
        if (data.section !== 'body') return
        const item = locItems[data.row.index]
        if (!item.expiry_date) return
        const days = daysUntil(item.expiry_date)
        if (days < 0) {
          data.cell.styles.textColor = RED
        } else if (days <= 7) {
          data.cell.styles.textColor = ORANGE
        }
      },
    })

    // @ts-expect-error - jspdf-autotable estende jsPDF con lastAutoTable a runtime
    y = doc.lastAutoTable.finalY + 10
  }

  // --- Numero di pagina ---
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, {
      align: 'right',
    })
  }

  const fileDate = new Date().toISOString().slice(0, 10)
  doc.save(`inventario-${fileDate}.pdf`)
}
