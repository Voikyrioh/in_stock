import {Source} from "./SourcesModels";

export interface FullProduct {
    source: Source;
    name: string;
    url: string;
}

export interface ProductInformations {
    shop: string;
    name: string;
    url: string;
    status?: string;
}

export interface ProductAttributes {
    id: number;
    source: string;
    name: string;
    url: string;
}