const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const tokenHelper = require("../token.js");
const PhoneController = require("../controller/phone-controller");
const router  = express.Router();

const get = (req, res) => {

    PhoneController.get(req.params.phoneId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const list = (req, res) => {

    PhoneController.list(req.query.criteria, req.userId).then(results => {

        res.json(results);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const save = (req, res) => {

    PhoneController.save(req.body, req.userId).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    

};

const remove = (req, res) => {

    PhoneController.remove(req.params.phoneId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const status = (req, res) => {

    PhoneController.status(req.userId, req.applicationId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};


/**
 * @typedef StatusResponse
 * @property {number} total
 * @property {number} active
 * @property {number} online
 */

/**
 * @route GET /phone/status/
 * @group Phone
 * @produces application/json
 * @consumes application/json
 * @returns {StatusResponse.model} Success
 * @returns {Error.model} Error 
 * @security JWT
 */

router.get("/status/", tokenHelper.isAuthenticated, status);


router.get("/get/:phoneId", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, get);
router.get("/list", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, list);
router.post("/save", sanitizeBody('*').trim().escape(), tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, save);
router.delete("/:phoneId", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, remove);

module.exports = router;