import {useEffect, useMemo, useRef, useState} from "react";
import {ARTEMIS_FALLBACKS} from "./artemisContent.js";
import {fetchLaunches} from "./ll2.js";
import {formatDateTimeHumanCZ, splitCountdown} from "./time.js";
import {getLaunchDate, getMissionLabel, isPastMission} from "./artemisView.js";

const REFRESH_MS = 60 * 60 * 1000;
const TICK_MS = 250;

function useInterval(cb, delay) {
  const saved = useRef(cb);

  useEffect(() => {
    saved.current = cb;
  }, [cb]);

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useArtemisApp() {
  const [data, setData] = useState(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [changeNote, setChangeNote] = useState(null);
  const [pausedUntil, setPausedUntil] = useState(null);

  const launches = data?.launches ?? [];
  const upcomingLaunches = data?.upcomingLaunches ?? [];
  const fallbackLaunch = data?.nextLaunch ?? launches[0] ?? null;
  const selectedLaunch = launches.find((launch) => launch.id === selectedLaunchId) ?? fallbackLaunch;

  const target = useMemo(() => getLaunchDate(selectedLaunch?.net), [selectedLaunch]);
  const remaining = useMemo(() => {
    if (!target) return null;
    return target.getTime() - now;
  }, [target, now]);
  const countdownParts = useMemo(() => {
    if (remaining == null) return null;
    return splitCountdown(remaining);
  }, [remaining]);

  const prague = target ? formatDateTimeHumanCZ(target, "Europe/Prague") : null;
  const utc = target ? formatDateTimeHumanCZ(target, "UTC") : null;
  const launchDisplay = prague ?? selectedLaunch?.launch_label ?? null;
  const windowStartPrague = selectedLaunch?.window_start
    ? formatDateTimeHumanCZ(selectedLaunch.window_start, "Europe/Prague")
    : null;
  const windowEndPrague = selectedLaunch?.window_end
    ? formatDateTimeHumanCZ(selectedLaunch.window_end, "Europe/Prague")
    : null;
  const lastUpdatedPrague = selectedLaunch?.last_updated
    ? formatDateTimeHumanCZ(selectedLaunch.last_updated, "Europe/Prague")
    : null;

  const safeImage =
    selectedLaunch?.image && String(selectedLaunch.image).startsWith("https://")
      ? selectedLaunch.image
      : null;

  const isPastLaunch = isPastMission(selectedLaunch, now);
  const selectedMissionLabel = getMissionLabel(selectedLaunch);
  const paused = pausedUntil && Date.now() < pausedUntil ? pausedUntil - Date.now() : 0;

  async function load() {
    const nowMs = Date.now();
    if (pausedUntil && nowMs < pausedUntil) return;

    const ctrl = new AbortController();
    try {
      setLoading(true);
      setErr(null);

      const next = await fetchLaunches(ctrl.signal);
      const trackedLaunch = next.nextLaunch;

      const key = "artemis:last_net";
      const prevNet = localStorage.getItem(key);
      if (trackedLaunch?.net && prevNet && prevNet !== trackedLaunch.net) {
        setChangeNote({
          from: formatDateTimeHumanCZ(prevNet, "Europe/Prague"),
          to: formatDateTimeHumanCZ(trackedLaunch.net, "Europe/Prague"),
          at: new Date().toISOString(),
        });
      }
      if (trackedLaunch?.net) {
        localStorage.setItem(key, trackedLaunch.net);
      }

      setPausedUntil(null);
      setData(next);
      setSelectedLaunchId((current) => {
        if (current && next.launches.some((launch) => launch.id === current)) return current;
        return trackedLaunch?.id ?? next.launches[0]?.id ?? null;
      });
    } catch (e) {
      if (e?.status === 429) {
        const waitMs = e.retryAfterMs ?? 15 * 60 * 1000;
        const until = Date.now() + waitMs;
        setPausedUntil(until);
        setErr(
          `Zdroj dat omezil dotazy (HTTP 429). Další pokus za ${Math.max(
            1,
            Math.ceil(waitMs / 1000)
          )} s.`
        );
        return;
      }

      setErr(e?.message ?? String(e) ?? ARTEMIS_FALLBACKS.status);
    } finally {
      setLoading(false);
    }

    return () => ctrl.abort();
  }

  useEffect(() => {
    load();
  }, []);

  useInterval(() => setNow(Date.now()), TICK_MS);
  useInterval(() => load(), pausedUntil ? null : REFRESH_MS);

  useEffect(() => {
    if (!pausedUntil) return;

    const msLeft = pausedUntil - Date.now();
    if (msLeft <= 0) {
      setPausedUntil(null);
      load();
      return;
    }

    const id = setTimeout(() => {
      setPausedUntil(null);
      load();
    }, msLeft);

    return () => clearTimeout(id);
  }, [pausedUntil]);

  return {
    pickerModel: {
      launches,
      now,
      selectedLaunchId,
      setSelectedLaunchId,
      upcomingCount: upcomingLaunches.length,
    },
    heroModel: {
      selectedLaunch,
      safeImage,
      isPastLaunch,
      loading,
      countdownParts,
      prague,
      utc,
      launchDisplay,
      selectedMissionLabel,
      windowStartPrague,
      windowEndPrague,
      paused,
      load,
      err,
      changeNote,
    },
    detailsModel: {
      selectedMissionLabel,
      selectedLaunch,
      prague,
      launchDisplay,
      utc,
      windowStartPrague,
      windowEndPrague,
      lastUpdatedPrague,
      refreshMinutes: Math.round(REFRESH_MS / 60000),
    },
  };
}
