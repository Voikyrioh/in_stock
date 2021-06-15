import {FullProduct, ProductAttributes, ProductInformations, UserProductInformations} from "../Models/ProductsModels";
import { getWebpageInfoFromURL } from "./NetworkService";
import {getAllSources, getProductSource} from "./SourceService";
import databaseInstance from "./MysqlService";
import {Source} from "../Models/SourcesModels";

function getSourceStatus(source: Source, classlist: string[]) {
    let stockState = "null";

    for (let status in source.correspondingName) {
        if (classlist.includes(source.correspondingName[status])) {
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
                status: getSourceStatus(source.source, urlDocument.split(' '))
            });
        })
        .catch(error => {
            reject(error)
        })
    })
}

export function getFullProduct(id: number): Promise<ProductInformations[]> {
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

export async function getUserProduct(userid: number, id: number): Promise<UserProductInformations> {
    return new Promise<UserProductInformations>((resolve, reject) => {
        const query = `SELECT
            p.id as 'id',
            s.name as 'source',
            p.name as 'name',
            p.url as 'url',
            rp.daily_check as 'dailyCheck',
            rp.alerts as 'alerts',
        FROM retardeds_products AS rp
        INNER JOIN retardeds AS r ON rp.retarded_id = r.id
        INNER JOIN products AS p ON rp.product_id = p.id
        INNER JOIN sources AS s ON p.source = s.id
        WHERE r.id = ? AND p.id = ?;`;

        databaseInstance.query<UserProductInformations>(query, [userid.toString(10), id.toString(10)]).then(async (userProductList) => {
            if (!userProductList && userProductList.length < 1) {
                reject('Not found');
                return;
            }
            const userProduct: UserProductInformations = userProductList[0];
            try {
                const productSource: Source = await getProductSource(id);

                getWebpageInfoFromURL(userProduct.url, productSource.queryStockSelector)
                    .then(urlDocument => {
                        resolve({...userProduct, status: getSourceStatus(productSource, urlDocument.split(' '))});
                    }).catch(error => {
                    reject(error)
                });
            } catch (error) {
                reject(error);
            }
        });
    });
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
