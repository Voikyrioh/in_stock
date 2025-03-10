import Website from "../Website";
import {StockType} from "../../entities/enums";
import Product from "../../entities/Product";
import {Scrapper} from "../Scrapper";
import {assertPriceData, assertTextDataFromHTML} from "../../libraries/cleanData";

export default class LDLCWebsite extends Website {
    private constructor() {
        super('LDLC', 'https://www.ldlc.com');
    }

    public static getInstance(): LDLCWebsite {
        return new LDLCWebsite();
    }

    public static scrappingDataMapper(name: string, attribute: Record<string, string>): string | undefined {
        if (attribute && attribute.class) {
            if (attribute.class.includes('price')) {
                return 'price';
            }
            if (attribute.class.includes('title-1')) {
                return 'name';
            }
            if (attribute.class.includes('stock-')) {
                const stockStatus = Number(attribute.class.split(' ').find(className => className.includes('stock-'))!.split('-')[1]);
                if (!stockStatus) {
                    return;
                }
                if (stockStatus === 1) {
                    return 'inStock';
                }
                if (stockStatus === 9) {
                    return 'outOfStock';
                }
                return 'reprovisionning';
            }
        }
        return;
    }

    protected stockMapper(selector: string): StockType {
        switch (selector) {
            case 'inStock':
                return StockType.IN_STOCK;
            case 'outOfStock':
                return StockType.OUT_OF_STOCK;
            case 'reprovisionning':
                return StockType.RESTOCK_EXPECTED;
            default:
                return StockType.OUT_OF_STOCK;
        }
    }

    protected productMapper(data: [string, string][]): Product {
        const filteredData = new Map<string, string|number>();
        data.forEach(([name, value]) => {
            if (!filteredData.has(name) && value) {
                if (name === 'price') {
                    filteredData.set(name, assertPriceData(value))
                }
                if (name === 'name') {
                    filteredData.set(name, assertTextDataFromHTML(value))
                }
                if (['inStock', 'outOfStock', 'repovisionning'].includes(name)) {
                    filteredData.set('stockStatus', name)
                }
            }
        });

        const protoProduct = Object.fromEntries(filteredData.entries()) as {name?: string, price?: number, stockStatus?: string};

        return new Product(
            protoProduct.name ?? 'unknown',
            protoProduct.price ?? 0,
            this.stockMapper(protoProduct.stockStatus ?? 'unknown'),
        )
    }

    async getProduct(url: string): Promise<Product> {
        if(!url.startsWith(this.url)) {
            throw new Error(
                'TechnicalError: URL is not valid'
            );
        }
        const data = await Scrapper.fast(url,LDLCWebsite.scrappingDataMapper).search();
        const product = this.productMapper(data);
        product.url = url;

        return product;
    }

    searchProduct(query: string): Promise<Product[]> {
        return super.searchProduct(query);
    }
}