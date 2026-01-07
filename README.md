# Artemis II Countdown (React + Docker + Portainer)

Malá React SPA stránka s odpočtem startu mise Artemis II.

- Odpočet se počítá z aktuálního termínu, který se pravidelně stahuje z Launch Library 2 (The Space Devs).
- Kvůli CORS se API tahá přes Nginx reverse proxy v tom samém containeru (`/api/ll2/...`).
- UI je schválně jednoduché, rychlé a hezké.

## Lokální spuštění

```bash
npm i
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker build -t artemis-ii-countdown:local .
docker run --rm -p 8080:80 artemis-ii-countdown:local
```

Pak otevři http://localhost:8080

## Poznámka k datům

Oficiální NASA stránky často uvádí jen orientační datum nebo „no later than“.
Pro praktický odpočet používáme Launch Library 2, která vede konkrétní NET čas a `last_updated`.


## Dev poznámka (Vite)

`/api/ll2/...` funguje i při `npm run dev` díky proxy nastavení ve `vite.config.js`.
