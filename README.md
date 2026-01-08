# Artemis II Countdown (React + Docker + Portainer)

Jednoduchá React SPA stránka s odpočtem startu mise Artemis II. Datum startu se automaticky aktualizuje z Launch Library 2 a je připravená pro nasazení za Traefik na doméně `artemis.gearground.cloud`.

## Co umí
- Odpočet v reálném čase.
- Průběžně načítá aktuální termín z Launch Library 2 (přes `/api/ll2/...`).
- V dev režimu se má používat `lldev` (nižší šance na limit), v produkci `ll`.
- Při HTTP 429 respektuje `Retry-After` a dočasně přestane dotazovat.
- Produkční Nginx má cache pro LL2 volání (a může mít i fallback na `lldev`, pokud je zapnutý v `nginx.conf`).

Poznámka: Tlačítko „Detail“ je záměrně odstraněné, aby se už nikdy neřešilo přesměrování na API nebo relativní URL.

## Lokální vývoj
```bash
npm i
npm run dev
```

Otevři `http://localhost:5173`.

## Lokální Docker build a test
```bash
docker build -t artemis-ii-countdown:local .
docker run --rm -p 8080:80 artemis-ii-countdown:local
```

Otevři `http://localhost:8080`.

## Build a push do registry (Docker Hub nebo vlastní registry)

Níže jsou příklady s názvem image, ze kterého je hned jasné, co běží:
- `gearground/ll2-artemis-ii-countdown`

### Varianta A: Docker Hub
1) Login:
```bash
docker login
```

2) Nastav název a tag:
```bash
export IMAGE=gearground/ll2-artemis-ii-countdown
export TAG=latest
```

3) Build:
```bash
docker build -t ${IMAGE}:${TAG} .
```

4) Push:
```bash
docker push ${IMAGE}:${TAG}
```

### Varianta B: Vlastní registry (příklad `registry.gearground.cloud`)
1) Login:
```bash
docker login registry.gearground.cloud
```

2) Nastav image do registry:
```bash
export REGISTRY=registry.gearground.cloud
export IMAGE=${REGISTRY}/gearground/ll2-artemis-ii-countdown
export TAG=latest
```

3) Build:
```bash
docker build -t ${IMAGE}:${TAG} .
```

4) Push:
```bash
docker push ${IMAGE}:${TAG}
```

Tip: Místo `latest` používej verzované tagy, například `2026.01.08` a `latest` nech jen jako „alias“ na poslední stabilní build.

## Portainer + Traefik (stack)
V `portainer-stack.yml` nastav image na tu, kterou jsi pushnul:

```yaml
services:
  artemis_countdown:
    image: registry.gearground.cloud/gearground/ll2-artemis-ii-countdown:latest
```

Potom v Portaineru stack redeployni.

### Poznámky
- Očekává se externí síť `edge`.
- Traefik routuje `artemis.gearground.cloud` na port 80 v kontejneru.
- Redirect HTTP → HTTPS řeší Traefik labels v `portainer-stack.yml`.
