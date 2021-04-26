import {Source, SourceAttributes} from "../Models/SourcesModels";
import databaseInstance from "./MysqlService";

function convertSourceAttributes(sources: SourceAttributes[]): Source[] {
    return sources.map(value => ({
        id: value.id,
        name: value.name,
        correspondingName: value.corresponding_name,
        queryStockSelector: value.query_stock_selector
    }))
}

export async function getAllSources(): Promise<Source[]> {
    const query = `SELECT * FROM sources;`;
    return convertSourceAttributes(await databaseInstance.query<SourceAttributes>(query));
}