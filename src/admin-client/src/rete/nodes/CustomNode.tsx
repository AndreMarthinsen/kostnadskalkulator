import * as React from "react";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";
import styled, {css} from "styled-components";
import {$nodeWidth, $socketMargin, $socketSize} from "./styleDefaults";

const { RefSocket, RefControl } = Presets.classic;
const nodeBackgroundColor = "#777777"
type NodeExtraData = { width?: number; height?: number };

export const NodeStyles = styled.div<
    NodeExtraData & { selected: boolean; styles?: (props: any) => any }
>`
  background: ${nodeBackgroundColor};
  border: 2px solid white;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
  width: ${(props) =>
    Number.isFinite(props.width) ? `${props.width}px` : `${$nodeWidth}px`};
  height: ${(props) =>
    Number.isFinite(props.height) ? `${props.height}` : "auto"};
  padding-bottom: 6px;
  position: relative;
  user-select: none;
  &:hover {
    background: #333;
  }
  ${(props) =>
    props.selected &&
    css`
      background: #333;
      border-color: orange;
    `}
  .title {
    color: white;
    font-family: sans-serif;
    font-size: 18px;
    padding: 8px;
  }
  .output {
    text-align: right;
  }
  .input {
    text-align: left;
  }
  .output-socket {
    text-align: right;
    margin-right: -1px;
    display: inline-block;
  }
  .input-socket {
    text-align: left;
    margin-left: -1px;
    display: inline-block;
  }
  .input-title,
  .output-title {
    vertical-align: middle;
    color: white;
    display: inline-block;
    font-family: sans-serif;
    font-size: 14px;
    margin: ${$socketMargin}px;
    line-height: ${$socketSize}px;
  }
  .input-control {
    z-index: 1;
    width: calc(100% - ${$socketSize + 2 * $socketMargin}px);
    vertical-align: middle;
    display: inline-block;
  }
  .control {
    display: block;
    padding: ${$socketMargin}px ${$socketSize / 2 + $socketMargin}px;
  }
  ${(props) => props.styles && props.styles(props)}
`;

function sortByIndex<T extends [string, undefined | { index?: number }][]>(
    entries: T
) {
    entries.sort((a, b) => {
        const ai = a[1]?.index || 0;
        const bi = b[1]?.index || 0;

        return ai - bi;
    });
}

type Props<S extends ClassicScheme> = {
    data: S["Node"] & NodeExtraData;
    styles?: () => any;
    emit: RenderEmit<S>;
};

export type NodeComponent<Scheme extends ClassicScheme> = (
    props: Props<Scheme>
) => JSX.Element;

const NodeButtonStyle = styled.div<
     { width: number }
>`
  display: inline-block;
  position: relative;
  top: 10px;
  left: 10px;
  cursor: pointer;
  border: 3px solid ${nodeBackgroundColor};
  border-radius: 15px;
  width: ${20}px;
  height: ${20}px;
  vertical-align: middle;
  background: #ffbc46;
  z-index: 2;
  box-sizing: border-box;
  text-align: center;

  &:hover {
    
  }
`;





export function CustomNode<Scheme extends ClassicScheme>(props: Props<Scheme>) {
    const inputs = Object.entries(props.data.inputs);
    const outputs = Object.entries(props.data.outputs);
    const controls = Object.entries(props.data.controls);
    const selected = props.data.selected || false;
    const { id, label, width, height } = props.data;

    sortByIndex(inputs);
    sortByIndex(outputs);
    sortByIndex(controls);

    return (
        <>

            <NodeButtonStyle
                onMouseDown={e=>{e.stopPropagation()}}
                onClick={()=>{console.log("clicked")}} width={25}></NodeButtonStyle>
            <NodeStyles
                selected={selected}
                width={width}
                height={height}
                styles={props.styles}
                data-testid="node"
            >
                <div
                    className="title"
                    data-testid="title"
                >
                    {label}
                </div>
                {/* Outputs */}
                {outputs.map(
                    ([key, output]) =>
                        output && (
                            <div className="output" key={key} data-testid={`output-${key}`}>
                                <div className="output-title" data-testid="output-title">
                                    {output?.label}
                                </div>
                                <RefSocket
                                    name="output-socket"
                                    side="output"
                                    emit={props.emit}
                                    socketKey={key}
                                    nodeId={id}
                                    payload={output.socket}
                                />
                            </div>
                        )
                )}
                {/* Controls */}
                {controls.map(([key, control]) => {
                    return control ? (
                        <RefControl
                            key={key}
                            name="control"
                            emit={props.emit}
                            payload={control}
                        />
                    ) : null;
                })}
                {/* Inputs */}
                {inputs.map(
                    ([key, input]) =>
                        input && (
                            <div className="input" key={key} data-testid={`input-${key}`}>
                                <RefSocket
                                    name="input-socket"
                                    emit={props.emit}
                                    side="input"
                                    socketKey={key}
                                    nodeId={id}
                                    payload={input.socket}
                                />
                                {input && (!input.control || !input.showControl) && (
                                    <div className="input-title" data-testid="input-title">
                                        {input?.label}
                                    </div>
                                )}
                                {input?.control && input?.showControl && (
                                    <span className="input-control">
                      <RefControl
                          key={key}
                          name="input-control"
                          emit={props.emit}
                          payload={input.control}
                      />
                    </span>
                                )}
                            </div>
                        )
                )}
            </NodeStyles>
        </>

    );
}