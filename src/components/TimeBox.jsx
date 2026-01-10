import React from "react";

export function TimeBox({label, value}) {
    return (
        <div className="timeBox">
            <div className="timeVal">{value}</div>
            <div className="timeLbl">{label}</div>
        </div>
    );
}
