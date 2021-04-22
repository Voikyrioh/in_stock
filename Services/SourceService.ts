import {Source} from "../Models/SourcesModels";

export function getAllSources(): Source[] {
    return require('../Configuration/sources-type.json') as Source[];
}