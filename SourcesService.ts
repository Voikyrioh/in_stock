import {StockSource} from "./models";
import {getSources, getWebpageInfoFromURL} from "./NetworkService";


const colors = {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m"
}

const stockColorcode = {
    "inStock": "green",
    "noStock": "red",
    "supply": "yellow",
    "null": "yellow"
}

const correspondingNames = {
    "inStock": "En stock !",
    "noStock": "En rupture",
    "supply": "Bientôt en stock",
    "null": "IDK !"
}

function showInfoStatus(source: StockSource, classlist: string[]) {
    let stockState = "null";

    for (let status in source.shop.correspondingName) {
        if (classlist.includes(source.shop.correspondingName[status])) {
            stockState = status;
        }
    }

    console.log(`\x1b[1m${colors.cyan}[${source.shop.name}]${colors.white} - ${source.name} : ${colors[stockColorcode[stockState]]}${correspondingNames[stockState]}`)
}

function check(source: StockSource) {

    getWebpageInfoFromURL(source.url, source.shop.stockObjectClassname)
        .then(urlDocument => {
            showInfoStatus(source, urlDocument.split(' '));
        })
        .catch(error => {
            console.error(error)
        })
}

getSources().then(sources => {
    for (let source of sources) {
        check(source);
    }
})