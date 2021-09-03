class Logger {
    constructor() {}

    // FEATURE save logs periodically in a file

    warn(message) {
        let date = new Date() / 1000;
        console.warn(date+":", message);
    }

    log(message) {
        let date = new Date() / 1000;
        console.log(date+":", message);
    }

    // use this when returning immediately afterwards
    erorr(message) {
        let date = new Date() / 1000;
        console.error("ERROR", date+":", message);
    }
}

module.exports = Logger;