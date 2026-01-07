/**
 * Launch Library 2 (The Space Devs)
 * Používáme Nginx proxy kvůli CORS: /api/ll2/... -> https://ll.thespacedevs.com/2.3.0/...
 */

const ENDPOINT =
  "/api/ll2/launches/upcoming/?search=Artemis%20II&limit=20&ordering=net";

function pickArtemisII(results) {
  if (!Array.isArray(results) || results.length === 0) return null;

  // Priorita: název obsahuje "Artemis II" a je to crewed
  const scored = results
    .map((x) => {
      const name = (x?.name ?? "").toLowerCase();
      const isArtemis = name.includes("artemis") && name.includes("ii");
      const isCrewed = Boolean(x?.mission?.type?.toLowerCase?.().includes("crewed")) || Boolean(x?.is_crewed);
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
    throw new Error(`LL2 HTTP ${res.status}`);
  }

  const json = await res.json();
  const launch = pickArtemisII(json?.results ?? []);
  if (!launch) throw new Error("Artemis II nebyla nalezena ve výsledcích.");

  return {
    id: launch.id,
    name: launch.name,
    net: launch.net, // ISO string
    window_start: launch.window_start,
    window_end: launch.window_end,
    net_precision: launch.net_precision, // někdy null
    last_updated: launch.last_updated,
    status: launch.status?.name ?? null,
    provider: launch.launch_service_provider?.name ?? null,
    rocket: launch.rocket?.configuration?.full_name ?? launch.rocket?.configuration?.name ?? null,
    pad: launch.pad?.name ?? null,
    location: launch.pad?.location?.name ?? null,
    image: launch.image?.image_url ?? launch.image?.thumbnail_url ?? null,
    url: launch.url ?? null,
  };
}
