import {ClassicPreset, GetSchemes} from "rete";
import {NumberNode} from "./mathNodes/numberNode";
import {BinaryNode} from "./mathNodes/binaryNode";
import {NaryNode} from "./mathNodes/naryNode";
import {NumberInputNode} from "./IONodes/numberInputNode/numberInputNode";
import {OutputNode} from "./IONodes/outputNode/outputNode";
import {DropdownInputNode} from "./IONodes/dropdownInputNode/dropdownInputNode";
import {DisplayPieNode} from "./displayNodes/displayPieNode/displayPieNode";
import {ModuleInput} from "./moduleNodes/moduleInput";
import {ModuleOutput} from "./moduleNodes/moduleOutput";
import {ModuleNode} from "./moduleNodes/moduleNode";
import {DisplayBarNode} from "./displayNodes/displayBarNode/displayBarNode";
import {DisplayPreviewNode} from "./displayNodes/displayPreviewNode/displayPreviewNode";
import {DisplayListNode} from "./displayNodes/displayListNode/displayListNode";
import {ChooseNode} from "./controlNodes/chooseNode";
import {GraphDisplayNode} from "./displayNodes/graphDisplayNode/graphDisplayNode";

export type ReteNode = ParseableNode | ModuleInput | ModuleOutput | ModuleNode;

export type ParseableNode = NumberNode | BinaryNode | NaryNode | NumberInputNode | OutputNode | DropdownInputNode | DisplayPieNode | DisplayBarNode | ChooseNode | DisplayPreviewNode | DisplayListNode | GraphDisplayNode;

export function isParseableNode(node: ReteNode): node is ParseableNode {
    return !(node instanceof ModuleInput || node instanceof ModuleOutput || node instanceof ModuleNode);
}

export type NumberNodeOutput = { value: number, sourceID: string };

export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];
export class Connection<
    A extends ReteNode,
    B extends ReteNode
> extends ClassicPreset.Connection<A, B> {}


export type ConnProps =
    | Connection<NumberInputNode, BinaryNode>
    | Connection<NumberInputNode, NaryNode>
    | Connection<NumberInputNode, OutputNode>
    | Connection<NumberNode, BinaryNode>
    | Connection<NumberNode, NaryNode>
    | Connection<NumberNode, OutputNode>
    | Connection<BinaryNode, OutputNode>
    | Connection<NaryNode, OutputNode>
    | Connection<ModuleInput, ModuleOutput>
    | Connection<ModuleNode, BinaryNode | NaryNode>
    | Connection<ModuleNode, OutputNode>
    | Connection<NumberNode | BinaryNode | NaryNode, ModuleNode>
    | Connection<ModuleInput, BinaryNode | NaryNode | ChooseNode>
    | Connection<BinaryNode | NaryNode | ChooseNode, ModuleOutput>

export type Schemes = GetSchemes<ReteNode, ConnProps>;

