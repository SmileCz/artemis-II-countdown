/**
 * Hybrid Artemis data source
 * - future launches: Launch Library 2
 * - past launches: NASA mission archive
 */

const LL2_BASE = "/api/ll2";
const NASA_MISSION_ENDPOINT = "/api/nasa/wp-json/wp/v2/mission";
const LL2_SEARCH_LIMIT = 20;

const ARTEMIS_MISSIONS = [
  {
    key: "artemis-i",
    label: "Archived Artemis I",
    baseLabel: "Artemis I",
    slug: "artemis-i",
    ll2SearchTerms: ["Artemis I", "Exploration Mission-1", "EM-1"],
    sourceMode: "past",
  },
  {
    key: "artemis-ii",
    label: "Archived Artemis II",
    baseLabel: "Artemis II",
    slug: "artemis-ii",
    ll2SearchTerms: ["Artemis II", "Exploration Mission-2", "EM-2"],
    sourceMode: "past",
  },
  {
    key: "artemis-iii",
    label: "Next Artemis III",
    baseLabel: "Artemis III",
    slug: "artemis-iii",
    ll2SearchTerms: ["Artemis III"],
    sourceMode: "future",
  },
  {
    key: "artemis-iv",
    label: "Future Artemis IV",
    baseLabel: "Artemis IV",
    slug: "artemis-iv",
    ll2SearchTerms: ["Artemis IV"],
    sourceMode: "future",
    allowNasaFutureFallback: true,
  },
];

function parseRetryAfterMs(retryAfter) {
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dt = new Date(retryAfter);
  const ms = dt.getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

async function fetchJson(endpoint, signal, sourceName) {
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {Accept: "application/json"},
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    const retryAfterMs = res.status === 429 ? parseRetryAfterMs(retryAfter) : null;

    const err = new Error(`${sourceName} HTTP ${res.status}`);
    err.status = res.status;
    err.retryAfterMs = retryAfterMs;
    err.retryAfterRaw = retryAfter;
    throw err;
  }

  return res.json();
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMissionOrder(key) {
  const index = ARTEMIS_MISSIONS.findIndex((mission) => mission.key === key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function parseLaunchDate(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (/^\d{4}$/.test(trimmed)) return null;

  const normalized = trimmed.replace(/\b([A-Za-z]{3,})\./g, "$1");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html ?? "", "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function extractLabeledFields(renderedHtml) {
  const doc = new DOMParser().parseFromString(renderedHtml ?? "", "text/html");
  const fields = new Map();

  for (const labelNode of doc.querySelectorAll("p.label")) {
    const label = normalizeText(labelNode.textContent);
    if (!label) continue;

    const container = labelNode.parentElement;
    const valueNode = container?.nextElementSibling;
    const value = valueNode?.textContent?.replace(/\s+/g, " ").trim();
    if (value) {
      fields.set(label, value);
    }
  }

  const summaryCandidates = [
    doc.querySelector(".mission-single-meta .p-lg"),
    doc.querySelector(".hds-mission-header .p-lg"),
  ];

  const summary = summaryCandidates
    .map((node) => node?.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .find(Boolean);

  return {fields, summary: summary ?? null};
}

function getMissionStatus(post) {
  const terms = post?._embedded?.["wp:term"] ?? [];
  return terms[1]?.[0]?.name ?? null;
}

function getMissionType(post, extractedFields) {
  const explicit = extractedFields.fields.get("mission type");
  if (explicit) return explicit;

  const terms = post?._embedded?.["wp:term"] ?? [];
  const missionTypeTerms = terms[2] ?? [];
  if (missionTypeTerms.length === 0) return null;

  return missionTypeTerms.map((term) => term?.name).filter(Boolean).join(", ");
}

function getMissionDateMeta(post) {
  const raw = post?.meta?.nasa_hds_core_meta_mission_date;
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildLl2SearchText(launch) {
  return [
    launch?.name,
    launch?.mission?.name,
    launch?.slug,
    launch?.rocket?.configuration?.full_name,
    launch?.rocket?.configuration?.name,
  ]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
}

function ll2MatchesMission(launch, mission) {
  const text = buildLl2SearchText(launch);
  return mission.ll2SearchTerms.some((term) => text.includes(normalizeText(term)));
}

function toLl2Summary(launch, mission) {
  if (!launch || !mission) return null;

  const image = launch.image?.image_url ?? launch.image?.thumbnail_url ?? null;

  return {
    id: launch.id,
    name: launch.name ?? mission.baseLabel,
    display_name: mission.label,
    mission_key: mission.key,
    mission_name: mission.baseLabel,
    mission_description: launch.mission?.description ?? null,
    mission_type: launch.mission?.type ?? null,
    net: launch.net ?? null,
    launch_label: launch.net ?? null,
    window_start: launch.window_start ?? null,
    window_end: launch.window_end ?? null,
    net_precision: launch.net_precision ?? null,
    last_updated: launch.last_updated ?? null,
    status: launch.status?.name ?? "Future",
    status_abbrev: launch.status?.abbrev ?? launch.status?.name ?? "Future",
    provider: launch.launch_service_provider?.name ?? "NASA",
    rocket:
      launch.rocket?.configuration?.full_name ??
      launch.rocket?.configuration?.name ??
      "Space Launch System (SLS)",
    pad: launch.pad?.name ?? null,
    location: launch.pad?.location?.name ?? null,
    orbit: launch.mission?.orbit?.name ?? null,
    webcast: launch.vid_urls?.[0]?.url ?? null,
    slug: launch.slug ?? mission.slug,
    is_crewed: Boolean(launch?.is_crewed ?? mission.key !== "artemis-i"),
    image,
    source: "ll2",
  };
}

function toNasaSummary(post, mission) {
  if (!post || !mission) return null;

  const extracted = extractLabeledFields(post.content?.rendered ?? "");
  const launchLabel =
    extracted.fields.get("launch") ??
    extracted.fields.get("launched") ??
    null;
  const splashdownLabel = extracted.fields.get("splashdown") ?? null;
  const net = getMissionDateMeta(post) ?? parseLaunchDate(launchLabel);
  const status = getMissionStatus(post) ?? "Past";
  const missionType = getMissionType(post, extracted);
  const image = post.featured_image_url ?? post.featured_image?.file ?? null;
  const description = extracted.summary ?? stripHtml(post.excerpt?.rendered ?? "");

  return {
    id: post.id,
    name: post.title?.rendered ?? mission.baseLabel,
    display_name: mission.label,
    mission_key: mission.key,
    mission_name: mission.baseLabel,
    mission_description: description,
    mission_type: missionType,
    net,
    launch_label: launchLabel,
    window_start: null,
    window_end: splashdownLabel,
    net_precision: launchLabel && /^\d{4}$/.test(launchLabel) ? "year" : null,
    last_updated: post.modified_gmt ?? post.modified ?? null,
    status,
    status_abbrev: status,
    provider: "NASA",
    rocket: "Space Launch System (SLS)",
    pad: null,
    location: null,
    orbit: null,
    webcast: post.link ?? null,
    slug: post.slug ?? mission.slug,
    is_crewed: mission.key !== "artemis-i",
    image,
    source: "nasa",
  };
}

function buildLl2Endpoint(searchTerm) {
  const query = new URLSearchParams({
    search: searchTerm,
    limit: String(LL2_SEARCH_LIMIT),
    ordering: "net",
  });

  return `${LL2_BASE}/launches/upcoming/?${query.toString()}`;
}

function buildNasaMissionEndpoint(slug) {
  const query = new URLSearchParams({
    slug,
    _embed: "1",
    per_page: "1",
  });

  return `${NASA_MISSION_ENDPOINT}?${query.toString()}`;
}

function dedupeById(items) {
  const map = new Map();

  for (const item of items) {
    if (!item?.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

async function fetchFutureMissionFromLl2(mission, signal) {
  const responses = await Promise.all(
    mission.ll2SearchTerms.map((term) => fetchJson(buildLl2Endpoint(term), signal, "LL2"))
  );

  const mergedResults = dedupeById(
    responses.flatMap((json) => (Array.isArray(json?.results) ? json.results : []))
  );

  const candidate = mergedResults
    .filter((launch) => ll2MatchesMission(launch, mission))
    .map((launch) => toLl2Summary(launch, mission))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = new Date(a?.net ?? 0).getTime();
      const bTime = new Date(b?.net ?? 0).getTime();
      return aTime - bTime;
    })[0];

  return candidate ?? null;
}

async function fetchPastMissionFromNasa(mission, signal) {
  const json = await fetchJson(buildNasaMissionEndpoint(mission.slug), signal, "NASA");
  const post = Array.isArray(json) ? json[0] : null;
  if (!post) return null;

  const summary = toNasaSummary(post, mission);
  if (!summary) return null;

  const status = String(summary.status ?? "").toLowerCase();
  if (status === "future" || status === "active") return null;

  return summary;
}

async function fetchMissionFromNasa(mission, signal) {
  const json = await fetchJson(buildNasaMissionEndpoint(mission.slug), signal, "NASA");
  const post = Array.isArray(json) ? json[0] : null;
  if (!post) return null;
  return toNasaSummary(post, mission);
}

function sortByMissionOrder(items) {
  return [...items].sort((a, b) => {
    const missionDiff = getMissionOrder(a.mission_key) - getMissionOrder(b.mission_key);
    if (missionDiff !== 0) return missionDiff;

    const aTime = new Date(a?.net ?? 0).getTime();
    const bTime = new Date(b?.net ?? 0).getTime();
    return aTime - bTime;
  });
}

export async function fetchLaunches(signal) {
  const futureMissions = ARTEMIS_MISSIONS.filter((mission) => mission.sourceMode === "future");
  const pastMissions = ARTEMIS_MISSIONS.filter((mission) => mission.sourceMode === "past");

  const [upcomingRaw, previousRaw] = await Promise.all([
    Promise.all(
      futureMissions.map(async (mission) => {
        const ll2Launch = await fetchFutureMissionFromLl2(mission, signal);
        if (ll2Launch) return ll2Launch;
        if (!mission.allowNasaFutureFallback) return null;

        const nasaLaunch = await fetchMissionFromNasa(mission, signal);
        if (!nasaLaunch) return null;

        return {
          ...nasaLaunch,
          status: "Future",
          status_abbrev: "Future",
        };
      })
    ),
    Promise.all(pastMissions.map((mission) => fetchPastMissionFromNasa(mission, signal))),
  ]);

  const upcomingLaunches = sortByMissionOrder(upcomingRaw.filter(Boolean));
  const previousLaunches = sortByMissionOrder(previousRaw.filter(Boolean));
  const launches = sortByMissionOrder([...previousLaunches, ...upcomingLaunches]);

  const nextLaunch =
    upcomingLaunches.find((launch) => launch.mission_key === "artemis-iii") ??
    upcomingLaunches[0] ??
    previousLaunches[previousLaunches.length - 1] ??
    null;
  if (!nextLaunch) throw new Error("Artemis mise nebyly nalezeny v dostupnych zdrojich.");

  return {
    nextLaunch,
    launches,
    upcomingLaunches,
    previousLaunches,
  };
}
