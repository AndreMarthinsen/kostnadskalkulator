import React, {useEffect} from "react";
import {Col, Row, Tab, Tabs} from "react-bootstrap";
import {InputField} from "./inputField/InputField";
import {useAppSelector} from "../state/hooks";
import {
    selectInputNodes,
    selectInvalidFieldValuesByPage,
    selectPageTitles
} from "../state/treeSelectors";

export function ParametersWithTabs() {
    const inputNodes = useAppSelector(selectInputNodes)
    const pageTitles = useAppSelector(selectPageTitles)
    const invalidFieldsByPage = useAppSelector(selectInvalidFieldValuesByPage(pageTitles))
    console.log(invalidFieldsByPage)


    const [key, setKey] = React.useState(pageTitles[0] ?? "");

    useEffect(() => {
        if (!key) {
            setKey(pageTitles[0] ?? "")
        }
    }, [key, pageTitles]);




    const tabs = pageTitles?.map((title, invalidField) => {
        return (
            <Tab eventKey={title} title={title} tabClassName={invalidFieldsByPage[invalidField] > 0 ? "page-invalid" : ""}>
                <Row>
                    {inputNodes
                        ?.filter((node) => node.pageName === title)
                        .sort((a, b) => a.ordering - b.ordering)
                         .map((node) => (
                            <Col md={12} lg={6}>
                                <InputField node={node} />
                            </Col>
                        ))
                    }
                </Row>
            </Tab>
        )
    })




    return (
            <Tabs
                id="controlled-tab-example"
                activeKey={key}
                onSelect={(k) => setKey(k ?? "")}
                className={"mb-3"}
            >
                {tabs}
            </Tabs>
    )
}