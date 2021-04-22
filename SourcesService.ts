import { StockSource, StockSourceInformations } from "./models";
import { getSources, getWebpageInfoFromURL } from "./NetworkService";

function getSourceStatus(source: StockSource, classlist: string[]) {
    let stockState = "null";

    for (let status in source.shop.correspondingName) {
        if (classlist.includes(source.shop.correspondingName[status])) {
            stockState = status;
        }
    }
    
    return stockState;
}

function sourceValidate(source: StockSource): Promise<StockSourceInformations> {
    return new Promise<StockSourceInformations>((resolve, reject) => {
        getWebpageInfoFromURL(source.url, source.shop.stockObjectClassname)
        .then(urlDocument => {
            resolve({
                shop: source.shop.name,
                name: source.name,
                url: source.url,
                status: getSourceStatus(source, urlDocument.split(' '))
            });
        })
        .catch(error => {
            reject(error)
        })
    })
}

export function getAllSourcesInformations(): Promise<StockSourceInformations[]> {
    return new Promise<StockSourceInformations[]>((resolve, reject) => {
        const sourcesInformation = [];
        getSources().then(async sources => {
            for (let source of sources) {
                sourcesInformation.push(await sourceValidate(source));
            }
            resolve(sourcesInformation);
        }).catch(error => {reject(error)})
    })
}