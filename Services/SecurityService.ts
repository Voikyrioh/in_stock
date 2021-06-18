import {RetardedAttribute} from "../Models/RetardedModels";
import {getRetardedById} from "./RetardedService";

export async function hashPassword(password: string, salt?: string): Promise<{hash: string, salt: string}> {
    const bcrypt = require('bcrypt');
    if (!salt) {
        salt = await bcrypt.genSalt(10);
    }
    const hash = await bcrypt.hash(password, salt);
    return {hash, salt}
}

export async function verifyPassword(hash: string, salt: string, against: string): Promise<boolean> {
    const hashedPassword = await hashPassword(against, salt);
    return hashedPassword.hash === hash;
}

export function generateAccessToken(retardId, retardRoles): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign({id: retardId, roles: retardRoles}, process.env.RETARD_TOKEN_SECRET, { expiresIn: '3600s' });
}

export function getCookies(cookies: string): {name: string, value: string}[] {
    return cookies?.split(';')?.map(cookie => {
        const cookieTab = cookie.split('=');
        return {name: cookieTab[0].trim(), value: cookieTab[1]}
    });
}

export function authenticateAccessToken(token): Promise<RetardedAttribute> {
    const jwt = require('jsonwebtoken');
    return new Promise<RetardedAttribute>((resolve, reject) => {
        if (!token) {
            reject('no token provided')
        }
        jwt.verify(token, process.env.RETARD_TOKEN_SECRET as string, (err: any, user: {id: number, roles: string[]}) => {
            if (err) {
                reject(err);
                return;
            }
            getRetardedById(user.id).then(retarded => {
                if (!retarded) {
                    reject("user in token does not exist");
                }
                resolve(retarded);
            }).catch(err => {
                console.error(err);
                reject('internal error');
            })
        })
    })
}

export function checkPasswordSecurity(password: string): string {
    // Password Should contain a least : 
    // eight characters
    if (password.length < 8) {
       return 'password too short';
    }
    // one uppercase letter
    if (!password.match(/[A-Z]/u)) {
        return 'password need at least one uppercase letter';
    }
    // one lowercase letter
    if (!password.match(/[a-z]/u)) {
        return 'password need at least one lowercase letter';
    }
    // one special character
    if (!password.match(/[&@?#!$]/u)) {
        return 'password need at least one special character';
    }
    // one number
    if (!password.match(/[0-9]/u)) {
        return 'password need at least one number';
    }
    
    return null;
}

export function checkRequiredBodyFields(req ,res, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
        if (!req?.body?.hasOwnProperty(field)) {
            res.sendStatus(400);
            return false;
        }
    }
    return true
}

export function authenticate(req, res, next) {
    if (!req?.headers?.cookie) {
        res.status(401);
        res.send('no jwt provided');
        return;
    }
    
    const jwtCookie = getCookies(req.headers.cookie)?.find(cookie => cookie.name === 'jwt');
    authenticateAccessToken(jwtCookie?.value).then(auth => {
        if (!auth) {
            res.status(400);
            res.send('incorrect token');
            return;
        }
        res.role = auth.role
        res.userId = auth.id
        next();
    }, reason => {
        res.status(401);
        res.send(reason);
        return;
    })
}

export const Roles = ['RETARDED','MORONDERATOR','ADMINIDIOT'];

export function checkRoles(res, role): boolean {
    if (!res.role || !Roles.includes(res.role)) {
        res.status(401);
        res.send();
        return false;
    }
    if (Roles.indexOf(res.role) < Roles.indexOf(role)) {
        res.status(403);
        res.send();
        return false;
    }
    return true;
}