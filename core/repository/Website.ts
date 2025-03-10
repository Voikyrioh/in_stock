import Product from "../entities/Product";
import {StockType} from "../entities/enums";

export default abstract class Website {

    protected constructor(
        public readonly name: string,
        public readonly url: string
    ) {}

    protected stockMapper(selector: string): StockType {
        return StockType.IN_STOCK;
    }
    protected productMapper(data: [string, string][]): Product {
        return new Product('product', 0, StockType.IN_STOCK, '');
    }

    public getProduct(url: string): Promise<Product> {
        return Promise.resolve(new Product('product', 0, StockType.IN_STOCK, ''));
    }

    public searchProduct(query: string): Promise<Product[]> {
        return Promise.resolve([]);
    };
}