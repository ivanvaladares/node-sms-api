const MessageModel = require("../models/message-model");
const ApplicationModel = require("../models/application-model");
const logger = require("../logger.js");
const eventBus = require('../eventBus.js');
const moment = require("moment");


exports.getStatus = (messageId, applicationId, userId) => {

    return new Promise((resolve, reject) => {

		ApplicationModel.get(applicationId).then(application => {

			if (application === null || application.userId !== userId){
				throw new Error("Application not found!");
			}

			if (!application.active){
				throw new Error("Application is not active!");
			}		

			return MessageModel.get(messageId).then(message => {

				if (message === null || message.applicationId !== applicationId) {
					return reject({ code: 404, "message": "Message not found!" });
				}

				resolve({messageId, status: message.status});
			});
			
        }).catch(err => {
			logger.error("Error on getStatus message", err.message);
			reject({ code: 500, "message": err.message });
		});
    });
};

exports.send = (entry, applicationId, userId) => {

    return new Promise((resolve, reject) => {

        if (entry === undefined || entry.body === undefined || entry.phone === undefined){
            return reject({ code: 400, "message": "'body' and 'phone'' are required fields!" });
		}
	
		let phoneRegx = /^[+]?[ 0-9]{6,15}$/im;
		let arrPhoneNumber = entry.phone.split(",");
		
		for (let index = 0; index < arrPhoneNumber.length; index++) {
			
			if (!phoneRegx.test(arrPhoneNumber[index])){
				return reject({ code: 400, "message": "Phone number is invalid!" });
			}

			arrPhoneNumber[index] = arrPhoneNumber[index].replace(/[^+?0-9]/g, "").trim();
		}

		ApplicationModel.get(applicationId).then(application => {

			if (application === null || application.userId !== userId){
				throw new Error("Application not found!");
			}

			if (!application.active){
				throw new Error("Application is not active!");
			}

			let messageJson = {
				phone: arrPhoneNumber.join(","),
				body: entry.body,
				applicationId,
				userId,
				date: new Date().getTime(),
				status: "QUEUED",
				attempts: 0
			};

			return MessageModel.save(messageJson).then(message => {
				eventBus.emit("newSMS", message);
				resolve({messageId: message._id, status: message.status});
			});

		}).catch(err => {
			logger.error(err.message, err);
			reject({ code: 400, "message": err.message });
		});
    });
};

// The following method should be used only by admins

exports.get = (messageId, userId) => {

    return new Promise((resolve, reject) => {

        MessageModel.get(messageId).then(message => {
			
            if (message === null || message.userId !== userId) {
                return reject({ code: 404, "message": "Message not found!" });
			}
            
			let response = {
				_id: message._id,
				date: message.date,
				phone: message.phone,
				body: message.body,
				status: message.status
			};

			resolve(response);
			
        }).catch(err => {
			logger.error("Error on get messages", err);
			reject({ code: 500, "message": err.message });
		});
    });
};

exports.list = (searchCriteria, userId) => {

	let criteria = {};
	let timezoneOffset = 0;

	try {
		searchCriteria = JSON.parse(searchCriteria);

		if (searchCriteria.from !== undefined || searchCriteria.to !== undefined){

			timezoneOffset = searchCriteria.timezoneOffset || 0;
			timezoneOffset *= 60000;
			
			if (moment(searchCriteria.from, "DD/MM/YYYY").isValid()){
				criteria.date = {};
				criteria.date.$gt = moment(searchCriteria.from, "DD/MM/YYYY").add(timezoneOffset, 'ms').toDate().getTime(); 
			}
			if (moment(searchCriteria.to, "DD/MM/YYYY").isValid()){
				criteria.date = criteria.date || {};
				criteria.date.$lt = moment(searchCriteria.to, "DD/MM/YYYY").add(1, "days").add(timezoneOffset, 'ms').toDate().getTime(); // + 1 day
			}
		}

		if (searchCriteria.search !== undefined && searchCriteria.search !== ""){
			criteria.$or = [{ body: { $regex: new RegExp(searchCriteria.search.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi") }}, 	
							{ phone: { $regex: new RegExp(searchCriteria.search.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi") }}];
		}
		
		if (searchCriteria.status !== undefined && searchCriteria.status !== ""){
			criteria.status = searchCriteria.status;
		}

	} catch (err) {
		criteria = {};
	}

	criteria.userId = userId;

    return new Promise((resolve, reject) => {

        MessageModel.list(criteria, {phone: 1, date: 1, status: 1}, {date: -1}).then(items => {
            resolve(items);
        }).catch(err => {
			logger.error("Error on get messages", err);
			reject({ code: 500, "message": err.message });
		});
    });
};

exports.getStats = (searchCriteria, userId) => {

	let criteria = {};
	let timezoneOffset = 0;

	try {
		searchCriteria = JSON.parse(searchCriteria);

		if (searchCriteria.from !== undefined || searchCriteria.to !== undefined){
			
			timezoneOffset = searchCriteria.timezoneOffset || 0;
			timezoneOffset *= 60000;

			if (moment(searchCriteria.from, "DD/MM/YYYY").isValid()){
				criteria.date = {};
				criteria.date.$gt = moment(searchCriteria.from, "DD/MM/YYYY").add(timezoneOffset, 'ms').toDate().getTime(); 
			}
			if (moment(searchCriteria.to, "DD/MM/YYYY").isValid()){
				criteria.date = criteria.date || {};
				criteria.date.$lt = moment(searchCriteria.to, "DD/MM/YYYY").add(1, "days").add(timezoneOffset, 'ms').toDate().getTime(); // +1 day
			}
		}

		if (searchCriteria.applicationId !== ""){
			criteria.applicationId = searchCriteria.applicationId;
		}

	} catch (err) {
		criteria = {};
	}

	criteria.userId = userId;

    return new Promise((resolve, reject) => {

        MessageModel.list(criteria, {date: 1, status: 1}, {date: 1}).then(items => {

			let sent = {};
			let failed = {};
			let startDate = null;
			let endDate = 0; 

			items.forEach(message => {

				let messageDate = moment(message.date).subtract(timezoneOffset, 'ms').toDate();
				let dtTicks = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate()).getTime();

				if (startDate === null || dtTicks < startDate){
					startDate = dtTicks;
				}

				if (dtTicks > endDate) {
					endDate = dtTicks;
				}

				if (message.status === "FAILED") {
					if (failed[dtTicks] === undefined){
						failed[dtTicks] = 1;
					}else{
						failed[dtTicks]++;
					}
				}

				if (message.status === "SENT") {
					if (sent[dtTicks] === undefined){
						sent[dtTicks] = 1;
					}else{
						sent[dtTicks]++;
					}
				}

			});

			//fill with 0 the days without values
			let days = moment(endDate).diff(moment(startDate), "d", false);

			for (let i = 0; i <= days; i++) {
				let dtTicks = moment(startDate).add(i, "days").toDate().getTime();

				if (failed[dtTicks] === undefined){
					failed[dtTicks] = 0;
				}
			
				if (sent[dtTicks] === undefined){
					sent[dtTicks] = 0;
				}
			}

			//transform the key/value dictionary to array
			let arrFailed = Object.keys(failed).map((key) => { 
				return [parseFloat(key), failed[key]]; 
			});

			let arrSent = Object.keys(sent).map((key) => { 
				return [parseFloat(key), sent[key]]; 
			});

			//sort them ascending by day
			arrFailed.sort((a, b) => { return a[0] - b[0]; });
			arrSent.sort((a, b) => { return a[0] - b[0]; });

			resolve({failed: arrFailed, sent: arrSent});
			
        }).catch(err => {
			logger.error("Error on get getStats", err);
			reject({ code: 500, "message": err.message });
		});
    });
};

// The following methods will be used only by the phone
exports.setSent = (messageId, phoneId) => {

    return new Promise((resolve, reject) => {

		MessageModel.setSent(messageId, phoneId).then(() => {
			resolve("OK");
		}).catch(err => {
			logger.error("Error on setSent of a message", err);
			reject({ code: 500, "message": "Please try again!" });
		}); 
	});
};

// The following methods will be used only by the server
exports.setFailed = (messageId) => {

	MessageModel.setFailed(messageId).then(() => {
		return true;
	}).catch(err => {
		logger.error("Error on setFailed", err);
	});
};

exports.setPhone = (messageId, phoneId) => {

	MessageModel.setPhone(messageId, phoneId).then(() => {
		return true;
	}).catch(err => {
		logger.error("Error on setFailed", err);
	});
};