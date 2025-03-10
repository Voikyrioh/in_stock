import {StockType} from "./enums";

export default class Product {
    constructor(
        public name: string,
        public price: number,
        public stock: StockType,
        public url?: string
    ) {}
}