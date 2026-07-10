import express from "express";
import {getDbPath, insertLaunchChange, listLaunchChanges} from "./db.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ok: true, dbPath: getDbPath()});
});

app.get("/api/changes", (req, res) => {
  const requestedLimit = Number(req.query.limit || 100);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(500, Math.trunc(requestedLimit)))
    : 100;

  res.json({results: listLaunchChanges(limit)});
});

app.post("/api/changes", (req, res) => {
  const missionKey = String(req.body?.missionKey ?? "").trim();
  const missionLabel = String(req.body?.missionLabel ?? "").trim();
  const toNet = String(req.body?.toNet ?? "").trim();
  const fromNet = req.body?.fromNet == null ? null : String(req.body.fromNet).trim() || null;
  const detectedAt = String(req.body?.detectedAt ?? new Date().toISOString()).trim();

  if (!missionKey || !missionLabel || !toNet) {
    res.status(400).json({
      error: "missionKey, missionLabel and toNet are required",
    });
    return;
  }

  const result = insertLaunchChange({
    missionKey,
    missionLabel,
    fromNet,
    toNet,
    detectedAt,
  });

  res.status(result.changes > 0 ? 201 : 200).json({
    ok: true,
    inserted: result.changes > 0,
  });
});

app.listen(port, () => {
  console.log(`Artemis changes API listening on ${port}`);
});
