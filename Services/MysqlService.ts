import {ResultSetHeader} from "mysql2";

class MysqlConnexion {
    private static mysql = require('mysql2/promise')
    public databaseConnexion;
    
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

    insert(query: string, replacement?: string[]): Promise<number[]> {
        return new Promise(async (resolve, reject) => {
            try {
                let response: ResultSetHeader[] = await this.databaseConnexion.query(query, replacement);
                resolve(response.map(row => row?.insertId));
            } catch (e) {
                reject(e);
            }
        });
    }
    
    
}

const databaseInstance = new MysqlConnexion();

export default databaseInstance;