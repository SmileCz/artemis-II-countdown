import {ArtemisFooter} from "./components/ArtemisFooter.jsx";
import React from "react";
import {ArtemisHeader} from "./components/ArtemisHeader.jsx";
import {MissionDetails} from "./components/MissionDetails.jsx";
import {MissionHero} from "./components/MissionHero.jsx";
import {MissionPicker} from "./components/MissionPicker.jsx";
import {useArtemisApp} from "./lib/useArtemisApp.js";

export default function App() {
  const {pickerModel, heroModel, detailsModel} = useArtemisApp();

  return (
    <div className="page">
      <div className="shell">
        <ArtemisHeader />
        <MissionPicker model={pickerModel} />
        <main className="grid">
          <MissionHero model={heroModel} />
          <MissionDetails model={detailsModel} />
        </main>
        <ArtemisFooter />
      </div>
    </div>
  );
}
