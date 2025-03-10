import {parseDocument, Parser} from "htmlparser2";
import * as http from "https";

export class Scrapper {
    private parser: Parser;
    results: [data: string, value: string][] = [];
    private nextDataFill: string|null = null;


    private constructor(
        private url: string,
        private filter: (name: string, attribute: { [p: string]: string }) => string|undefined,
    ) {
        this.parser = new Parser({
            onopentag: (name: string, attribs: { [p: string]: string }) => {
                const data = this.filter(name, attribs);
                if (data) {
                    this.nextDataFill = data;
                }
            },
            ontext: (data: string) => {
                if (this.nextDataFill) {
                    this.results.push([this.nextDataFill, data]);
                    this.nextDataFill = null;
                }
            }
        });
    }

    static fast(url: string, filter: (name: string, attribute: { [p: string]: string }) => string|undefined): Scrapper {
        return new Scrapper(url, filter);
    }

    private requestURL(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = http.request(this.url, res => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    this.parser.write(chunk);
                });
                res.on('end', () => {
                    this.parser.end();
                    resolve();
                });
            })

            request.on('error', (error) => {
                reject(error);
            });

            request.end();
        });
    }

    async search(): Promise<[data: string, value: string][]> {
        try {
            await this.requestURL();
            return this.results;

        } catch (e: unknown) {
            if (e instanceof Error) throw new Error('Technical error: ' +  e.message);
            else if (e instanceof String) throw new Error('Technical error: ' +  e);
            else throw new Error('Technical error: Cannot parse url resonse');
        }

    }

    /*async static PageDetailedDom(baliseClass: string, url: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const htmlPageBuffer: string[] = [];
            const request = http.request(this.url, res => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    htmlPageBuffer.push(chunk);
                });
                res.on('end', () => {
                    const htmlPage = htmlPageBuffer.join();
                    const dom = parseDocument(htmlPage);
                });
            })

            request.on('error', (error) => {
                reject(error);
            });

            request.end();
        });
    }*/
}