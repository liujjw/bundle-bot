const Runner = require('../lib/Runner');
const { createLogger, format, transports } = require('winston');
let logger = createLogger({
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
        new transports.File({ filename: 'error.log', level: 'error'}),
        new transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }));
}

async function main() {
    let runner = new Runner();
    logger.info(`started ${__filename}`);
}

main().catch(e => logger.error(`error in ${__filename} ${e}`));
// const cluster = require('cluster');
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