export interface RoomType {
  id: string
  label: string
  emoji: string
  /** emoji decorative per l'illustrazione della card */
  props: [string, string]
  /** colori del gradiente di sfondo */
  from: string
  to: string
  presets: { name: string; frequency_days: number | null; effort: 1 | 2 | 3 }[]
}

export const ROOM_TYPES: RoomType[] = [
  {
    id: 'cucina', label: 'Cucina', emoji: '🍳', props: ['🧽', '🍽️'], from: '#f97316', to: '#fb7185',
    presets: [
      { name: 'Lavare i piatti', frequency_days: 1, effort: 1 },
      { name: 'Buttare la spazzatura', frequency_days: 2, effort: 1 },
      { name: 'Pulire i fornelli', frequency_days: 3, effort: 2 },
      { name: 'Spazzare il pavimento', frequency_days: 3, effort: 1 },
      { name: 'Lavare il pavimento', frequency_days: 7, effort: 2 },
      { name: 'Pulire il microonde', frequency_days: 14, effort: 1 },
      { name: 'Pulire il frigorifero', frequency_days: 30, effort: 3 },
    ],
  },
  {
    id: 'bagno', label: 'Bagno', emoji: '🛁', props: ['🧴', '🪥'], from: '#06b6d4', to: '#3b82f6',
    presets: [
      { name: 'Pulire il water', frequency_days: 3, effort: 2 },
      { name: 'Lavandino e specchio', frequency_days: 7, effort: 1 },
      { name: 'Pulire doccia o vasca', frequency_days: 7, effort: 3 },
      { name: 'Lavare il pavimento', frequency_days: 7, effort: 2 },
      { name: 'Cambiare gli asciugamani', frequency_days: 7, effort: 1 },
    ],
  },
  {
    id: 'soggiorno', label: 'Soggiorno', emoji: '🛋️', props: ['📺', '🪴'], from: '#8b5cf6', to: '#6366f1',
    presets: [
      { name: 'Riordinare', frequency_days: 2, effort: 1 },
      { name: 'Spolverare i mobili', frequency_days: 7, effort: 2 },
      { name: 'Passare l\'aspirapolvere', frequency_days: 7, effort: 2 },
      { name: 'Pulire i vetri', frequency_days: 30, effort: 3 },
    ],
  },
  {
    id: 'camera', label: 'Camera da letto', emoji: '🛏️', props: ['🪟', '🧸'], from: '#3b82f6', to: '#8b5cf6',
    presets: [
      { name: 'Rifare il letto', frequency_days: 1, effort: 1 },
      { name: 'Cambiare le lenzuola', frequency_days: 14, effort: 2 },
      { name: 'Spolverare', frequency_days: 7, effort: 1 },
      { name: 'Passare l\'aspirapolvere', frequency_days: 7, effort: 2 },
      { name: 'Riordinare l\'armadio', frequency_days: 30, effort: 3 },
    ],
  },
  {
    id: 'lavanderia', label: 'Lavanderia', emoji: '🧺', props: ['👕', '🫧'], from: '#14b8a6', to: '#06b6d4',
    presets: [
      { name: 'Fare il bucato', frequency_days: 3, effort: 2 },
      { name: 'Stirare', frequency_days: 7, effort: 3 },
      { name: 'Pulire la lavatrice', frequency_days: 30, effort: 2 },
    ],
  },
  {
    id: 'ufficio', label: 'Studio', emoji: '💻', props: ['📚', '🖊️'], from: '#64748b', to: '#3b82f6',
    presets: [
      { name: 'Riordinare la scrivania', frequency_days: 7, effort: 1 },
      { name: 'Svuotare il cestino', frequency_days: 7, effort: 1 },
      { name: 'Spolverare', frequency_days: 14, effort: 1 },
    ],
  },
  {
    id: 'ingresso', label: 'Ingresso', emoji: '🚪', props: ['👟', '🔑'], from: '#a16207', to: '#f97316',
    presets: [
      { name: 'Spazzare', frequency_days: 7, effort: 1 },
      { name: 'Riordinare la scarpiera', frequency_days: 30, effort: 2 },
    ],
  },
  {
    id: 'cameretta', label: 'Cameretta', emoji: '🧸', props: ['🎨', '🧩'], from: '#ec4899', to: '#f59e0b',
    presets: [
      { name: 'Riordinare i giochi', frequency_days: 1, effort: 1 },
      { name: 'Cambiare le lenzuola', frequency_days: 14, effort: 2 },
      { name: 'Passare l\'aspirapolvere', frequency_days: 7, effort: 2 },
    ],
  },
  {
    id: 'balcone', label: 'Balcone', emoji: '🪴', props: ['☀️', '🌸'], from: '#22c55e', to: '#14b8a6',
    presets: [
      { name: 'Innaffiare le piante', frequency_days: 3, effort: 1 },
      { name: 'Spazzare', frequency_days: 14, effort: 1 },
      { name: 'Pulire la ringhiera', frequency_days: 90, effort: 2 },
    ],
  },
  {
    id: 'giardino', label: 'Giardino', emoji: '🌳', props: ['🌻', '🦋'], from: '#16a34a', to: '#65a30d',
    presets: [
      { name: 'Innaffiare', frequency_days: 2, effort: 1 },
      { name: 'Tagliare l\'erba', frequency_days: 14, effort: 3 },
      { name: 'Raccogliere le foglie', frequency_days: 14, effort: 2 },
    ],
  },
  {
    id: 'garage', label: 'Garage', emoji: '🚗', props: ['🧰', '📦'], from: '#475569', to: '#0ea5e9',
    presets: [
      { name: 'Spazzare', frequency_days: 30, effort: 2 },
      { name: 'Riordinare gli attrezzi', frequency_days: 90, effort: 3 },
    ],
  },
  {
    id: 'altro', label: 'Altro', emoji: '🏠', props: ['✨', '🧹'], from: '#3b9ee6', to: '#22d3ee',
    presets: [],
  },
]

export function roomType(id: string): RoomType {
  return ROOM_TYPES.find((t) => t.id === id) ?? ROOM_TYPES[ROOM_TYPES.length - 1]
}
