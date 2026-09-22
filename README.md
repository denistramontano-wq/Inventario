# Inventario Casa

PWA per gestire l'inventario alimentare di casa: scansione codici a barre,
scadenze, lista della spesa automatica, suggerimenti ricette e statistiche
di spesa.

## Stack

- **Frontend:** React + TypeScript + Vite, installabile come PWA (`vite-plugin-pwa`)
- **Backend:** Supabase (Postgres + Auth + Realtime), Row Level Security per
  isolare i dati di ogni nucleo familiare
- **Catalogo prodotti:** [OpenFoodFacts](https://world.openfoodfacts.org/) via
  lookup codice a barre, con fallback a inserimento manuale
- **Scanner:** `@zxing/browser` (accesso alla fotocamera del dispositivo)

## Funzionalità

- Scansione barcode → riconoscimento automatico prodotto (nome, marca,
  immagine, unità) da OpenFoodFacts
- Inventario per posizione (dispensa, frigo, freezer, cantina)
- Avvisi scadenza (rosso/arancio/giallo in base ai giorni rimanenti) e
  scorte in esaurimento (soglia configurabile per prodotto)
- Lista della spesa manuale + aggiunta automatica dei prodotti in esaurimento
- Suggerimenti ricette in base a cosa hai in casa (percentuale di
  ingredienti disponibili)
- Statistiche di spesa mensile, confronto col mese precedente, spesa per
  categoria, conteggio sprechi
- Nucleo familiare condiviso: più persone vedono e aggiornano lo stesso
  inventario tramite codice invito

## Sviluppo locale

```bash
npm install
cp .env.example .env   # inserisci URL e anon key del tuo progetto Supabase
npm run dev
```

Le variabili d'ambiente richieste:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database

Lo schema (tabelle, RLS, funzioni) è in `supabase/migrations/`. Per
applicarlo a un progetto Supabase puoi usare la Supabase CLI:

```bash
supabase link --project-ref <il-tuo-project-ref>
supabase db push
```

oppure incollare il contenuto dei file SQL nell'SQL Editor della dashboard,
in ordine.

## Build

```bash
npm run build
npm run preview
```

## Note sulla PWA

Le icone in `public/pwa-*.png` sono placeholder a tinta unita: sostituiscile
con il logo dell'app prima di distribuirla. Il manifest e il service worker
sono generati automaticamente da `vite-plugin-pwa` in fase di build.
