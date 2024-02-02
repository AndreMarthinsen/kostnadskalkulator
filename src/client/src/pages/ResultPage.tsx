import React from "react";
import {Stack} from "react-bootstrap";
import {Result} from "../containers/Result";
import {UnitType} from "../types/UnitType";
import {loadCarrierCalculator, logHarvesterCostCalculator} from "../calculator/calculator";
import {useAppSelector} from "../state/hooks";
import {selectHarvesterData, selectLoadCarrierData} from "../state/formSelectors";


/**
 * Result page for the harvester and load carrier
 */
export function ResultPage() {
    // Get the data from the store and calculate the result
    const harvesterData = useAppSelector(selectHarvesterData)
    const harvesterResult = logHarvesterCostCalculator(
        harvesterData.harvesterCost,
        harvesterData.treeData,
        harvesterData.terrainData
    )

    // Get the data from the store and calculate the result
    const loadCarrierData = useAppSelector(selectLoadCarrierData)
    const loadCarrierResult = loadCarrierCalculator(
        loadCarrierData.carrierCost,
        loadCarrierData.terrainData,
        loadCarrierData.roadData,
        loadCarrierData.treeData,
        loadCarrierData.timerLoadSize,
        loadCarrierData.distinctAssortments
        )

    // If the result is not ok, throw an error
    if(!harvesterResult.ok || !loadCarrierResult.ok) {
        throw new Error("Result not ok")
    }

    return (
            <Stack className={"mb-3"} gap={3}>
                <Result
                    title="Hogstmaskin"
                    productivity={harvesterResult.value.timberCubedPerG15Hour}
                    listItems={[
                        {
                            text: "Kostnad",
                            value: harvesterResult.value.costPerTimberCubed.toFixed(0),
                            unit: UnitType.COST_PER_CUBIC_M
                        },
                        {
                            text: "Middeldimensjon",
                            value: harvesterData.midDimension.toFixed(3),
                            unit: UnitType.CUBIC_M_PR_TREE
                        }
                    ]}
                />
                <Result
                    title="Lassbærer"
                    productivity={loadCarrierResult.value.timberCubedPerG15Hour}
                    listItems={[
                        {
                            text: "Kostnad",
                            value: loadCarrierResult.value.costPerTimberCubed.toFixed(0),
                            unit: UnitType.COST_PER_CUBIC_M
                        }
                    ]}
                />
            </Stack>
    )
}