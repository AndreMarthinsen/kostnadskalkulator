import {ParseableBaseNode} from "../parseableBaseNode";
import {ClassicPreset} from "rete";
import {getNaryOperation, NodeType, ParseNode} from "@skogkalk/common/dist/src/parseTree";
import {NumberControlData} from "./numberControl/numberControlData";
import {NumberSocket} from "../../sockets";
import {NumberControlComponent} from "./numberControl/numberControlComponent";
import {NodeControl} from "../nodeControl";
import {NumberNodeOutput} from "../types";


/**
 * Node for use with math operations that can take n inputs and reduce them to
 * one single output, such as SUM and PROD.
 */
export class NaryNode extends ParseableBaseNode<
    { input: NumberSocket },
    { out: NumberSocket },
    { c: NodeControl<NumberControlData> }
> {
    naryOperation: (inputs: number[]) => number;

    constructor(
        type: NodeType,
        protected updateNodeRendering: (id: string) => void,
        id?: string
    ) {
        super(type, 190, 180, type.toString(), id);

        this.naryOperation = getNaryOperation(type);

        this.addControl(
            "c",
            new NodeControl(
                {value: 0, readonly: true} as NumberControlData,
                {
                    onUpdate: ()=>{},
                    minimized: false
                },
                NumberControlComponent
                )
        );

        this.addInput("input", new ClassicPreset.Input(new NumberSocket(), "In", true));
        this.addOutput("out", new ClassicPreset.Output(new NumberSocket(), "Out"));
    }

    data(inputs: { input?: NumberNodeOutput[] }): { out: NumberNodeOutput } {
        const inputControl =
            this.inputs.input?.control as ClassicPreset.InputControl<"number">;

        const input = inputs.input;
        const value = (input ? this.naryOperation(input.map((input)=>{return input.value})) : inputControl?.value || 0);

        this.controls.c.set({ value });

        this.updateNodeRendering?.(this.id);

        return { out: {value: value, sourceID: this.id} };
    }

    toParseNode(): ParseNode {
        return {
            id: this.id,
            type: this.type,
            value: this.controls.c.get('value') || 0
        }
    }

    serialize(): any {
        return this.controls.c.getData();
    }

    deserialize(data: any) {
        this.controls.c.set(data);
    }

    protected updateDataFlow: () => void = ()=>{}

}