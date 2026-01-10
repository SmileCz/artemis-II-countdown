import React, {useEffect, useMemo, useRef, useState} from "react";
import {fetchArtemisII} from "./lib/ll2.js";
import {formatDateTimeHumanCZ, pad2, splitCountdown} from "./lib/time.js";
import {Row} from "./components/Row.jsx";
import {TimeBox} from "./components/TimeBox.jsx";

const REFRESH_MS = 60 * 60 * 1000; // 60 minut
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

export default function App() {
  const [data, setData] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [changeNote, setChangeNote] = useState(null);
  const [pausedUntil, setPausedUntil] = useState(null);

  const target = useMemo(() => {
    const iso = data?.net;
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }, [data]);

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

  const lastUpdatedDate = data?.last_updated ? new Date(data.last_updated) : null;
  const lastUpdatedPrague =
      lastUpdatedDate && !isNaN(lastUpdatedDate)
          ? formatDateTimeHumanCZ(lastUpdatedDate, "Europe/Prague")
          : null;

  const safeImage =
    data?.image && String(data.image).startsWith("https://") ? data.image : null;

  const isLaunched = remaining != null && remaining <= 0;

  async function load() {
    const nowMs = Date.now();
    if (pausedUntil && nowMs < pausedUntil) return;

    const ctrl = new AbortController();
    try {
      setLoading(true);
      setErr(null);

      const next = await fetchArtemisII(ctrl.signal);

      const key = "artemis2:last_net";
      const prevNet = localStorage.getItem(key);
      if (prevNet && prevNet !== next.net) {
        setChangeNote({
          from: formatDateTimeHumanCZ(prevNet,"Europe/Prague"),
          to: formatDateTimeHumanCZ(next.net,"Europe/Prague"),
          at: new Date().toISOString(),
        });
      }
      localStorage.setItem(key, next.net);

      setPausedUntil(null);
      setData(next);
    } catch (e) {
      if (e?.status === 429) {
        const waitMs = e.retryAfterMs ?? 15 * 60 * 1000;
        const until = Date.now() + waitMs;
        setPausedUntil(until);
        setErr(
          `LL2 omezilo dotazy (HTTP 429). Další pokus za ${Math.max(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausedUntil]);

  const paused = pausedUntil && Date.now() < pausedUntil ? pausedUntil - Date.now() : 0;

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="badge">Artemis II</div>
          <h1>Odpočet startu</h1>
          <p className="sub">
            Datum se průběžně aktualizuje. Při limitu (429) stránka respektuje
            Retry-After a dočasně přestane dotazovat.
          </p>
        </header>

        <main className="grid">
          <section className="card hero">
            <div className="heroTop">
              <div className="heroTitle">
                <div className="kicker">Mise</div>
                <div className="title">{data?.name ?? "Načítám…"}</div>
                <div className="meta">
                  <span>{data?.provider ?? "NASA"}</span>
                  {data?.rocket ? <span> • {data.rocket}</span> : null}
                </div>
              </div>

              {safeImage ? (
                <div className="thumbWrap" aria-hidden="true">
                  <img className="thumb" src={safeImage} alt="" loading="lazy" />
                </div>
              ) : null}
            </div>

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
                    {isLaunched ? (
                      <span className="pill ok">
                        Čas vypršel. V ideálním vesmíru to znamená start.
                      </span>
                    ) : (
                      <span className="pill">Cíl: {prague}</span>
                    )}
                  </div>

                  {utc ? <div className="tiny">UTC: {utc}</div> : null}
                </>
              ) : (
                <div className="small">Datum startu není k dispozici.</div>
              )}
            </div>

            <div className="actions">
              <button
                className="btn"
                onClick={() => load()}
                disabled={loading || paused > 0}
              >
                {loading
                  ? "Aktualizuji…"
                  : paused > 0
                  ? `Čekám na limit… (${Math.ceil(paused / 1000)} s)`
                  : "Aktualizovat teď"}
              </button>
            </div>

            {err ? <div className="alert">Chyba: {err}</div> : null}

            {changeNote ? (
              <div className="notice" role="status">
                <div className="noticeTitle">Detekována změna termínu</div>
                <div className="noticeBody">
                  Předtím: <code>{changeNote.from}</code>
                  <br />
                  Teď: <code>{changeNote.to}</code>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="card side sideLarge">
            <h2>Detaily</h2>
            <dl className="dl">
              <Row label="Stav" value={data?.status ?? "Neznámý"} />
              <Row label="Místo" value={data?.location ?? "Neznámé"} />
              <Row label="Rampa" value={data?.pad ?? "Neznámá"} />

              <Row label="Start (Praha)" value={prague ?? "Neznámé"} wrap />
              <Row label="Start (UTC)" value={utc ?? "Neznámé"} wrap />
              <Row label="NET (ISO)" value={data?.net ?? "Neznámé"} wrap />

              <Row
                label="Poslední aktualizace"
                value={lastUpdatedPrague ?? (data?.last_updated ?? "Neznámá")}
                wrap
              />

              <Row
                label="Refresh"
                value={`${Math.round(REFRESH_MS / 60000)} minut`}
              />
            </dl>

            <div className="tip">
              <div className="tipTitle">Poznámka</div>
              <div className="tipBody">
                Produkční Nginx má cache a při 429 umí fallback na lldev. Klient
                navíc respektuje Retry-After a dočasně přestane dotazovat.
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

