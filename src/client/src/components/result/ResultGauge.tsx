import React from "react";
import GaugeComponent from "react-gauge-component";

/**
 * The gauge component for the productivity of the harvester or load carrier
 * @param productivity - the productivity number of the harvester or load carrier
 */
export function ResultGauge({productivity}: {productivity: number}) {
   return (
            <GaugeComponent
                arc={{
                    nbSubArcs: 150,
                    width: 0.40,
                    padding: 0.003,
                    subArcs: [
                        { limit: 15, color: "#EA4228"},
                        { limit: 30, color: "#F5CD19"},
                        { color: "#5BE12C"},
                    ]
                }}
                pointer={{
                    animationDuration: 1500,
                    animationDelay: 0,
                }}
                labels={{
                    valueLabel: {
                        matchColorWithArc: true,
                        maxDecimalDigits: 0,
                        style: {fontSize: '70px', fontWeight: '800', textShadow: "none"  }
                    },
                    tickLabels: {
                        type: "outer",
                        ticks: [
                            { value: 0 },
                            { value: 15 },
                            { value: 35 },
                            { value: 50 },
                        ],
                    }
                }}
                value={Math.min(productivity, 50)}
                maxValue={50}
            />
   )

}