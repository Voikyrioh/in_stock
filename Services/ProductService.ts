import {FullProduct, ProductAttributes, ProductInformations} from "../Models/ProductsModels";
import { getWebpageInfoFromURL } from "./NetworkService";
import {getAllSources} from "./SourceService";
import databaseInstance from "./MysqlService";

function getSourceStatus(source: FullProduct, classlist: string[]) {
    let stockState = "null";

    for (let status in source.source.correspondingName) {
        if (classlist.includes(source.source.correspondingName[status])) {
            stockState = status;
        }
    }
    
    return stockState;
}

function getAllProducts(): Promise<ProductAttributes[]> {
    const query = `SELECT * FROM products;`;
    return databaseInstance.query<ProductAttributes>(query);
}

export async function getAllFullProducts(): Promise<FullProduct[]> {
    try {
        const products = await getAllProducts();
        const sources = await getAllSources();
        const fullProducts: FullProduct[] = []
        
        if (!products || products.length === 0) {
            console.error("No sources found in sources file.");
            return;
        }

        for (let product of products) {
            for (let source of sources) {
                if (product.source === source.id) {
                    fullProducts.push({
                       name: product.name,
                       source: source,
                       url: product.url
                    });
                }
            }
        }

        return fullProducts;
    } catch (err) {
        throw err;
    }
}

function sourceValidate(source: FullProduct): Promise<ProductInformations> {
    return new Promise<ProductInformations>((resolve, reject) => {
        getWebpageInfoFromURL(source.url, source.source.queryStockSelector)
        .then(urlDocument => {
            resolve({
                source: source.source.name,
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

export function getAllProductInformation(): Promise<ProductInformations[]> {
    return new Promise<ProductInformations[]>((resolve, reject) => {
        const sourcesInformation = [];
        getAllFullProducts().then(async sources => {
            for (let source of sources) {
                sourcesInformation.push(await sourceValidate(source));
            }
            resolve(sourcesInformation);
        }).catch(error => {reject(error)})
    })
}
