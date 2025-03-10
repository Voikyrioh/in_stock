import LDLCWebsite from "./websites/LDLC";

export type WebsiteNames = 'LDLC';

export default class WebsiteBuilder {
    static getWebsite(name: WebsiteNames) {
        switch (name) {
            case 'LDLC':
                return LDLCWebsite.getInstance();
            default:
                throw new Error('TechnicalError: Website not handled');
        }
    }
}