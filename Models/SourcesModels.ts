export interface Source {
    name: string;
    correspondingName: {
        inStock: string;
        noStock: string;
    },
    stockObjectClassname?: string;
}