/**
 * Launch Library 2 (The Space Devs)
 * Frontend volá /api/ll2/... (Nginx/Vite proxy řeší CORS a prostředí)
 */

const ENDPOINT =
  "/api/ll2/launches/upcoming/?search=Artemis%20II&limit=20&ordering=net";

const LL2_ORIGIN = "https://ll.thespacedevs.com";

function toAbsoluteLl2Url(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${LL2_ORIGIN}${url}`;
  return `${LL2_ORIGIN}/${url}`;
}

function parseRetryAfterMs(retryAfter) {
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dt = new Date(retryAfter);
  const ms = dt.getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

function pickArtemisII(results) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const scored = results
    .map((x) => {
      const name = (x?.name ?? "").toLowerCase();
      const isArtemis = name.includes("artemis") && name.includes("ii");
      const isCrewed =
        Boolean(x?.mission?.type?.toLowerCase?.().includes("crewed")) ||
        Boolean(x?.is_crewed);
      const status = x?.status?.name ?? "";
      const score =
        (isArtemis ? 100 : 0) +
        (isCrewed ? 10 : 0) +
        (status.toLowerCase().includes("go") ? 1 : 0);
      return { x, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.x ?? null;
}

export async function fetchArtemisII(signal) {
  const res = await fetch(ENDPOINT, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    const retryAfterMs = res.status === 429 ? parseRetryAfterMs(retryAfter) : null;

    const err = new Error(`LL2 HTTP ${res.status}`);
    err.status = res.status;
    err.retryAfterMs = retryAfterMs;
    err.retryAfterRaw = retryAfter;
    throw err;
  }

  const json = await res.json();
  const launch = pickArtemisII(json?.results ?? []);
  if (!launch) throw new Error("Artemis II nebyla nalezena ve výsledcích.");

  const image = launch.image?.image_url ?? launch.image?.thumbnail_url ?? null;

  return {
    id: launch.id,
    name: launch.name,
    net: launch.net,
    window_start: launch.window_start,
    window_end: launch.window_end,
    net_precision: launch.net_precision,
    last_updated: launch.last_updated,
    status: launch.status?.name ?? null,
    provider: launch.launch_service_provider?.name ?? null,
    rocket:
      launch.rocket?.configuration?.full_name ??
      launch.rocket?.configuration?.name ??
      null,
    pad: launch.pad?.name ?? null,
    location: launch.pad?.location?.name ?? null,
    image,
    url: toAbsoluteLl2Url(launch.url) ?? toAbsoluteLl2Url(`/2.3.0/launch/${launch.id}/`),
  };
}
