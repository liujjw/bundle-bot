/**
 * @notice appears to run at the root of the project, make paths accordingly
 */

const { createLogger, format, transports, config } = require("winston");
const fs = require('fs');
const logDir = 'logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),

  transports: [
    new transports.File({ filename: "./logs/error.log", level: "error" }),
    new transports.File({ filename: "./logs/combined.log", level: "info" })
  ],
});

logger.add(
  new transports.Console({
    format: format.combine(
      format.colorize(), 
      format.simple(), 
      format.errors({ stack: true })
    ),
    level: "info"
  })
);

module.exports = logger;