import {TableAttribute} from "../build/Models/DatabaseModels";

export interface RetardedAttribute extends TableAttribute {
    id: number;
    username: string;
    password: string;
    salt: string;
    role: string;
    email?: string;
    firstname?: string;
    lastname?: string;
}

export interface RetardedInfo {
    id: number;
    username: string;
    role: string;
    email?: string;
    firstname?: string;
    lastname?: string;
}