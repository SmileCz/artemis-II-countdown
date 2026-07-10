import React from "react";
import {ARTEMIS_PAGE_COPY} from "../lib/artemisContent.js";

export function ArtemisFooter() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} GearGround</span>
      <span className="sep">•</span>
      <span>{ARTEMIS_PAGE_COPY.footerSource}</span>
    </footer>
  );
}
