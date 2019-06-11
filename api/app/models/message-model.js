const Datastore = require("nedb");

const dbMessages = new Datastore({
	inMemoryOnly: false,
	filename: "./data/sms-api-messages.db",
	autoload: true
});

dbMessages.ensureIndex({ fieldName: "date", unique: false });
dbMessages.ensureIndex({ fieldName: "status", unique: false });
dbMessages.ensureIndex({ fieldName: "applicationId", unique: false });
dbMessages.ensureIndex({ fieldName: "userId", unique: false });

exports.get = (messageId) => {

	return new Promise((resolve, reject) => {

		dbMessages.find({ _id: messageId }, (err, messages) => {
			if (err) {
				return reject(err);
			}

			resolve((messages.length === 0) ? null : messages[0]);
		});
	});

};

exports.list = (criteria, fields, sortBy) => {

	return new Promise((resolve, reject) => {

		dbMessages.find(criteria, fields).sort(sortBy).exec((err, messages) => {
			if (err) {
				return reject(err);
			}

			resolve(messages);
		});
	});
};

exports.count = (criteria) => {

	return new Promise((resolve, reject) => {

		dbMessages.count(criteria, (err, count) => {
			if (err) {
				return reject(err);
			}

			resolve(count);
		});
	});
};

exports.save = (entry) => {

	return new Promise((resolve, reject) => {

		dbMessages.insert(entry, (err, message) => {
			if (err) {
				return reject(err);
			}

			resolve(message);
		});
	});
};

exports.setPhone = (messageId, phoneId) => {

	return new Promise((resolve, reject) => {

		dbMessages.update({ _id: messageId }, { $set: { phoneId: phoneId } }, (err, message) => {
			if (err) {
				return reject(err);
			}

			resolve(message);
		});

	});

};


exports.setSent = (messageId, phoneId) => {

	return new Promise((resolve, reject) => {

		dbMessages.update({ _id: messageId, phoneId }, { $set: { status: "SENT" } }, (err) => {
			if (err) {
				return reject(err);
			}

			resolve("OK");
		});
	});
};

exports.setFailed = (messageId) => {

	return new Promise((resolve, reject) => {

		let criteria = {};
		
		if (messageId) {
			criteria._id = messageId;
		} else {
			criteria.date = {};
			criteria.date.$lt = new Date().getTime() - 60000; //1 minutes has passed since the messa was send
			criteria.status = "QUEUED";
		}

		dbMessages.update(criteria, { $set: { status: 'FAILED' } }, { multi: true }, (err, numUpdated) => {
			if (err) {
				return reject(err);
			}

			resolve(numUpdated);
		});

	});

};