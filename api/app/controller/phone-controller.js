const token = require("../token.js");
const logger = require("../logger.js");
const eventBus = require('../eventBus.js');

const PhoneModel = require("../models/phone-model");
const ApplicationModel = require("../models/application-model");

exports.get = (phoneId, userId) => {

    return new Promise((resolve, reject) => {

        PhoneModel.get(phoneId, userId).then(phone => {

            if (phone === null || phone.userId !== userId) {
                return reject({ code: 404, "message": "Phone not found!" });
			}

            let response = {
                _id: phone._id,
                name: phone.name,
                active: phone.active,
                online: phone.online,
                token: phone.token
            };

            resolve(response);
			
        }).catch(err => {
            logger.error("Error on get phone", err);
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
		
		if (searchCriteria.online !== undefined && searchCriteria.online !== ""){
			criteria.online = searchCriteria.online === "YES";
		}
		
		if (searchCriteria.active !== undefined && searchCriteria.active !== ""){
			criteria.active = searchCriteria.active === "YES";
		}

	} catch (err) {
		criteria = {};
	}

	criteria.userId = userId;

    return new Promise((resolve, reject) => {

        PhoneModel.list(criteria,  {active: 1, name: 1, online: 1}, {name: 1}).then(items => {
            resolve(items);
        }).catch(err => {
            logger.error("Error on list phones", err);
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

            let phoneJson = {};
            phoneJson.name = entry.name;
            phoneJson.active = entry.active;
            phoneJson.userId = userId;

            PhoneModel.save(phoneJson).then(phone => {

                let tokenData = {role: "phone", phoneId: phone._id, userId: phone.userId};
                phone.token = token.generate(tokenData);

                return PhoneModel.save(phone).then(phone => {
                    resolve(phone);
                });
                
            }).catch(err => {
                logger.error("Error on save phone", err);
                reject({ code: 500, "message": err.message });
            });            

        }else{

            PhoneModel.get(entry._id).then(phone => {

                if (phone === null || phone.userId !== userId) {
                    return reject({ code: 500, "message": "Phone not found!" });
                }

                phone.name = entry.name;
                phone.active = entry.active;
            
                return PhoneModel.save(phone).then(() => {
                    if (!phone.active && phone.online){
                        eventBus.emit("disconnectPhone", {userId, phoneId: phone._id});
                    }
                    resolve(phone);
                });

            }).catch(err => {
                logger.error("Error on save phone", err);
                reject({ code: 500, "message": "Please try again!" });
            });            
  
        }
    });
};

exports.remove = (phoneId, userId) => {

    return new Promise((resolve, reject) => {

        PhoneModel.remove({_id: phoneId, userId}).then(numRemoved => {
            if (numRemoved === null || numRemoved === 0) {
                return reject({ code: 404, "message": "Phone not found!" });
            }
            eventBus.emit("disconnectPhone", {userId, phoneId});            
            resolve(numRemoved);
        }).catch(err => {
            logger.error("Error on remove phone", err);
            reject({ code: 500, "message": "Please try again!" });
        });

    });
};

exports.status = (userId, applicationId) => {

    return new Promise((resolve, reject) => {
        
		ApplicationModel.get(applicationId).then(application => {

			if (application === null || application.userId !== userId){
				throw new Error("Application not found!");
			}

			if (!application.active){
				throw new Error("Application is not active!");
            }
                    
            return PhoneModel.list({userId}).then(phones => {

                let total = phones.length;
                let active = 0;
                let online = 0;

                phones.forEach(phone => {
                    if (phone.active){
                        active++;
                    }
                    if (phone.online){
                        online++;
                    }
                });

                resolve({total, active, online});

            });

        }).catch(err => {

            logger.error("Error on get phone", err.message);
            reject({ code: 500, "message": err.message });

        });

    });
};

// The following methods will be used only by the server
exports.setOnline = (phoneId, online) => {

	PhoneModel.setOnline(phoneId, online).then(() => {
		//ok
	}).catch(err => {
		logger.error("Error on setOnline", err);
	});

};

exports.setAllOffline = () => {

	PhoneModel.setAllOffline().then(() => {
		//ok
	}).catch(err => {
		logger.error("Error on setAllOffline", err);
	});
};