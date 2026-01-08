# Artemis II Countdown (React + Docker + Portainer)

Malá React SPA stránka s odpočtem startu mise Artemis II.

## Co umí
- Odpočet v reálném čase.
- Automaticky stahuje aktuální termín z Launch Library 2.
- V dev režimu používá **lldev** (nižší šance na limit), v produkci **ll**.
- Při **HTTP 429** klient respektuje `Retry-After` a dočasně přestane dotazovat.
- Nginx v produkčním kontejneru má **cache** a při 429 umí **fallback na lldev** (sdílené pro všechny uživatele na stejném serveru).
- Časy jsou lidsky čitelné včetně časové zóny (SEČ/UTC).
- Odkaz „Detail v Launch Library“ vždy míří na absolutní URL.
- Obrázek se zobrazí jen když je `https://` (aby nevznikal mixed content).

## Lokální vývoj
```bash
npm i
npm run dev
```

## Docker
```bash
docker build -t smilecz/artemis-ii-countdown:local .
docker run --rm -p 8080:80 smilecz/artemis-ii-countdown:local
```

## Portainer
V `portainer-stack.yml` je připravený compose stack s Traefik labels a redirectem z HTTP na HTTPS.
Očekává se externí síť `edge`.
