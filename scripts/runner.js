const Runner = require('../lib/Runner');
const Logger = require('../lib/Logger');
const logger = new Logger();

const cluster = require('cluster');

async function main() {
    let runner = new Runner();
}

logger.log(`${__filename} ${process.pid}`);
main().catch(e => logger.log(e));
// will need to ipc.config.unlink and then maybe stop server on sigint 
// if(cluster.isPrimary) {
//     for(let i = 0; i < 2; i++) {
//         cluster.fork();
//     }
// } else if(cluster.isWorker) {
//     logger.log(`start cluster node of runner with pid ${process.pid}`);
//     main().catch(e => {
//         console.error("CRITICAL ERROR:", e)
//         process.exit(1);
//     });
// }