const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const tokenHelper = require("../token.js");
const ApplicationController = require("../controller/application-controller");
const router  = express.Router();

const get = (req, res) => {

    ApplicationController.get(req.params.applicationId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const list = (req, res) => {

    ApplicationController.list(req.query.criteria, req.userId).then(results => {

        res.json(results);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

const save = (req, res) => {

    ApplicationController.save(req.body, req.userId).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    

};

const remove = (req, res) => {

    ApplicationController.remove(req.params.applicationId, req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};

router.get("/get/:applicationId", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, get);
router.get("/list", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, list);
router.post("/save", sanitizeBody('*').trim().escape(), tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, save);
router.delete("/:applicationId", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, remove);

module.exports = router;