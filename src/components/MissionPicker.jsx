import React from "react";
import {ARTEMIS_PAGE_COPY} from "../lib/artemisContent.js";
import {formatDateTimeHumanCZ} from "../lib/time.js";
import {getMissionLabel, isPastMission} from "../lib/artemisView.js";

export function MissionPicker({model}) {
  const {launches, now, selectedLaunchId, setSelectedLaunchId, upcomingCount} = model;

  return (
    <section className="card picker">
      <div className="pickerHead">
        <h2>{ARTEMIS_PAGE_COPY.pickerTitle}</h2>
        <div className="pickerMeta">
          {upcomingCount > 0 ? `${upcomingCount} budoucí` : ARTEMIS_PAGE_COPY.noUpcoming}
        </div>
      </div>

      <div className="launchTabs">
        {launches.length > 0 ? (
          launches.map((launch) => {
            const isPast = isPastMission(launch, now);
            const isActive = launch.id === selectedLaunchId;

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
          <div className="small">{ARTEMIS_PAGE_COPY.noLaunches}</div>
        )}
      </div>
    </section>
  );
}
