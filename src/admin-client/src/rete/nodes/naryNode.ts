import {BaseNode} from "./baseNode";
import {ClassicPreset} from "rete";
import {getNaryOperation, NodeType, ParseNode} from "@skogkalk/common/dist/src/parseTree";


/**
 * Node for use with math operations that can take n inputs and reduce them to
 * one single output, such as SUM and PROD.
 */
export class NaryNode extends BaseNode<
    { input: ClassicPreset.Socket },
    { value: ClassicPreset.Socket },
    { value: ClassicPreset.InputControl<"number">, description: ClassicPreset.InputControl<"text"> }
> {
    naryOperation: (inputs: number[]) => number;

    constructor(
        type: NodeType,
        protected updateNodeRendering: (id: string) => void
    ) {
        super(type, 190, 180);

        this.naryOperation = getNaryOperation(type);

        this.addControl(
            "value",
            new ClassicPreset.InputControl("number", {
                readonly: true
            })
        );

        this.addControl(
            "description",
            new ClassicPreset.InputControl("text", { initial: "description" })
        );

        this.addInput("input", new ClassicPreset.Input(new ClassicPreset.Socket("socket"), "In", true));
        this.addOutput("value", new ClassicPreset.Output(new ClassicPreset.Socket("socket"), "Out"));
    }

    data(inputs: { input?: number[] }): { value: number } {
        const inputControl =
            this.inputs.input?.control as ClassicPreset.InputControl<"number">;

        const input = inputs.input;
        const value = (input ? this.naryOperation(input) : inputControl?.value || 0);

        this.controls.value.setValue(value);

        this.updateNodeRendering?.(this.id);

        return { value };
    }

    toParseNode(): ParseNode {
        return {
            id: this.id,
            type: this.type,
            value: this.controls.value.value || 0
        }
    }

    protected updateDataFlow: () => void = ()=>{}

}