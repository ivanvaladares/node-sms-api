const EventEmitter = require('events');
const logger = require("./logger.js");

const emitter = new EventEmitter();

emitter.on('uncaughtException', (err) => {
    logger.error("Error on eventBus", err);
});

module.exports = emitter;