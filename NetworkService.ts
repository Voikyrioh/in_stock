import * as http from 'https'
import {Parser} from 'htmlparser2'
import {StockShop, StockSource} from "./models";
import * as fs from "fs";

export function getWebpageInfoFromURL(url: string, classToCheck: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const response = [];
        const request = http.request(url, res => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                response.push(chunk);
            });
            res.on('end', () => {
                const htmlPage = response.join();
                const domParser = new Parser({
                    onerror(error: Error) {
                        reject(error);
                    },
                    onopentag(name: string, attribs: { [p: string]: string }) {
                        if (attribs["class"] && attribs["class"].includes(classToCheck)) {
                            resolve(attribs["class"]);
                        }
                    }
                });

                domParser.end(htmlPage);
            });
        })

        request.on('error', (error) => {
            reject(error);
        });

        request.end();
    });
}

function readFile(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const stream = fs.createReadStream(url);
        let data = [];

        stream.on("data", chunk => {
            data.push(chunk);
        })
        stream.on("error", err => {
            reject(err);
        });
        stream.on("end", () => {
            resolve(data.join());
        })
    })
}

export async function getSources(): Promise<StockSource[]> {
    try {
        const sources = JSON.parse(await readFile("./parameters/sources.json"))?.['sources'];
        const sourcesType = JSON.parse(await readFile("./parameters/sources-type.json"))?.['shops'];

        if (!sources || sources.length === 0) {
            console.error("No sources found in sources file.")
            return;
        }

        for (let source of sources) {
            for (let shopName in sourcesType) {
                if (sourcesType.hasOwnProperty(shopName)) {
                    if (source.shop === shopName) {
                        source.shop = sourcesType[shopName];
                    }
                }
            }
        }

        return sources as StockSource[];

    } catch (err) {
        console.error(err);
    }
    return null;
}
