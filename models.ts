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

export interface StockSourceInformations {
    shop: string;
    name: string;
    url: string;
    status?: string;
}
