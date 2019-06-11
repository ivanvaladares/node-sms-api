const Jwt = require("jsonwebtoken");
const crypto = require("./crypto.js");
const logger = require("./logger.js");

module.exports = {

    isAuthenticated: function (req, res, next) {

        try {

            let decryptedToken = crypto.decrypt(req.headers.authorization);
            let token = Jwt.verify(decryptedToken, process.env.TOKEN_KEY);

            req.userId = token.userId;
            req.applicationId = token.applicationId;
            req.phoneId = token.phoneId;
            req.role = token.role;
    
            return next();

        } catch (err) {
			logger.warn("Unauthorized attempt!", err);
			if (err.message === "jwt expired") {
                return res.status(401).send({ "message": "Your token has expired!" });
            }else{
                return res.status(400).send({ "message": "Your token is incorrect or missing!" });
            }
        }        
    },

    mustBeAdmin: function (req, res, next) {

        if (req.role !== "admin"){
            logger.warn("Unauthorized attempt!", "You are not authorized!");
            return res.status(401).send({ "message": "You are not authorized!" });
        }    

        return next();
    },

    generate: function (tokenData, expiresIn) {
        let options = {};
        if (expiresIn !== undefined) {
            options.expiresIn = expiresIn;
        }

        return crypto.encrypt(Jwt.sign(tokenData, process.env.TOKEN_KEY, options));
    },
    
    decode: function (encriptedToken) {
        try {
            return Jwt.verify(crypto.decrypt(encriptedToken), process.env.TOKEN_KEY);
        } catch (err) {
            return null;
        }          
    }
};