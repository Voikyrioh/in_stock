import {Tables} from './DatabaseModels';

export const Keys: {[key: string]: string[]} = {
    [Tables.RETARDEDS]: [
        "id",
        "username",
        "password",
        "salt",
        "role",
        "email",
        "firstname",
        "lastname",
    ],
    [Tables.PRODUCTS]: [
        "id",
        "source",
        "name",
        "url",
    ],
    [Tables.SOURCES]: [
        "id",
        "name",
        "query_stock_selector",
        "corresponding_name",
    ],
    [Tables.RETARDED_PRODUCTS]: [
        "id",
        "retarded_id",
        "product_id",
        "custom_name",
        "daily_check",
        "alerts",
    ],
};
