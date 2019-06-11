const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const tokenHelper = require("../token.js");
const MessageController = require("../controller/message-controller");
const router  = express.Router();

const getStatus = (req, res) => {

    MessageController.getStatus(req.params.messageId, req.applicationId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const send = (req, res) => {

    let message = {
        phone: req.body.phone,
        body: req.body.body
    };

    if (req.role === "admin"){
        req.applicationId  = req.body.application;
    }

    MessageController.send(message, req.applicationId, req.userId).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });
    
};

const get = (req, res) => {

    MessageController.get(req.params.messageId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const list = (req, res) => {

    MessageController.list(req.query.criteria, req.userId).then(results => {

        res.json(results);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const getStats = (req, res) => {

    MessageController.getStats(req.query.criteria, req.userId).then(results => {

        res.json(results);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};


/**
 * @typedef Message
 * @property {string} body.required
 * @property {string} phone.required
 */
/**
 * @typedef MessageResponse
 * @property {string} messageId
 * @property {string} status
 */
/**
 * @typedef Error
 * @property {number} code 
 * @property {string} message 
 */

 
/**
 * @route GET /message/status/{messageId}
 * @group Message
 * @param {string} messageId.path.required  
 * @produces application/json
 * @consumes application/json
 * @returns {MessageResponse.model} Success
 * @returns {Error.model} Error 
 * @security JWT
 */

router.get("/status/:messageId", tokenHelper.isAuthenticated, getStatus);


/**
 * @route POST /message/send
 * @group Message
 * @param {Message.model} message.body.required - Message DTO 
 * @produces application/json
 * @consumes application/json
 * @returns {Message.model} Success
 * @returns {Error.model} Error
 * @security JWT
 */

router.post("/send", sanitizeBody('*').trim().escape(), tokenHelper.isAuthenticated, send);

// The following method should be used only by admins
router.get("/get/:messageId", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, get);
router.get("/list", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, list);
router.get("/stats", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, getStats);

module.exports = router;