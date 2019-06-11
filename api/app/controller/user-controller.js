const UserModel = require("../models/user-model");
const token = require("../token.js");
const crypto = require("../crypto.js");
const logger = require("../logger.js");


exports.login = (entry) => {

    return new Promise((resolve, reject) => {

        if (entry === undefined || entry.userName === undefined || entry.userPass === undefined){
            return reject({ code: 400, "message": "Username and password are required!" });
		}

		UserModel.getByUserName(entry.userName).then(user => {

            if (user === null) {
                return reject({ code: 401, "message": "Username or password is incorrect!" });
			}

			let encryptedPass = "";

			try {
				encryptedPass = crypto.hash(entry.userPass, user.salt);
			} catch (error) {
                logger.error("Error on encrypting users pass", error);
                return reject({ code: 500, "message": "An error ocurred. Please try again." });
			}

			if (user.password !== encryptedPass) {
                return reject({ code: 401, "message": "Username or password is incorrect!" });
			}

			let tokenData = {role: "admin", userId: user._id};
			resolve(token.generate(tokenData, "30m"));			

		}).catch(err => {
			logger.error("Error on login user", err);
			reject({ code: 500, "message": "An error ocurred. Please try again." });
		});

	});
};

exports.create = (entry) => {

    return new Promise((resolve, reject) => {

        if (entry === undefined || entry.userName === undefined || entry.userPass === undefined || entry.userPassRepeated === undefined){
            return reject({ code: 400, "message": "All fields are required!" });
		}

        if (entry.userName.length < 5 || entry.userName.length > 50){
            return reject({ code: 400, "message": "Username must have 5 to 50 chars!" });
		}

        if (entry.userPass.length < 5 || entry.userPass.length > 50){
            return reject({ code: 400, "message": "Password must have 5 to 50 chars!" });
		}

        if (entry.userPassRepeated !== entry.userPass){
            return reject({ code: 400, "message": "Passwords did not match!" });
		}

		let strongPassRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])");

		if(!strongPassRegex.test(entry.userPass)) {
            return reject({ code: 400, "message": "This password is too weak!" });
		}

		UserModel.getByUserName(entry.userName).then(user => {

            if (user !== null) {
                return reject({ code: 500, "message": "Please pick another username!" });
			}
			
			let salt = crypto.genRandomSalt(16);
			let encryptedPass = "";

			try {
				encryptedPass = crypto.hash(entry.userPass, salt);
			} catch (error) {
                logger.error("Error on encrypting users pass", error);
                return reject({ code: 500, "message": "An error ocurred. Please try again." });
			}
			
			return UserModel.save({username: entry.userName, salt, password: encryptedPass}).then(user => {
				let tokenData = {role: "admin", userId: user._id};
				resolve(token.generate(tokenData, "30m"));			
			});

		}).catch(err => {
			logger.error("Error on saving user", err);
			reject({ code: 500, "message": "An error ocurred. Please try again." });
		});
	});
};

exports.refreshToken = (userId) => {

    return new Promise((resolve, reject) => {

		try {

			return UserModel.getById(userId).then(user => {

				if (user === null){
					return reject({ code: 500, "message": "Could not refresh your token." });
				}

				let tokenData = {role: "admin", userId: userId};
				resolve(token.generate(tokenData, "20m"));
			});

		} catch (error) {
			logger.error("Error on refreshing users token", error);
			return reject({ code: 500, "message": "An error ocurred. Please try again." });
		}
		
	});

};