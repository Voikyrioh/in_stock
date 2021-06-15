import {Source} from "./SourcesModels";

export interface FullProduct {
    source: Source;
    name: string;
    url: string;
}

export interface ProductInformations {
    source: string;
    name: string;
    url: string;
    status?: string;
}

export interface ProductAttributes {
    id: number;
    source: number;
    name: string;
    url: string;
}

export interface UserProductInformations {
    id: number;
    source: string;
    name: string;
    url: string;
    status?: string;
    dailyCheck?: boolean;
    alerts?: boolean;
}