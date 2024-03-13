import type {ParseNode} from "./nodes/parseNode";
import type {InputNode} from "./nodes/inputNode";
import type {OutputNode} from "./nodes/outputNode";
import {isReferenceNode} from "./nodes/referenceNode";
import {isOutputNode} from "./nodes/outputNode";
import {isInputNode} from "./nodes/inputNode";
import { isParseNode, NodeType} from "./nodes/parseNode";
import type {RootNode} from "./nodes/rootNode";
import {isRootNode} from "./nodes/rootNode";
import type {DisplayNode} from "./nodes/displayNode";
import {isDisplayNode} from "./nodes/displayNode";


/**
 *
 */
export interface TreeState {
    rootNode: RootNode,
    displayNodes: DisplayNode[],
    subTrees: ParseNode[],
    inputs: InputNode[],
    outputs: OutputNode[],
}


/**
 * Creates a TreeState object from an array of ParseNode objects
 *
 * Throws an error on invalid data format
 *
 * @param data An array of ParseNode objects, or a JSON string version of such an array.
 * @returns A TreeState object where inputs and outputs are object references
 * to the nodes in the subTrees array
 */
export function treeStateFromData(data: any): TreeState {
    if(typeof data === "string") {
        data = JSON.parse(data);
    } else {
        data = JSON.parse(JSON.stringify(data));
    }
    if(!Array.isArray(data)) {
        throw new Error("Root of JSON is expected to be an array");
    }


    const subTrees: ParseNode[] = [];
    const inputs: InputNode[] = [];
    const outputs: OutputNode[] = [];
    const displays: DisplayNode[] = [];
    const roots: RootNode[] = [];

    data.forEach((subTreeRoot)=> {
        if(isParseNode(subTreeRoot)) {
            subTrees.push(subTreeRoot)
        } else {
            throw new Error("Invalid data format. Expected array of ParseNode objects");
        }
    })

    subTrees.forEach((node) => {
        forEachNode(node, (node) => {
            if(isOutputNode(node)) {
                outputs.push(node);
            }
            if(isInputNode(node)) {
                inputs.push(node);
            }
            if(isDisplayNode(node)) {
                displays.push(node);
            }
            if(isRootNode(node)) {
                roots.push(node);
            }
        });
    });

    if (roots.length !== 1) { throw new Error("None or multiple root nodes found in tree")}

    return {
        rootNode: roots[0],
        displayNodes: displays,
        inputs: inputs,
        outputs: outputs,
        subTrees: subTrees
    };
}


/**
 * Returns a deep copy of a TreeState object
 * @param tree The TreeState object to be cloned
 */
export function cloneTree(tree: TreeState) : TreeState {
    return treeStateFromData(tree.subTrees);
}

export function resetAllInputsToDefaults(treeState: TreeState) : TreeState {
    const newTree = treeStateFromData(treeState.subTrees);
    newTree.inputs.forEach((input)=> {
        input.value = input.defaultValue;
    })
    return updateNodeValuesMutably(newTree);
}

export function resetInputToDefault(treeState: TreeState, input: InputNode) : TreeState | undefined {
    return setInputValue(treeState,input.id, input.defaultValue);
}


/**
 * Returns a deep copy of a ParseNode object where the input value is updated
 * and calculation is run on every node.
 *
 * @param tree The tree to clone and update. The original is not altered.
 * @param inputId
 * @param value
 */
export function setInputValue(tree: TreeState, inputId: string, value: number) : TreeState | undefined {
    let result = cloneTree(tree);

    if(getNodeByID(result, inputId) === undefined) { return undefined; }

    result.subTrees.forEach((node) => {
        forEachNode(node, (node) => {
            if(node.id === inputId && isInputNode(node)) {
                node.value = value;
            }
        });
    });

    updateNodeValuesMutably(result);

    return result;
}


/**
 * Returns the calculated output values for a given input node and a set of values
 *
 * @param tree The tree to calculate the output values from
 * @param inputID The ID of the input node
 * @param values An array of values to set the input node to
 * @returns An array with the results for each output node in the tree,
 * or undefined if the input node is not found in the tree.
 */
export function getResultsForInputs(tree: TreeState, inputID: string, values: number[]): {outputID: string, values: number[]}[] | undefined {
    const treeCopy = cloneTree(tree);
    let currentInput = getNodeByID(treeCopy, inputID);
    if(!currentInput) {return undefined;}

    const outputValues = new Map<string, number[]>;
    values.forEach((value) => {
        if(currentInput !== undefined && isInputNode(currentInput)) {
            currentInput.value = value;
            updateNodeValuesMutably(treeCopy);
            treeCopy.outputs.forEach((output) => {
                const out = outputValues.get(output.id);
                if(out) {
                    out.push(output.value);
                    outputValues.set(output.id, out);
                } else {
                    outputValues.set(output.id, [output.value]);
                }
            });
        }
    });
    return Array.from(outputValues).map(([outputID, values]) => {return {outputID, values}});
}


/**
 * Retrieves a node from a TreeState object by its ID
 *
 * @param tree TreeState object to search
 * @param nodeID The node id.
 * @returns A shallow copy of the matching node, otherwise undefined.
 */
export function getNodeByID(tree: TreeState | undefined, nodeID: string) : ParseNode | undefined {
    if(!tree) { return undefined }
    let matchNode: ParseNode | undefined;
    tree.subTrees.forEach((root)=> {
        forEachNode(root, (n)=>{
            if(n.id === nodeID) {
                matchNode = n;
            }
        })
    });
    return matchNode;
}

export function getInputByName(tree: TreeState, name: string, page?: string) : InputNode | undefined {
    return tree.inputs.find((input) => {return input.name === name && (page? input.pageName === page : true) });
}

export function getOutputByName(tree: TreeState, name: string) : OutputNode | undefined {
    return tree.outputs.find((output) => {return output.name === name });
}






////////////////////////////////////////////////////////////////////////////////
                            // Internal Functions
////////////////////////////////////////////////////////////////////////////////


/**
 * Updates the calculated value of all nodes in the tree
 *
 * @param tree
 */
function updateNodeValuesMutably(tree: TreeState) : TreeState {
    tree.subTrees.forEach((root) => {
        calculateNodeValue(tree, root);
    });
    return tree;
}


/**
 * Creates a deep copy of the tree and updates the calculated value
 * of all nodes in the subtrees.
 *
 * NB: Noticeably slower than updateNodeValuesMutably due to the deep
 * copying of the tree
 *
 * @param tree
 */
function updateNodeValuesImmutably(tree: TreeState) : TreeState {
    const result = cloneTree(tree);
    result.subTrees.forEach((root) => {
        calculateNodeValue(result, root);
    });
    return result;
}


/**
 * Calculates the value of a node and all its children, along
 * with any subtrees referenced in the node or its children.
 *
 * @param tree
 * @param node
 */
function calculateNodeValue(tree: TreeState, node: ParseNode | undefined): number {
    if(!node) {return 0}

    let result = 0;

    if(isRootNode(node)) {
        node.inputs.forEach((node)=> {
            calculateNodeValue(tree, node);
        })
        return 0;
    }
    if(isDisplayNode(node)) {
        node.inputs.forEach((node)=> {
            calculateNodeValue(tree, node);
        })
        return 0;
    }

    switch(node.type) {
        case NodeType.NumberInput: return node.value;
        case NodeType.DropdownInput: return node.value;
        case NodeType.Reference: {
            if(isReferenceNode(node)) {
                node.value = calculateNodeValue(tree, getNodeByID(tree, node.referenceID));
                return node.value;
            } else {
                throw new Error("Reference node is missing its referenceID property");
            }
        }
        case NodeType.Number: result =  node.value; break;
        case NodeType.Output: result =  calculateNodeValue(tree, node.child); break;
        case NodeType.Add: result = calculateNodeValue(tree, node.left) + calculateNodeValue(tree, node.right); break;
        case NodeType.Sub: result = calculateNodeValue(tree, node.left) - calculateNodeValue(tree, node.right); break;
        case NodeType.Mul: result = calculateNodeValue(tree, node.left) * calculateNodeValue(tree, node.right); break;
        case NodeType.Div: result =  calculateNodeValue(tree, node.left) / calculateNodeValue(tree, node.right); break;
        case NodeType.Pow: result =  calculateNodeValue(tree, node.left) ** calculateNodeValue(tree, node.right); break;
        case NodeType.Sum: result =  node.inputs!.map((node)=>{return calculateNodeValue(tree, node)}).reduce((a, b)=> {return a + b}) ?? 0; break;
        case NodeType.Prod: result = node.inputs!.map((node)=>{return calculateNodeValue(tree, node)}).reduce((a, b)=> {return a * b}) ?? 0; break;
        default: result = 0;
    }

    node.value = result;
    return result;
}

/**
 * Sets the value of all input nodes in the tree by parsing the URL queries containing the page name and the input values
 * @param tree The current tree state
 * @param queries A list of tuples with the page name and the query string
 * @param valueSeperator The character that separates the values in the query string
 * @throws Error If the input field is not found by index or if the query string contains a non-numeric value
 * @example
 * // https://url/api_or_resultPage?page1=80,25,20&page2=3,1,9 will invocate:
 * setInputsByURLQueries(tree, [["page1", "80,25,20"], ["page2", "3,1,9"]], ",")
 */
export function setInputsByURLQueries(tree: TreeState, queries: [page: string, values: string][], valueSeperator: string) : TreeState | undefined {
    /**
     * Reducer function that iterates over the queries and updates the tree
     * @param tree The current tree state
     * @param queries A tuple with the page name and an array of numbers
     * @throws Error If the input field is not found
     */
    const updateTree = (tree: TreeState, queries: [pageName: string, values: number[]][]) : TreeState => {
        return queries.reduce(updateTreeByPageNameAndValues, tree)
    }

    /**
     * Updates the tree by updating the input fields in the tree
     * @param tree The current tree state
     * @param parsedQuery A tuple with the page name and an array of numbers
     * @throws Error If the input field is not found
     * @returns The updated tree
     */
    const updateTreeByPageNameAndValues = (tree: TreeState, parsedQuery: [pageName: string, values: number[]]): TreeState => {
        const [pageName, values] = parsedQuery
        return values.reduce((tree, value, index) => {
            const input = getInputByPageAndIndex(tree, pageName, index)
            if (input) {
                return setInputValue(tree, input.id, value) ?? tree
            } else {
                throw new Error(`could not find input at page ${pageName} and index ${index}`)
            }
        }, tree)
    }

    /**
     * Parses a query key into an array of numbers
     * @param query A tuple with the page name and the query string
     * @throws Error If the query string contain a non-numeric value
     * @returns tuple of page name and an array of numbers
     * @example
     * // returns ["pageName", [1, 2, 3]]
     * parseQuery(["pageName", "1,2,3"])
     */
    const parseQuery = (query: [pageName: string, values: string]) : [string, number[]] => {
        const [pageName, values] = query
        const parsedKeys = values.split(valueSeperator).map((keyValue, index) => {
            const parsed = parseFloat(keyValue)
            if (isNaN(parsed)) {
                throw new Error(`could not parse key value at index ${index} at page ${pageName}`)
            }
            return parsed
        })
        return [decodeURI(pageName), parsedKeys]
    }

    // creates a new {Tree State} with all key-value query inputs inserted
    return updateTree(tree, queries.map(parseQuery))
}


export function getInputByPageAndIndex(tree: TreeState, pageName: string, index: number) : InputNode | undefined {
    return tree.inputs.find((node)=>{
        return node.pageName === pageName && node.ordering === index
    }
    )
}



function forEachNode(node: ParseNode, func: (node: ParseNode)=>void) {
    let nodes = [node];
    while(nodes.length != 0) {
        const currentNode = nodes.pop();

        if(currentNode) {
            func(currentNode);
        }

        if(currentNode?.left)   { nodes.push(currentNode.left); }
        if(currentNode?.right)  { nodes.push(currentNode.right); }
        if(currentNode?.child)  { nodes.push(currentNode.child); }
        if(currentNode?.inputs) { nodes.push(...currentNode.inputs); }
    }
}


