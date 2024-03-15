import {NavDropdown} from "react-bootstrap";
import {RootNode} from "@skogkalk/common/dist/src/parseTree/nodes/rootNode";
import {NodeType} from "@skogkalk/common/dist/src/parseTree";
import {updateTree} from "../../state/slices/treeState";
import {useAppDispatch, useAppSelector} from "../../state/hooks";
import {ReteFunctions} from "../../rete/editor";
import {selectFormulaInfo, selectPages} from "../../state/store";
import React from "react";
import {NavBarLoadDialogue} from "./NavBarLoadDialogue";
import {NavBarSaveDialogue} from "./NavBarSaveDialogue";

export function NavBarDropdowns(props: {functions: ReteFunctions | null}) {
    const dispatch = useAppDispatch();
    const formulaInfo = useAppSelector(selectFormulaInfo);
    const pagesInfo = useAppSelector(selectPages)
    const [showLoadMenu, setShowLoadMenu] = React.useState(false);
    const [showSaveMenu, setShowSaveMenu] = React.useState(false);



    return (
        <>
            <NavDropdown title={"File"} id={"file-dropdown"}>
                <NavDropdown.Item onClick={() => { setShowSaveMenu(!showSaveMenu)}}>
                    {"Save"}
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => { setShowLoadMenu(!showLoadMenu) }}>
                    {"Load"}
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => {
                    props.functions?.clear()
                }}>Clear</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title={"View"} id={"view-dropdown"}>
                <NavDropdown.Item onClick={() => {
                    props.functions?.viewControllers.resetView();
                }}>Reset</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title={"Test"} id={"file-dropdown"}>
                <NavDropdown.Item onClick={() => {
                    try {
                        const data = props.functions?.testJSON();
                        if(data) {
                            const version = formulaInfo.version;
                            const root: RootNode =  {
                                id: "0",
                                type: NodeType.Root,
                                value: 0,
                                formulaName: formulaInfo.name,
                                version: version.major * 1000000 + version.minor * 1000 + version.patch,
                                pages: pagesInfo.map(({id, page}, index)=>{return {pageName: page.title, ordering: index }}),
                                inputs:[]
                            }
                            data.push(root);
                            dispatch(updateTree(data));
                        }
                    } catch(e) {
                        console.log(e);
                    }
                }}>Test JSON</NavDropdown.Item>
            </NavDropdown>


            <NavBarLoadDialogue
                show={showLoadMenu}
                onHide={() => setShowLoadMenu(false)}
                functions={props.functions}
            />
            <NavBarSaveDialogue
                show={showSaveMenu}
                onHide={() => setShowSaveMenu(false)}
                functions={props.functions}
            />
        </>
    )
}