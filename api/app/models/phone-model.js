const Datastore = require("nedb");

const dbPhones = new Datastore({
    inMemoryOnly: false,
    filename: "./data/sms-api-phones.db",
    autoload: true
});

dbPhones.ensureIndex({ fieldName: "name", unique: false });
dbPhones.ensureIndex({ fieldName: "token", unique: true });
dbPhones.ensureIndex({ fieldName: "userId", unique: false });

exports.get = (phoneId) => {

    return new Promise((resolve, reject) => {

        dbPhones.find({_id: phoneId}, (err, phones) => {
            if (err) {
                return reject(err);
            }

			resolve((phones.length === 0) ? null : phones[0]);
        });
    });

};

exports.list = (criteria, fields, sortBy) => {

    return new Promise((resolve, reject) => {

        dbPhones.find(criteria, fields).sort(sortBy).exec((err, phones) => {
            if (err) {
                return reject(err);
            }

            resolve(phones);
        });
    });
};

exports.save = (entry) => {

    return new Promise((resolve, reject) => {

        if (entry._id === undefined){

            entry.token = entry.token || entry.userId;

            dbPhones.insert(entry, (err, phone) => {
                if (err) {
                    return reject(err);
                }
                resolve(phone);
                
            });    
        }else{
            dbPhones.update({_id: entry._id}, entry, { multi: false }, (err, numUpdated) => {
                if (err) {
                    return reject(err);
                }
                resolve(numUpdated);
            });    
        }
    });

};

exports.remove = (criteria) => {

    return new Promise((resolve, reject) => {

        dbPhones.remove(criteria, { multi: true }, (err, numRemoved) => {
            if (err) {
                return reject(err);
            }
            
            resolve(numRemoved);
        });    
    });
};

exports.setOnline = (phoneId, online) => {

    return new Promise((resolve, reject) => {

		dbPhones.update({_id: phoneId}, { $set: { online } }, { multi: false }, (err, numUpdated) => {
			if (err) {
				return reject(err);
			}

			resolve(numUpdated);
		});
		
	});
};

exports.setAllOffline = () => {

    return new Promise((resolve, reject) => {

		dbPhones.update({}, { $set: { online: false } }, { multi: true }, (err, numUpdated) => {
			if (err) {
				return reject(err);
			}

			resolve(numUpdated);
		});
		
	});
};