# Faccende di Casa

PWA per tenere traccia delle faccende domestiche e dividerle con chi vive con te.

## Sezioni

- **Casa**: casetta illustrata con la "freschezza" della casa (cambia aspetto
  se trascuri le faccende), serie di giorni consecutivi, cosa fare adesso,
  anelli di avanzamento (oggi / settimana / mese) e le **stanze** con la
  percentuale di freschezza di ciascuna.
- **Calendario**: mese con i giorni in cui hai fatto le faccende (verde) e
  quelle in programma (blu) o in ritardo (rosso), filtrabile per persona.
- **Attività**: faccende da fare (in ritardo, oggi, prossimi 7 giorni, più
  avanti) e fatte (griglia settimanale per stanza + storico, con annulla).
- **Profilo**: nome/avatar, livello e punti, classifica settimanale della casa,
  codice invito per condividere la casa, divisione equa automatica delle
  faccende tra i membri, cambio/creazione casa.

La freschezza di una faccenda parte dal 100% quando la fai, scende al 40% il
giorno della scadenza e arriva a 0% dopo un altro periodo intero di ritardo.
Ogni faccenda vale 5 / 10 / 20 punti in base all'impegno.

## Backend

Usa **lo stesso progetto Supabase dell'app Inventario** (stessi account e
stesse case / codici invito). Serve applicare la migration
`../supabase/migrations/00000000000012_chores.sql`.

Le variabili `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` vengono lette dal
`.env` nella root del repo. **Senza variabili l'app funziona in modalità
locale**: dati salvati nel browser, una sola persona, niente condivisione.

## Sviluppo

```bash
cd faccende
npm install
npm run dev
npm run build
```
