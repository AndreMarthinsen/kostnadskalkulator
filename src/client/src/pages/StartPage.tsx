import {Button, Card, Col, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {useGetCalculatorsInfoQuery} from "../state/store";

export function StartPage() {
    return (
            <Card className={"pt-5"}>
                <Card.Body>
                    <Row className={"mx-auto"} style={{maxWidth: '800px'}}>
                        <Col xs={12} md={8}>
                            <h1 style={{fontWeight: 700, fontSize: '40px'}}>Beregn produktivitet og kostnader ved
                                skogsdrift
                            </h1>
                            <Row className={"mt-4 mb-4"} style={{fontWeight: 500}}>
                                <Col>
                                    <Row className={"mt-2 mb-4"} style={{fontSize: '18px'}}>
                                        <p>{"Kalkulatoren gir en prognose på tidsbruk og kostnader basert på skogtype, driftsforhold og hvordan drifta er tilrettelagt."}</p>
                                    </Row>
                                    <Row className={"mb-5"}>
                                        <CalculatorPicker/>
                                    </Row>
                                    <hr style={{color: "darkgray"}}/>
                                    <i>
                                        <Row className={"pt-4 mb-2"}>
                                            <p>{"Kalkulatoren er utviklet av Skogkurs i samarbeid med NIBIO, Allskog, Glommen Mjøsen Skog og MEF-Skog. Programmeringen er utført av en gruppe bachelor-studenter ved NTNU i Gjøvik."}</p>
                                        </Row>
                                        <Row>
                                            <p>{"Kalkulatoren er finansiert med støtte fra Skogbrukets Utviklingsfond og Skogbrukets Verdiskapingsfond."}</p>
                                        </Row>
                                    </i>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
    )
}

function CalculatorPicker() {
    const navigate = useNavigate()
    const {data, error, isLoading} = useGetCalculatorsInfoQuery()


    return (
        <>
            {isLoading && <p>{"Laster inn..."}</p>}
            {data && data.length === 0 && <p>{"Ingen kalkulatorer funnet"}</p>}
            {error && <p>{"En feil oppstod ved henting av kalkulatorer"}</p>}
            {data &&
                <Row className={"row-gap-4"}>
                    {data.map((calculator) => {
                        return (
                            <Col xs={6}>
                                <CalculatorButton
                                    title={calculator.name}
                                    description={"Kort beskrivelse"}
                                    onclick={() => {navigate(`/kalkulator/${encodeURI(calculator.name)}/${calculator.version}`)}}
                                    disabled={false}/>
                            </Col>
                        )
                    })}
                </Row>
            }
        </>
    )
}

function CalculatorButton(props: {
    title: string,
    description: string,
    onclick: () => void,
    disabled: boolean}) {
    return (
        <Button
            variant={"secondary"}
            className={"d-flex align-items-center w-100 h-100 pt-2 btn-calculator"}
            disabled={props.disabled}
            onClick={() => props.onclick()}
        >
            <Col>
                <div className={"title"}>{props.title}</div>
            </Col>
        </Button>
)

}