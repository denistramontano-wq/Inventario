function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length]
}

const daySeed = () => Math.floor(Date.now() / 86_400_000)

export function mascotLine(opts: { freshness: number | null; doneToday: number; dueToday: number; streak: number }): string {
  const { freshness, doneToday, dueToday, streak } = opts
  const seed = daySeed() + doneToday
  if (freshness === null) return 'Aggiungi una stanza e iniziamo!'
  if (dueToday > 0 && doneToday === 0) {
    return pick(
      [
        'Una faccenda sola e sei già in pista.',
        'Dieci minuti adesso, relax dopo.',
        'Partiamo dalla più facile?',
        'La casa ti aspetta, io tifo per te!',
      ],
      seed,
    )
  }
  if (dueToday > 0 && doneToday === 1) return 'Prima fatta. Il difficile è passato.'
  if (dueToday > 0) return pick(['Stai andando alla grande!', 'Ancora poche e hai finito.', 'Che ritmo!'], seed)
  if (doneToday > 0) return pick(['Tutto fatto per oggi. Goditi la casa!', 'Casa splendente, missione compiuta ✨'], seed)
  if (streak >= 3) return `${streak} giorni di fila: sei inarrestabile!`
  if (freshness >= 0.8) return pick(['Oggi niente in scadenza. Casa super fresca!', 'Tutto in ordine, respira.'], seed)
  return 'Niente di urgente oggi: vuoi portarti avanti?'
}

export function completionCheer(points: number): string {
  return pick(
    [`+${points} punti! Ottimo lavoro`, `+${points}! Casa più fresca`, `+${points} punti, grande!`, `Fatto! +${points}`],
    Date.now(),
  )
}
