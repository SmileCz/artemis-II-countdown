import React, {useEffect, useMemo, useRef, useState} from "react";
import {fetchLaunches} from "./lib/ll2.js";
import {formatDateTimeHumanCZ, pad2, splitCountdown} from "./lib/time.js";
import {Row} from "./components/Row.jsx";
import {TimeBox} from "./components/TimeBox.jsx";

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

function getLaunchDate(iso) {
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? null : value;
}

function getMissionLabel(launch) {
  if (launch?.display_name) return launch.display_name;
  if (launch?.mission_name) return launch.mission_name;
  if (launch?.name) return launch.name;
  return "Artemis";
}

function isPastMission(launch, nowMs) {
  const status = String(launch?.status ?? "").toLowerCase();
  if (status === "future" || status === "active") return false;
  if (status === "past") return true;

  if (!launch?.net) return false;
  const launchTime = new Date(launch.net).getTime();
  return Number.isFinite(launchTime) ? launchTime <= nowMs : false;
}

export default function App() {
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
  const parts = useMemo(() => {
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

      setErr(e?.message ?? String(e));
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

  const paused = pausedUntil && Date.now() < pausedUntil ? pausedUntil - Date.now() : 0;

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="badge">Artemis Program</div>
          <h1>Starty a archiv misí Artemis</h1>
          <p className="sub">
            Stránka přepíná mezi Artemis misemi. Budoucí mise mají odpočet, u minulých
            misí se zobrazuje rozšířený archivní detail.
          </p>
        </header>

        <section className="card picker">
          <div className="pickerHead">
            <h2>Mise Artemis</h2>
            <div className="pickerMeta">
              {upcomingLaunches.length > 0
                ? `${upcomingLaunches.length} budoucí`
                : "Bez potvrzené budoucí mise"}
            </div>
          </div>

          <div className="launchTabs">
            {launches.length > 0 ? (
              launches.map((launch) => {
                const isPast = isPastMission(launch, now);
                const isActive = launch.id === selectedLaunch?.id;

                return (
                  <button
                    key={launch.id}
                    className={`launchTab${isActive ? " active" : ""}`}
                    onClick={() => setSelectedLaunchId(launch.id)}
                    type="button"
                  >
                    <span className="launchTabEyebrow">
                      {isPast ? "Archiv" : "Plán"} • {launch.status_abbrev ?? launch.status ?? "TBD"}
                    </span>
                    <span className="launchTabTitle">{getMissionLabel(launch)}</span>
                    <span className="launchTabMeta">
                      {launch.net
                        ? formatDateTimeHumanCZ(launch.net, "Europe/Prague")
                        : (launch.launch_label ?? "Datum neznámé")}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="small">Artemis mise nejsou k dispozici.</div>
            )}
          </div>
        </section>

        <main className="grid">
          <section className="card hero">
            <div className="heroTop">
              <div className="heroTitle">
                <div className="kicker">{isPastLaunch ? "Archiv mise" : "Vybraná mise"}</div>
                <div className="title">{selectedLaunch?.name ?? "Načítám…"}</div>
                <div className="meta">
                  <span>{selectedLaunch?.provider ?? "NASA"}</span>
                  {selectedLaunch?.rocket ? <span> • {selectedLaunch.rocket}</span> : null}
                  {selectedLaunch?.mission_type ? <span> • {selectedLaunch.mission_type}</span> : null}
                </div>
              </div>

              {safeImage ? (
                <div className="thumbWrap" aria-hidden="true">
                  <img className="thumb" src={safeImage} alt="" loading="lazy" />
                </div>
              ) : null}
            </div>

            {!isPastLaunch ? (
              <div className="timerBlock" aria-live="polite">
                {loading && !data ? (
                  <div className="timerSkeleton">
                    <div className="sLine" />
                    <div className="sLine" />
                  </div>
                ) : parts ? (
                  <>
                    <div className="timerRow">
                      <TimeBox label="dní" value={String(parts.days)} />
                      <TimeBox label="hod" value={pad2(parts.hours)} />
                      <TimeBox label="min" value={pad2(parts.minutes)} />
                      <TimeBox label="sek" value={pad2(parts.seconds)} />
                    </div>

                    <div className="small">
                      <span className="pill">Cíl: {prague}</span>
                    </div>

                    {utc ? <div className="tiny">UTC: {utc}</div> : null}
                  </>
                ) : (
                  <div className="small">
                    {launchDisplay
                      ? `Oficiální datum: ${launchDisplay}`
                      : "Datum startu není k dispozici."}
                  </div>
                )}
              </div>
            ) : (
              <div className="archiveBlock">
                <div className="archiveBadge">Předchozí start</div>
                <div className="archiveHeadline">
                  {launchDisplay ?? "Čas startu není k dispozici"}
                </div>
                <p className="archiveCopy">
                  {selectedLaunch?.mission_description ??
                    "K této Artemis misi není v Launch Library 2 delší popis."}
                </p>
                <dl className="archiveGrid">
                  <Row label="Stav mise" value={selectedLaunch?.status ?? "Neznámý"} />
                  <Row label="Mise" value={selectedLaunch?.mission_name ?? selectedMissionLabel} wrap />
                  <Row label="Místo" value={selectedLaunch?.location ?? "Neznámé"} wrap />
                  <Row label="Rampa" value={selectedLaunch?.pad ?? "Neznámá"} wrap />
                  <Row label="Raketa" value={selectedLaunch?.rocket ?? "Neznámá"} wrap />
                  <Row label="Orbit" value={selectedLaunch?.orbit ?? "Neuveden"} wrap />
                  <Row label="Window start" value={windowStartPrague ?? "Neznámé"} wrap />
                  <Row label="Window end" value={windowEndPrague ?? "Neznámé"} wrap />
                </dl>
                {selectedLaunch?.webcast ? (
                  <div className="actions">
                    <a
                      className="btn"
                      href={selectedLaunch.webcast}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Záznam / webcast
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {!isPastLaunch ? (
              <div className="actions">
                <button
                  className="btn"
                  onClick={() => load()}
                  disabled={loading || paused > 0}
                  type="button"
                >
                  {loading
                    ? "Aktualizuji…"
                    : paused > 0
                      ? `Čekám na limit… (${Math.ceil(paused / 1000)} s)`
                      : "Aktualizovat teď"}
                </button>
              </div>
            ) : null}

            {err ? <div className="alert">Chyba: {err}</div> : null}

            {changeNote ? (
              <div className="notice" role="status">
                <div className="noticeTitle">Detekována změna nejbližší mise</div>
                <div className="noticeBody">
                  Předtím: <code>{changeNote.from}</code>
                  <br />
                  Teď: <code>{changeNote.to}</code>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="card side sideLarge">
            <h2>Detaily výběru</h2>
            <dl className="dl">
              <Row label="Mise" value={selectedMissionLabel} />
              <Row label="Stav" value={selectedLaunch?.status ?? "Neznámý"} />
              <Row label="Typ" value={selectedLaunch?.mission_type ?? "Neznámý"} />
              <Row label="Crewed" value={selectedLaunch?.is_crewed ? "Ano" : "Ne / neuvedeno"} />
              <Row label="Místo" value={selectedLaunch?.location ?? "Neznámé"} wrap />
              <Row label="Rampa" value={selectedLaunch?.pad ?? "Neznámá"} wrap />
              <Row label="Start (Praha)" value={prague ?? "Neznámé"} wrap />
              <Row label="Start (oficiální)" value={launchDisplay ?? "Neznámé"} wrap />
              <Row label="Start (UTC)" value={utc ?? "Neznámé"} wrap />
              <Row label="Window start" value={windowStartPrague ?? "Neznámé"} wrap />
              <Row label="Window end" value={windowEndPrague ?? "Neznámé"} wrap />
              <Row label="NET (ISO)" value={selectedLaunch?.net ?? "Neznámé"} wrap />
              <Row
                label="Poslední aktualizace"
                value={lastUpdatedPrague ?? (selectedLaunch?.last_updated ?? "Neznámá")}
                wrap
              />
              <Row label="Refresh" value={`${Math.round(REFRESH_MS / 60000)} minut`} />
            </dl>

            <div className="tip">
              <div className="tipTitle">Poznámka</div>
              <div className="tipBody">
                Výběr je omezený jen na Artemis mise z Launch Library 2. Produkční Nginx
                má cache a při 429 umí fallback na lldev.
              </div>
            </div>
          </aside>
        </main>

        <footer className="footer">
          <span>© {new Date().getFullYear()} GearGround</span>
          <span className="sep">•</span>
          <span>Zdroj dat: Launch Library 2</span>
        </footer>
      </div>
    </div>
  );
}
