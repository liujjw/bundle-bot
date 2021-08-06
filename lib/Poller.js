const fetch = require('node-fetch');
const crypto = require('crypto');

const { ENDPOINTS } = require('./Constants');

require('dotenv').config({ path: __dirname + "/../.env"});

class Poller {
    async pollCoinbase() {
        let CB_ACCESS_TIMESTAMP = Date.now() / 1000;
        let CB_ACCESS_KEY = process.env.CB_API_KEY;
        let CB_ACCESS_PASSPHRASE = process.env.CB_API_PASSPHRASE;

        let secret = process.env.CB_API_SECRET;
        let key = Buffer.from(secret, 'base64');
        let hmac = crypto.createHmac('sha256', key);
        let requestPath = '/oracle';
        let method = "GET";
        let what = CB_ACCESS_TIMESTAMP + method + requestPath;
        let CB_ACCESS_SIGN = hmac.update(what).digest('base64');

        let response = await fetch(ENDPOINTS.COINBASE_REPORTER, {
            method: "GET",
            headers: {
                "CB-ACCESS-SIGN": CB_ACCESS_SIGN,
                "CB-ACCESS-TIMESTAMP": CB_ACCESS_TIMESTAMP,
                "CB-ACCESS-KEY": CB_ACCESS_KEY,
                "CB-ACCESS-PASSPHRASE": CB_ACCESS_PASSPHRASE
            }
        });
        return await response.text();
        // await fetch(LOCAL.RUNNER_ROOT + LOCAL.RUNNER_REPORTER_POST_PATH, {
        //     method: "POST",
        //     body: await response.text()
        // });
    }
}

module.exports = Poller;