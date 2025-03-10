import type {FastifyInstance, FastifyRequest} from "fastify";
import Fastify from "fastify";
import WebsiteBuilder from "../repository/WebsiteBuilder";

class Webserver {
    private server: FastifyInstance;

    constructor(
        public readonly port: number,
        public readonly host: string,
    ) {
        this.server = Fastify({
            logger: true,
        });
        this.registerRoutes();
        this.server.listen({ port: this.port }, (err, address) => {
            if (err) {
                this.server.log.error(err)
                process.exit(1)
            }
        })
    }

    registerRoutes() {
        this.server.get("/test", async (request: FastifyRequest, reply) => {
            const { url } = request.query as {url: string};
            if (!url) {
                reply.send({error: "No url provided"});
                return;
            }
            reply.send(await WebsiteBuilder.getWebsite('LDLC').getProduct(decodeURI(url)));
        })
    }
}

export class WebserverSingleton {
    private static instance: Webserver;
    public static getInstance(): Webserver {
        if (!WebserverSingleton.instance) {
            WebserverSingleton.instance = new Webserver(3000, "0.0.0.0");
        }
        return WebserverSingleton.instance;
    }
}
