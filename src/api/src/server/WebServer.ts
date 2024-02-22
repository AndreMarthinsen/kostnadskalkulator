import {Configuration} from "../types/Configuration";
import express, {Express} from "express";
import {addCalculator, cors, getCalculators, reactApp} from "./controllers";
import * as http from "http";

export default class WebServer {
    #config: Configuration
    app: Express    // must be exposed for the testing framework
    #httpServer: http.Server | undefined

    constructor(config: Configuration) {
        this.#config = config
        this.app = express()
        this.#initRouting()
    }

    run() {
        this.#startHTTP()
    }

    stop() {
        this.#httpServer?.close()
    }

    #initRouting() {
        let router = express.Router()
            // Google App Engine has been configured to use a frontend/middleware
            // handler for the static files for faster processing. No request for
            // static files will actually reach this handler on the production
            // PaaS server, but is useful for local development.
            .use(express.static(this.#config.staticFilesPath))
            .use(express.json())
            .use(cors()) // temprory during development to allow CORS
            .get('/api/v0/getCalculators', getCalculators(this.#config.database))
            .get('*', reactApp(this.#config.staticFilesPath))
            .post('/api/v0/addCalculator', addCalculator(this.#config.database))

        this.app.use(router)
    }

    #startHTTP() {
        this.#httpServer = this.app.listen(this.#config.httpPort, () => {
            console.log(`Server is running at http://localhost:${this.#config.httpPort}`)
        })
    }

}