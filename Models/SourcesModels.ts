export interface Source {
    id: number;
    name: string;
    correspondingName: {
        inStock: string;
        noStock: string;
    },
    queryStockSelector?: string;
}

export interface SourceAttributes {
    id: number,
    name: string;
    corresponding_name: {
        inStock: string;
        noStock: string;
    },
    query_stock_selector?: string;
}