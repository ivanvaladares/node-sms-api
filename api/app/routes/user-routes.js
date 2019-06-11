const express = require("express");
const { sanitizeBody } = require('express-validator/filter');
const tokenHelper = require("../token.js");
const UserController = require("../controller/user-controller");
const router  = express.Router();

const login = (req, res) => {

    UserController.login(req.body).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    

};

const create = (req, res) => {

    UserController.create(req.body).then(result => {
        
        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    

};

const refreshToken = (req, res) => {

    UserController.refreshToken(req.userId).then(result => {

        res.json(result);

    }).catch(err => {
        res.status(err.code).json({ "code": err.code, "message": err.message });
    });    
    
};


router.post("/login", sanitizeBody('*').trim().escape(), login);
router.post("/create", sanitizeBody('*').trim().escape(), create);

// The following method should be used only by admins
router.get("/refreshToken", tokenHelper.isAuthenticated, tokenHelper.mustBeAdmin, refreshToken);

module.exports = router;