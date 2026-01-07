import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchArtemisII } from "./lib/ll2.js";
import { formatDateTime, pad2, splitCountdown } from "./lib/time.js";

const REFRESH_MS = 15 * 60 * 1000; // 15 minut
const TICK_MS = 250; // plynulejší odpočet bez zbytečné zátěže

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

  async function load() {
    const ctrl = new AbortController();
    try {
      setLoading(true);
      setErr(null);

      const next = await fetchArtemisII(ctrl.signal);

      // detekce posunu termínu proti minulé známé hodnotě v localStorage
      const key = "artemis2:last_net";
      const prevNet = localStorage.getItem(key);
      if (prevNet && prevNet !== next.net) {
        setChangeNote({
          from: prevNet,
          to: next.net,
          at: new Date().toISOString(),
        });
      }
      localStorage.setItem(key, next.net);

      setData(next);
    } catch (e) {
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
  useInterval(() => load(), REFRESH_MS);

  const prague = target ? formatDateTime(target, "cs-CZ", "Europe/Prague") : null;
  const utc = target ? formatDateTime(target, "cs-CZ", "UTC") : null;
  const lastUpdatedDate = data?.last_updated ? new Date(data.last_updated) : null;
  const lastUpdatedPrague = lastUpdatedDate && !isNaN(lastUpdatedDate)  ? formatDateTime(lastUpdatedDate, "cs-CZ", "Europe/Prague") : null;

  const isLaunched = remaining != null && remaining <= 0;

  const safeImage = data?.image && data.image.startsWith("https://") ? data.image : null;

  return (
    <div className="page">
      <div className="shell">
        <header className="header">
          <div className="badge">Artemis II</div>
          <h1>Odpočet startu</h1>
          <p className="sub">
            Datum se průběžně aktualizuje z veřejného zdroje a stránka si sama hlídá změny.
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
                  {data?.rocket ? <span>• {data.rocket}</span> : null}
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
                      <span className="pill ok">Čas vypršel. V ideálním vesmíru to znamená start.</span>
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
              <button className="btn" onClick={() => load()} disabled={loading}>
                {loading ? "Aktualizuji…" : "Aktualizovat teď"}
              </button>
              {data?.url ? (
                <a className="btn ghost" href={data.url} target="_blank" rel="noreferrer">
                  Detail v Launch Library
                </a>
              ) : null}
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

          <aside className="card side">
            <h2>Detaily</h2>
            <dl className="dl">
              <Row label="Stav" value={data?.status ?? "Neznámý"} />
              <Row label="Místo" value={data?.location ?? "Neznámé"} />
              <Row label="Rampa" value={data?.pad ?? "Neznámá"} />
              <Row label="Start (Praha)" value={prague ?? "Neznámé"} />
              <Row label="Start (UTC)" value={utc ?? "Neznámé"} />
              {/* ISO si můžeš nechat třeba jako referenci */}
              <Row label="NET (ISO)" value={data?.net ?? "Neznámé"} />
              <Row label="Poslední aktualizace" value={lastUpdatedPrague ?? (data?.last_updated ?? "Neznámá")} />
              <Row label="Refresh" value={`${Math.round(REFRESH_MS / 60000)} minut`} />
            </dl>


            <div className="tip">
              <div className="tipTitle">Poznámka</div>
              <div className="tipBody">
                NASA často uvádí jen orientační nebo „nejpozději do“ datum, zatímco veřejné launch databáze drží konkrétní
                NET čas a průběžně ho aktualizují podle dostupných informací.
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

function TimeBox({ label, value }) {
  return (
    <div className="timeBox">
      <div className="timeVal">{value}</div>
      <div className="timeLbl">{label}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}
