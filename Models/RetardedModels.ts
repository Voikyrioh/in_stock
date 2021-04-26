export interface RetardedAttribute {
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
    roles: string[];
    email?: string;
    firstname?: string;
    lastname?: string;
}