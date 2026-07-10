export function getLaunchDate(iso) {
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function getMissionLabel(launch) {
  if (launch?.display_name) return launch.display_name;
  if (launch?.mission_name) return launch.mission_name;
  if (launch?.name) return launch.name;
  return "Artemis";
}

export function isPastMission(launch, nowMs) {
  const status = String(launch?.status ?? "").toLowerCase();
  if (status === "future" || status === "active") return false;
  if (status === "past") return true;

  if (!launch?.net) return false;
  const launchTime = new Date(launch.net).getTime();
  return Number.isFinite(launchTime) ? launchTime <= nowMs : false;
}
