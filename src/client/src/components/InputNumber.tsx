import React from "react";
import {Form, InputGroup} from "react-bootstrap";
import {FieldData, NumberedProperties} from "../constants/FieldData";

export function InputNumber({fieldData}: {fieldData: FieldData}) {
    return (
        <>
            <Form.Floating>
                <Form.Control
                    type="text"
                    placeholder="value"
                    aria-describedby="basic-addon1"
                />
                <label htmlFor="floatingInputCustom">{fieldData.title}</label>
            </Form.Floating>
            <InputGroup.Text style={{width: '6rem'}}>{(fieldData.properties as NumberedProperties).unit}</InputGroup.Text>
        </>
    )
}