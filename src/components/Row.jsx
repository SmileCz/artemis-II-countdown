import React from "react";

export function Row({label, value, wrap = false}) {
    return (
        <div className="row">
            <dt>{label}</dt>
            <dd className={wrap ? "wrap" : ""} title={value}>
                {value}
            </dd>
        </div>
    );
}
