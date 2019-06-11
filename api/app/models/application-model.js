const Datastore = require("nedb");

const dbApplications = new Datastore({
    inMemoryOnly: false,
    filename: "./data/sms-api-applications.db",
    autoload: true
});

dbApplications.ensureIndex({ fieldName: "name", unique: false });
dbApplications.ensureIndex({ fieldName: "token", unique: true });
dbApplications.ensureIndex({ fieldName: "userId", unique: false });

exports.get = (applicationId) => {

    return new Promise((resolve, reject) => {

        dbApplications.find({_id: applicationId}, (err, applications) => {
            if (err) {
                return reject(err);
            }

            resolve((applications.length === 0) ? null : applications[0]);
        });
    });
};

exports.list = (criteria, fields, sortBy) => {

    return new Promise((resolve, reject) => {

        dbApplications.find(criteria, fields).sort(sortBy).exec((err, applications) => {
            if (err) {
                return reject(err);
            }

            resolve(applications);
        });
    });
};

exports.save = (entry) => {

    return new Promise((resolve, reject) => {

        if (entry._id === undefined){

            entry.token = entry.token || entry.userId;

            dbApplications.insert(entry, (err, application) => {
                if (err) {
                    return reject(err);
                }
                resolve(application);
            });

        }else{
            dbApplications.update({_id: entry._id}, entry, { multi: false }, (err, numUpdated) => {
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

        dbApplications.remove(criteria, { multi: true }, (err, numRemoved) => {
            if (err) {
                return reject(err);
            }
            
            resolve(numRemoved);
        });    
    });    
};