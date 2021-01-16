export interface StockShop {
    name: string;
    correspondingName: {
        inStock: string;
        noStock: string;
    },
    stockObjectClassname?: string;
}

export interface StockSource {
    shop: StockShop;
    name: string;
    url: string;
}
