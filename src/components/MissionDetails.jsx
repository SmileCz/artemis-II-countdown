import React from "react";
import {ARTEMIS_PAGE_COPY} from "../lib/artemisContent.js";
import {getMissionDetailRows} from "../lib/artemisDetails.js";
import {Row} from "./Row.jsx";

export function MissionDetails({model}) {
  const rows = getMissionDetailRows(model);

  return (
    <aside className="card side sideLarge">
      <h2>{ARTEMIS_PAGE_COPY.detailsTitle}</h2>
      <dl className="dl">
        {rows.map((row) => (
          <Row key={row.label} label={row.label} value={row.value} wrap={row.wrap} />
        ))}
      </dl>

      <div className="tip">
        <div className="tipTitle">{ARTEMIS_PAGE_COPY.detailsTipTitle}</div>
        <div className="tipBody">{ARTEMIS_PAGE_COPY.detailsTipBody}</div>
      </div>
    </aside>
  );
}
