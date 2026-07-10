export async function persistLaunchChange(change, signal) {
  const response = await fetch("/api/changes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(change),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to persist launch change (${response.status})`);
  }

  return response.json();
}
