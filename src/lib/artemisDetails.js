import {ARTEMIS_FALLBACKS} from "./artemisContent.js";

export function getArchiveRows({
  selectedLaunch,
  selectedMissionLabel,
  windowStartPrague,
  windowEndPrague,
}) {
  return [
    {label: "Stav mise", value: selectedLaunch?.status ?? ARTEMIS_FALLBACKS.status},
    {label: "Mise", value: selectedLaunch?.mission_name ?? selectedMissionLabel, wrap: true},
    {label: "Místo", value: selectedLaunch?.location ?? ARTEMIS_FALLBACKS.location, wrap: true},
    {label: "Rampa", value: selectedLaunch?.pad ?? ARTEMIS_FALLBACKS.pad, wrap: true},
    {label: "Raketa", value: selectedLaunch?.rocket ?? ARTEMIS_FALLBACKS.rocket, wrap: true},
    {label: "Orbit", value: selectedLaunch?.orbit ?? ARTEMIS_FALLBACKS.orbit, wrap: true},
    {label: "Window start", value: windowStartPrague ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "Window end", value: windowEndPrague ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
  ];
}

export function getMissionDetailRows({
  selectedMissionLabel,
  selectedLaunch,
  prague,
  launchDisplay,
  utc,
  windowStartPrague,
  windowEndPrague,
  lastUpdatedPrague,
  refreshMinutes,
}) {
  return [
    {label: "Mise", value: selectedMissionLabel},
    {label: "Stav", value: selectedLaunch?.status ?? ARTEMIS_FALLBACKS.status},
    {label: "Typ", value: selectedLaunch?.mission_type ?? ARTEMIS_FALLBACKS.missionType},
    {label: "Crewed", value: selectedLaunch?.is_crewed ? "Ano" : ARTEMIS_FALLBACKS.crewed},
    {label: "Místo", value: selectedLaunch?.location ?? ARTEMIS_FALLBACKS.location, wrap: true},
    {label: "Rampa", value: selectedLaunch?.pad ?? ARTEMIS_FALLBACKS.pad, wrap: true},
    {label: "Start (Praha)", value: prague ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "Start (oficiální)", value: launchDisplay ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "Start (UTC)", value: utc ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "Window start", value: windowStartPrague ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "Window end", value: windowEndPrague ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {label: "NET (ISO)", value: selectedLaunch?.net ?? ARTEMIS_FALLBACKS.datetime, wrap: true},
    {
      label: "Poslední aktualizace",
      value: lastUpdatedPrague ?? (selectedLaunch?.last_updated ?? ARTEMIS_FALLBACKS.updated),
      wrap: true,
    },
    {label: "Refresh", value: `${refreshMinutes} minut`},
  ];
}
