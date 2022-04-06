const Runner = require('../lib/Runner');
const Logger = require('../lib/Logger');
const winston = require('winston');
let logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'runner.js' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error'}),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }));
}
const cluster = require('cluster');

async function main() {
    let runner = new Runner();
}

logger.info(`started ${__filename} ${process.pid}`);
main().catch(e => logger.error(`${e}`));
// will need to ipc.config.unlink and then maybe stop server on sigint 
// if(cluster.isPrimary) {
//     for(let i = 0; i < 2; i++) {
//         cluster.fork();
//     }
// } else if(cluster.isWorker) {
//     logger.info(`start cluster node of runner with pid ${process.pid}`);
//     main().catch(e => {
//         console.error("CRITICAL ERROR:", e)
//         process.exit(1);
//     });
// }