const token = require("../token.js");
const logger = require("../logger.js");

const ApplicationModel = require("../models/application-model");
const MessageModel = require("../models/message-model");

exports.get = (applicationId, userId) => {

    return new Promise((resolve, reject) => {

        ApplicationModel.get(applicationId).then(application => {

            if (application === null || application.userId !== userId) {
                return reject({ code: 404, "message": "Application not found!" });
            }
            
			return MessageModel.count({applicationId}).then(totalMessages => {

                let response = {
                    _id: application._id,
                    name: application.name,
                    active: application.active,
                    token: application.token,
                    totalMessages
                };

				resolve(response);
            });
			
        }).catch(err => {
            logger.error("Error on get application", err);
            reject({ code: 500, "message": "Please try again!" });
        });

    });
};

exports.list = (searchCriteria, userId) => {

	let criteria = {};

	try {
		searchCriteria = JSON.parse(searchCriteria);

		if (searchCriteria.search !== undefined && searchCriteria.search !== ""){
			criteria.$or = [{ name: { $regex: new RegExp(searchCriteria.search.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi") }}];
		}

		if (searchCriteria.active !== undefined && searchCriteria.active !== ""){
			criteria.active = searchCriteria.active === "YES";
		}

	} catch (err) {
		criteria = {};
	}

	criteria.userId = userId;

    return new Promise((resolve, reject) => {

        ApplicationModel.list(criteria, {active: 1, name: 1}, {name: 1}).then(applications => {
            resolve(applications);
        }).catch(err => {
            logger.error("Error on list applications", err);
            reject({ code: 500, "message": "Please try again!" });
        });

    });
};

exports.save = (entry, userId) => {

    return new Promise((resolve, reject) => {

        if (entry === undefined || entry.name === undefined){
            return reject({ code: 400, "message": "Name is a required field!" });
        }

        if (entry._id === undefined){

            let applicationJson = {};
            applicationJson.name = entry.name;
            applicationJson.active = entry.active;
            applicationJson.userId = userId;

            ApplicationModel.save(applicationJson).then(application => {

                let tokenData = {role: "application", applicationId: application._id, userId: application.userId};
                application.token = token.generate(tokenData);
            
                return ApplicationModel.save(application).then(application => {
                    resolve(application);
                });

            }).catch(err => {
                logger.error("Error on save application", err);
                reject({ code: 500, "message": err.message });
            });            

        }else{

            ApplicationModel.get(entry._id).then(application => {

                if (application === null || application.userId !== userId) {
                    throw new Error("Application not found!");
                }

                application.name = entry.name;
                application.active = entry.active;
            
                return ApplicationModel.save(application).then(() => {
                    resolve(application);
                });

            }).catch(err => {
                logger.error("Error on save application", err);
                reject({ code: 500, "message": "Please try again!" });
            });            
  
        }

    });
};

exports.remove = (applicationId, userId) => {

    return new Promise((resolve, reject) => {

        ApplicationModel.remove({_id: applicationId, userId}).then(numRemoved => {
            if (numRemoved === null || numRemoved === 0) {
                return reject({ code: 404, "message": "Application not found!" });
            }
            
            resolve(numRemoved);

        }).catch(err => {
            logger.error("Error on remove application", err);
            reject({ code: 500, "message": "Please try again!" });
        });

    });
};