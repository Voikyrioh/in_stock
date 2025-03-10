import {WebserverSingleton} from "./core/controller/Webserver";

function main() {
    console.log("Starting webserver");
    const server = WebserverSingleton.getInstance();
}

main();