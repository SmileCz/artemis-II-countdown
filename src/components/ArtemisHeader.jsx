import React from "react";
import {ARTEMIS_PAGE_COPY} from "../lib/artemisContent.js";

export function ArtemisHeader() {
  return (
    <header className="header">
      <div className="badge">{ARTEMIS_PAGE_COPY.badge}</div>
      <h1>{ARTEMIS_PAGE_COPY.title}</h1>
      <p className="sub">{ARTEMIS_PAGE_COPY.subtitle}</p>
    </header>
  );
}
