const Datastore = require("nedb");

const dbUsers = new Datastore({
    inMemoryOnly: false,
    filename: "./data/sms-api-users.db",
    autoload: true
});

dbUsers.ensureIndex({ fieldName: "username", unique: true });


exports.getById = (userId) => {

    return new Promise((resolve, reject) => {

        dbUsers.find({_id: userId}, (err, users) => {
            if (err) {
                return reject(err);
            }

			resolve((users.length === 0) ? null : users[0]);
        });
    });
};

exports.getByUserName = (username) => {

    return new Promise((resolve, reject) => {

        dbUsers.find({username}, (err, users) => {
            if (err) {
                return reject(err);
            }

			resolve((users.length === 0) ? null : users[0]);
        });
    });
};

exports.save = (entry) => {
    
    return new Promise((resolve, reject) => {

        if (entry._id === undefined){
            dbUsers.insert(entry, (err, user) => {
                if (err) {
                    return reject(err);
                }
                
                resolve(user);
            });    
        }else{
            dbUsers.update({_id: entry._id}, entry, { multi: false }, (err, numUpdated) => {
                if (err) {
                    return reject(err);
                }
                
                resolve(numUpdated);
            });    
        }
    });
};