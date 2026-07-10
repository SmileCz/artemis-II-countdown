import React from "react";
import {ARTEMIS_FALLBACKS, ARTEMIS_PAGE_COPY} from "../lib/artemisContent.js";
import {getArchiveRows} from "../lib/artemisDetails.js";
import {pad2} from "../lib/time.js";
import {Row} from "./Row.jsx";
import {TimeBox} from "./TimeBox.jsx";

function HeroTop({model}) {
  const {selectedLaunch, safeImage, isPastLaunch} = model;
  return (
    <div className="heroTop">
      <div className="heroTitle">
        <div className="kicker">
          {isPastLaunch ? ARTEMIS_PAGE_COPY.heroArchive : ARTEMIS_PAGE_COPY.heroCurrent}
        </div>
        <div className="title">{selectedLaunch?.name ?? "Načítám…"}</div>
        <div className="meta">
          <span>{selectedLaunch?.provider ?? ARTEMIS_FALLBACKS.provider}</span>
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
  );
}

function FutureMissionContent({model}) {
  const {loading, selectedLaunch, countdownParts, prague, utc, launchDisplay} = model;
  return (
    <div className="timerBlock" aria-live="polite">
      {loading && !selectedLaunch ? (
        <div className="timerSkeleton">
          <div className="sLine" />
          <div className="sLine" />
        </div>
      ) : countdownParts ? (
        <>
          <div className="timerRow">
            <TimeBox label="dní" value={String(countdownParts.days)} />
            <TimeBox label="hod" value={pad2(countdownParts.hours)} />
            <TimeBox label="min" value={pad2(countdownParts.minutes)} />
            <TimeBox label="sek" value={pad2(countdownParts.seconds)} />
          </div>

          <div className="small">
            <span className="pill">{ARTEMIS_PAGE_COPY.futurePillPrefix} {prague}</span>
          </div>

          {utc ? <div className="tiny">UTC: {utc}</div> : null}
        </>
      ) : (
        <div className="small">
          {launchDisplay
            ? `${ARTEMIS_PAGE_COPY.officialDatePrefix} ${launchDisplay}`
            : ARTEMIS_PAGE_COPY.missingDate}
        </div>
      )}
    </div>
  );
}

function ArchiveMissionContent({model}) {
  const {selectedLaunch, launchDisplay, selectedMissionLabel, windowStartPrague, windowEndPrague} = model;
  const rows = getArchiveRows(model);

  return (
    <div className="archiveBlock">
      <div className="archiveBadge">{ARTEMIS_PAGE_COPY.archiveBadge}</div>
      <div className="archiveHeadline">
        {launchDisplay ?? "Čas startu není k dispozici"}
      </div>
      <p className="archiveCopy">
        {selectedLaunch?.mission_description ?? ARTEMIS_PAGE_COPY.archiveDescriptionFallback}
      </p>
      <dl className="archiveGrid">
        {rows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} wrap={row.wrap} />
        ))}
      </dl>
      {selectedLaunch?.webcast ? (
        <div className="actions">
          <a
            className="btn"
            href={selectedLaunch.webcast}
            target="_blank"
            rel="noreferrer"
          >
            {ARTEMIS_PAGE_COPY.webcastButton}
          </a>
        </div>
      ) : null}
    </div>
  );
}

function RefreshAction({model}) {
  const {loading, paused, load} = model;
  return (
    <div className="actions">
      <button
        className="btn"
        onClick={() => load()}
        disabled={loading || paused > 0}
        type="button"
      >
        {loading
          ? ARTEMIS_PAGE_COPY.loadingButton
          : paused > 0
            ? `Čekám na limit… (${Math.ceil(paused / 1000)} s)`
            : ARTEMIS_PAGE_COPY.refreshButton}
      </button>
    </div>
  );
}

function MissionAlerts({model}) {
  const {err, changeNote} = model;
  return (
    <>
      {err ? <div className="alert">Chyba: {err}</div> : null}

      {changeNote ? (
        <div className="notice" role="status">
          <div className="noticeTitle">{ARTEMIS_PAGE_COPY.changeTitle}</div>
          <div className="noticeBody">
            Předtím: <code>{changeNote.from}</code>
            <br />
            Teď: <code>{changeNote.to}</code>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MissionHero({model}) {
  const {isPastLaunch} = model;

  return (
    <section className="card hero">
      <HeroTop model={model} />

      {!isPastLaunch ? (
        <FutureMissionContent model={model} />
      ) : (
        <ArchiveMissionContent model={model} />
      )}

      {!isPastLaunch ? <RefreshAction model={model} /> : null}

      <MissionAlerts model={model} />
    </section>
  );
}
