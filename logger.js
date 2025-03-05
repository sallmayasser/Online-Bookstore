const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

// Define your custom format
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
    level: 'debug',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({ level: 'debug' }), // Logs everything to console
        new transports.File({ filename: 'app.log', level: 'debug' })

    ]

});

module.exports = logger;
