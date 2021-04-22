import * as http from 'https'
import {Parser} from 'htmlparser2'

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