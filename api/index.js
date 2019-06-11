require('dotenv').config();

process.env.TZ = "utc";

if (process.env.APPLICATION_INSIGHTS_KEY){
	const appInsights = require('applicationinsights');
	appInsights.setup(process.env.APPLICATION_INSIGHTS_KEY).start();
}

//#############################################################################

const logger = require("./app/logger.js");

process.on("uncaughtException", (err) => {
	logger.error("uncaughtException", err);
});

//#############################################################################

const Server = require("./app/server.js").init();

Server.open({ port: process.env.PORT || 3000 }, (err) => {
	if (err) {
		logger.error("HTTP Server error!!!", err);
	}
});