import {NodeEditor} from "rete";
import {ReteNode, Schemes} from "./nodes/types";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {Presets, ReactArea2D, ReactPlugin} from "rete-react-plugin";
import {DataflowEngine} from "rete-engine";
import {Presets as ScopesPresets, ScopesPlugin} from "rete-scopes-plugin";
import {AutoArrangePlugin, Presets as ArrangePresets} from "rete-auto-arrange-plugin";
import {createParseNodeGraph} from "./adapters";
import {createRoot} from "react-dom/client";
import {NodeType, ParseNode} from "@skogkalk/common/dist/src/parseTree";
import {ItemDefinition} from "rete-context-menu-plugin/_types/presets/classic/types";
import {ContextMenuExtra, ContextMenuPlugin, Presets as ContextMenuPresets} from "rete-context-menu-plugin";
import {ModuleEntry, ModuleManager} from "./moduleManager";
import {GraphSerializer, SerializedGraph} from "./graphSerializer";
import {NodeFactory} from "./nodeFactory";
import {canCreateConnection} from "./sockets";
import {ModuleNode} from "./nodes/moduleNodes/moduleNode";
import {CustomNode} from "./nodes/CustomNode";


export type AreaExtra = ReactArea2D<Schemes> | ContextMenuExtra;


export enum EditorEvent {
    ModulesChanged = "ModulesChanged"
}

export interface EditorSnapshot {
    readonly currentModule: string | undefined,
    moduleNames: ReadonlyArray<string>
}

export interface EditorContext {
    editor: NodeEditor<Schemes>,
    area: AreaPlugin<Schemes,  AreaExtra>,
    connection: ConnectionPlugin<Schemes, AreaExtra>,
    render: ReactPlugin<Schemes, AreaExtra>,
    engine: DataflowEngine<Schemes>,
    scopes: ScopesPlugin<Schemes>,
    arrange: AutoArrangePlugin<Schemes>
}


export interface EditorDataPackage {
    main: SerializedGraph,
    modules: ModuleEntry[]
}


export class Editor {
    private editorSnapshot: EditorSnapshot = {
        currentModule: undefined,
        moduleNames: []
    };
    private context: EditorContext;
    private readonly factory: NodeFactory;
    private eventSubscriptions = {
        ModulesChanged: new Set<any>()
    }
    private selectedNode: string | undefined;
    private onChangeCalls: {id: string, call: (nodes?: ParseNode[])=>void}[] = []
    private loading = false;
    private readonly moduleManager: ModuleManager;
    private readonly serializer: GraphSerializer;
    private stashedMain: SerializedGraph | undefined;
    public  currentModule: Readonly<string> | undefined;

    public destroyArea = () => {this.context.area.destroy()}




    constructor (
        container: HTMLElement
    ) {
        this.context = {
            editor: new NodeEditor<Schemes>(),
            area: new AreaPlugin<Schemes, AreaExtra>(container),
            engine: new DataflowEngine<Schemes>(),
            connection: new ConnectionPlugin<Schemes, AreaExtra>(),
            render: new ReactPlugin<Schemes, AreaExtra>({ createRoot }),
            arrange:  new AutoArrangePlugin<Schemes>(),
            scopes: new ScopesPlugin<Schemes>()
        };

        this.moduleManager = new ModuleManager();

        this.factory = new NodeFactory(
            this.moduleManager,
            (id: string)=>{ this.context.area.update('node', id)},
            this.updateDataFlow.bind(this),
            this.removeNodeConnections.bind(this),
            this.signalOnChange.bind(this)
        );

        this.setUpEditor();
        this.setUpDataflowEngine();
        this.setUpArea();
        this.setUpConnection();
        this.setUpRendering();
        this.setUpScopes();
        this.setUpAutoArrange();

        this.serializer = new GraphSerializer(
            this.context.editor,
            this.factory,
            this.context.area
        )

        AreaExtensions.zoomAt(this.context.area, this.context.editor.getNodes()).then(() => {});
    }


    public async loadMainGraph() {
        await this.saveCurrentMainOrModule(this.currentModule);
        this.currentModule = undefined;
        if(this.stashedMain !== undefined) await this.importNodes(this.stashedMain)
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
    }

    public async loadModule(name: string) {
        if(this.currentModule === name) { return; }
        if(!this.moduleManager.hasModule(name)) { throw new Error("No module with name " + name); }
        await this.saveCurrentMainOrModule(this.currentModule);
        this.currentModule = name;
        const data = this.moduleManager.getModuleData(name);
        if(data === undefined) {
            return;
        } else {
            await this.importNodes(data);
        }
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
    }

    public async deleteModule(name: string) {
        if(!this.moduleManager.hasModule(name)) return;

        this.moduleManager.removeModule(name);
        if(this.currentModule === name) {
            await this.loadMainGraph();
        } else {
            this.synchronizeModuleNodes();
        }
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
    }

    public renameCurrentModule(newName: string) {
        if(!this.hasModuleLoaded()) return;
        this.moduleManager.renameModule(this.currentModule!, newName);
        this.currentModule = newName;
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
    }


    public async saveCurrentMainOrModule(module: string | undefined) {
        if(module === undefined) {
            this.stashedMain = await this.exportMainGraph();
        } else {
            const data = await this.exportCurrentGraph();
            this.moduleManager.setModuleData(module, data);
        }
    }


    public addNewModule(name: string, data?: any) {
        if(this.moduleManager.hasModule(name)) {
            return
        }
        this.moduleManager.addModuleData(name, data);
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
    }

    private synchronizeModuleNodes() {
        this.context.editor.getNodes().forEach(node=>{
            if(node instanceof ModuleNode) {
                node.controls.c.set({availableModules: this.moduleManager.getModuleNames()})
            }
        })
    }









    /**
     * Causes an update of values throughout the tree structure
     */
    private updateDataFlow() {
        this.context.engine.reset();
        this.context.editor
            .getNodes()
            .forEach(async (node) => {
                await this.context.engine.fetch(node.id).catch(() => {});
            });
    }


    /**
     * Registers a function that is called whenever a node needs to be synchronized with
     * redux store for the purpose of previewing a ParseNode tree
     * @param entry
     */
    public registerOnChangeCallback(entry: {id: string, call: ()=>void}) {
        if(this.onChangeCalls.find(({id})=>{return id === entry.id})) {
            return
        }
        this.onChangeCalls.push(entry);
    }


    public createEventSubscriber(eventType: EditorEvent) {
        const registerCallback = (callback: ()=>void) =>{
            this.eventSubscriptions[eventType]?.add(callback);
        }
        const unregister = ((callback: ()=>void) => {
            return ()=>{
                this.eventSubscriptions[eventType]?.delete(callback);
            }
        });


        let func = (callback: ()=>void) => {
            registerCallback(callback);
            return () => { unregister(callback)(); }
        }

        return func.bind(this);
    }

    private updateSnapshot() {
        this.editorSnapshot = {
            currentModule: this.currentModule,
            moduleNames: this.moduleManager.getModuleNames()
        }
    }

    private signalEventAndUpdateSnapshot(eventType: EditorEvent) {
        this.updateSnapshot();
        this.eventSubscriptions[eventType]?.forEach(callback=>{
            callback();
        })
    }

    public getSnapshotRetriever() :  ()=>EditorSnapshot {
        const snapFn = ()=>{
            return this.editorSnapshot;
        }
        return snapFn.bind(this);
    }

    /**
     * Invokes all callbacks if not in the process of loading a file.
     */
    private signalOnChange = async ()=>{
        console.log("loading is ", this.loading);
        if(!this.loading && !this.hasModuleLoaded()) {
            const nodes = await this.exportAsParseTree()
            console.log("exporting during signal", nodes);
            this.onChangeCalls.forEach(({call})=>{
                call(nodes)
            })
        }
    }






    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // DATA SERIALIZATION AND UTILITIES
    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Loads data previously created through exportNodes() back into the editor.
     * @param data nodes
     */
    public async importNodes(data: SerializedGraph) {
        this.loading = true;
        try {
            await this.context.editor.clear();
            await this.serializer.importNodes(data);
            this.resetView();
            this.synchronizeModuleNodes();
        } catch(e) {
            console.error(e);
            throw e;
        }
        this.loading = false;
    }


    /**
     * Exports the main graph.
     */
    public async exportMainGraph() : Promise<SerializedGraph>{
        console.log({
            exporting: true,
            stashedMain: this.stashedMain,
            currentModule: this.currentModule,
            modules: this.moduleManager.getAllModuleData()
        })
        if(!this.hasModuleLoaded()) {
            return this.serializer.exportNodes();
        } else {
            await this.saveCurrentMainOrModule(this.currentModule);
            const tempEditor = new NodeEditor<Schemes>();
            const tempSerializer = new GraphSerializer(tempEditor, new NodeFactory(this.moduleManager));
            if(!this.stashedMain) {
                return {nodes: []}
            } else {
                return tempSerializer.importNodes(this.stashedMain).then(()=>{
                    return tempSerializer.exportNodes();
                })
            }
        }
    }

    public async exportCurrentGraph() : Promise<SerializedGraph> {
        return this.serializer.exportNodes();
    }

    public async exportModule(name: string) {
        if(!this.moduleManager.hasModule(name)) {throw new Error("No module with name " + name)};
        const tempEditor = new NodeEditor<Schemes>();
        const tempSerializer = new GraphSerializer(tempEditor, new NodeFactory(this.moduleManager))
        await tempSerializer.importNodes(this.moduleManager.getModuleData(name)!);
        return tempSerializer.exportNodes();
    }


    public async exportWithModules() : Promise<EditorDataPackage> {
        return {
            main: await this.exportMainGraph(),
            modules: this.moduleManager.getAllModuleData()
        }
    }

    public async importWithModules(data: EditorDataPackage) : Promise<void> {
        console.log("imported data", data);

        let oldFormatData = {
            main: { nodes: [] },
            modules: []
        }
        let useOldFormat = false;
        //@ts-ignore
        if(data.graph?.main !== undefined) {
            //@ts-ignore
            oldFormatData.main = data.graph.main;
            useOldFormat = true;
        }
        //@ts-ignore
        if(data.nodes !== undefined) {
            useOldFormat = true;
            //@ts-ignore
            oldFormatData.main = { nodes: data.nodes };
        }
        //@ts-ignore
        if(data.graph?.modules !== undefined) {
            //@ts-ignore
            oldFormatData.modules = data.graph.modules
        }

        const uploadData = (useOldFormat)? oldFormatData : data;
        console.log((useOldFormat)? "old":"new", uploadData);
        this.moduleManager.overwriteModuleData(uploadData.modules);
        await this.importNodes(uploadData.main);
        this.currentModule = undefined;
        this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);

        this.synchronizeModuleNodes();
    }


    /**
     * Exports the current data structure as its equivalent ParseNode structure
     */
    public async exportAsParseTree() : Promise<ParseNode[]> {
        if(!this.hasModuleLoaded()) {
            return createParseNodeGraph(this.serializer, this.moduleManager);
        } else {
            const tempEditor = new NodeEditor<Schemes>();
            const tempSerializer = new GraphSerializer(tempEditor, this.factory);
            await tempSerializer.importNodes(this.stashedMain || {nodes: []});
            return createParseNodeGraph(tempSerializer, this.moduleManager);
        }
    }


    /**
     * Removes all nodes from the current canvas
     */
    public clearNodes() {
        this.loading = true;
        this.context.editor.clear().then(()=>{
            this.moduleManager.overwriteModuleData([])
            this.loading = false;
            this.currentModule = undefined;
            this.signalEventAndUpdateSnapshot(EditorEvent.ModulesChanged);
            }
        );
    }


    /**
     * Deletes the currently selected node on the canvas
     */
    public async deleteSelected() {
        if(this.selectedNode && ( this.context.editor.getNode(this.selectedNode)) ) {
            await this.removeNodeConnections(this.selectedNode);
            this.context.editor.removeNode(this.selectedNode).then(()=>{});
        }
    }


    private async removeNodeConnections(nodeID: string, connection?: { input?: string, output?: string }) {
        if( this.context.editor.getNode(nodeID) ) {
            const connections = this.context.editor.getConnections().filter(c => {
                if(connection === undefined) {
                    return c.source === nodeID || c.target === nodeID;
                } else {
                    if(connection.input !== undefined) {
                        return c.target === nodeID && c.targetInput === connection.input;
                    }
                    if(connection.output !== undefined) {
                        return c.source === nodeID && c.sourceOutput === connection.output;
                    }
                    return false;
                }
            })
            for (const connection of connections) {
                await this.context.editor.removeConnection(connection.id)
            }
        }
    }

    public hasModuleLoaded() {
        return this.currentModule !== undefined;
    }





    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // VIEW MANIPULATION
    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Brings all nodes on the canvas into view
     */
    public resetView () {
        AreaExtensions.zoomAt(this.context.area, this.context.editor.getNodes()).then(() => {});
    }

    /**
     * Focuses the view on the currently selected node, as indicated by a highlight
     */
    public focusViewOnSelectedNode() {
        let node: ReteNode | undefined;
        if(this.selectedNode && (node = this.context.editor.getNode(this.selectedNode)) ) {
            AreaExtensions.zoomAt(this.context.area, [node]).catch(()=>{}).then(() => {});
        }
    }






    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    // NODE CREATION
    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Creates a menu with nodes the user can create
     * @private
     */
    private createContextMenu() {
        const nodeTypesToDefinition : (nodeTypes: NodeType[])=>ItemDefinition<Schemes>[] = (types) =>{
            return types.map(node=>{
                return [node.toString(), ()=>{return this.factory.createNode(node) as ReteNode}]
            })
        }
        const mathNodes = nodeTypesToDefinition ([
            NodeType.Add,
            NodeType.Div,
            NodeType.Mul,
            NodeType.Sub,
            NodeType.Prod,
            NodeType.Pow,
            NodeType.Sum,
            NodeType.Number,
            NodeType.Choose,
            NodeType.Min,
            NodeType.Max,
        ])
        const inputNodes = nodeTypesToDefinition ([
            NodeType.DropdownInput,
            NodeType.NumberInput
        ])
        const moduleNodes = nodeTypesToDefinition ([
            NodeType.Module,
            NodeType.ModuleInput,
            NodeType.ModuleOutput
        ])
        const displayNodes = nodeTypesToDefinition ( [
            NodeType.Display,
            NodeType.BarDisplay,
            NodeType.PreviewDisplay,
            NodeType.ListDisplay
        ])


        return new ContextMenuPlugin<Schemes>({
            items: ContextMenuPresets.classic.setup([
                ["Math", mathNodes],
                ["Inputs", inputNodes],
                ["Displays", displayNodes],
                ["Module", moduleNodes],
                ["Output", ()=>{ return this.factory.createNode(NodeType.Output) as ReteNode}]
            ])
        });
    }






    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // SETUP FUNCTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    private setUpEditor() {
        this.context.editor.use(this.context.area);
        this.context.editor.use(this.context.engine);

        this.context.editor.addPipe((context) => {
            if(context.type === "connectioncreate" && !canCreateConnection(this.context.editor, context.data)) {
                return;
            }
            if (["connectioncreated", "connectionremoved", "noderemoved"].includes(context.type)) {
                this.updateDataFlow();
                this.signalOnChange();
            }
            return context;
        });
    }

    private setUpConnection() {
        this.context.connection.addPreset(ConnectionPresets.classic.setup());
    }

    private setUpRendering() {
        this.context.render.addPreset(Presets.contextMenu.setup({delay:10}));
        this.context.render.addPreset(
            Presets.classic.setup({
                customize: {
                    control(data) {
                        return data.payload.controlContainer
                    },
                    node(data) {
                        return CustomNode;
                        // return Presets.classic.Node;
                    },
                    socket(context) {
                        return context.payload.component;
                    }
                }
            })
        );
    }

    private setUpScopes() {
        this.context.scopes.addPreset(ScopesPresets.classic.setup());
    }

    private setUpAutoArrange() {
        this.context.arrange.addPreset(ArrangePresets.classic.setup());
    }


    private setUpArea() {
        this.context.area.use(this.context.connection);
        this.context.area.use(this.createContextMenu());
        this.context.area.use(this.context.render);
        this.context.area.use(this.context.scopes);
        this.context.area.use(this.context.arrange);

        AreaExtensions.selectableNodes(this.context.area, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        this.context.area.addPipe((context)=> {
            if(context.type === "nodepicked") {
                this.selectedNode = context.data.id;
                this.context.engine.fetchInputs(this.selectedNode);
            }
            if (context.type === "nodetranslated") {
                const node = this.context.editor.getNode(context.data.id);
                if(node) {
                    [node.yTranslation, node.xTranslation] = [context.data.position.y, context.data.position.x]
                }
            }
            return context;
        })

    }

    private setUpDataflowEngine() {

    }

}