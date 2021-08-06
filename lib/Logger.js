class Logger {
    constructor() {}

    // FEATURE save logs periodically in a file

    log(message) {
        let date = new Date() / 1000;
        console.log(date+":", message);
    }

    logError(message) {
        let date = new Date() / 1000;
        console.log("ERROR", date+":", message);
    }
}

module.exports = Logger;