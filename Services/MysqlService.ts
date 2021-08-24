import {ResultSetHeader} from "mysql2";
import {Tables, TableAttribute} from "../Models/DatabaseModels";
import {Keys} from "../Models/Keys";

class MysqlConnexion {
    private static mysql = require('mysql2/promise')
    public databaseConnexion;

    private static getFieldAndAttributes<T extends TableAttribute>(table: Tables, attributes: T): [fields: string[], replacements: string[], id: number] {
        const fields = [];
        const replacements = [];

        for (const attribute of Object.getOwnPropertyNames(attributes)) {
            if (Keys[table].includes(attribute) && attribute !== 'id' && attribute!== null) {
                fields.push(attribute);
                replacements.push(attributes[attribute]);
            }
        }

        return [fields, replacements, attributes.id];
    }

    connectDatabase(configuration) {
        return MysqlConnexion.mysql.createConnection(configuration).then(connexion => {
            this.databaseConnexion = connexion;
        });
    }

    query<T>(query: string, replacement?: string[]): Promise<T[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const response: [fields: T[], rows: any] = await this.databaseConnexion.query(query, replacement);
                resolve(response[0].map(i => JSON.parse(JSON.stringify(i)) as T))
            } catch (e) {
                reject(e);
            }
        });
    }

    insert<T extends TableAttribute>(table: Tables, tableAttribute: T): Promise<number[]> {
        const [fields, replacements, id] = MysqlConnexion.getFieldAndAttributes(table, tableAttribute);
        const query = `INSERT INTO retardeds (${fields.join(',')})  VALUES (${fields.map(fields => '?').join(',')})`
        return new Promise(async (resolve, reject) => {
            try {
                let response: ResultSetHeader[] = await this.databaseConnexion.query(query, replacements);
                resolve(response.map(row => row?.insertId));
            } catch (e) {
                reject(e);
            }
        });
    }

    updateOne<T extends TableAttribute>(table: Tables, tableAttribute: T): Promise<number[]> {
        return new Promise(async (resolve, reject) => {
            const [fields, replacements, id] = MysqlConnexion.getFieldAndAttributes(table, tableAttribute);
            const query = `UPDATE ${table} SET ${fields.map(field => {
                return `${field}=?`
            }).join(',')} WHERE id = ?`;
            replacements.push(id.toString(10));

            try {
                let response: ResultSetHeader[] = await this.databaseConnexion.query(query, replacements);
                resolve(response.map(row => row?.insertId));
            } catch (e) {
                reject(e);
            }
        });
    }
}

const databaseInstance = new MysqlConnexion();

export default databaseInstance;
