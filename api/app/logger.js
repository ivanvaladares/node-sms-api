const util = require("util");
const Logger = require("nedb-logger");
const logger = new Logger({ filename: "./data/sms-api-logs.db" });

const getDetails = (details) => {
	try {
		return util.inspect(details, { showHidden: true, depth: null });
	} catch (error) {
		return details;
	}
};

const log = (type, message, details) => {
	let date = new Date();
	let fullDetails = "";
	if (details){
		fullDetails = getDetails(details);
	}
	if (process.env.ENVIRONMENT === "DEV"){
		console.log(type, message, fullDetails);
		return;
	}
	logger.insert({type, date, message, details: fullDetails});
};

exports.error = (message, details) => {
	log("error", message, details);
};

exports.info = (message, details) => {
	log("info", message, details);
};

exports.warn = (message, details) => {
	log("warn", message, details);
};
