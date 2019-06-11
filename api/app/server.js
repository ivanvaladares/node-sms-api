const express = require("express");
const compression = require('compression');
const ejs = require('ejs');
const cors = require('cors');
const WebSocketServer = require('ws').Server;
const bodyParser = require("body-parser");
const token = require("./token.js");
const logger = require("./logger.js");
const eventBus = require('./eventBus.js');
const path = require("path");
const MessageController = require("./controller/message-controller.js");
const PhoneController = require("./controller/phone-controller.js");

class HttpServer {

    constructor() {

        this.app = express();
        this.server = null;

        const expressSwagger = require('express-swagger-generator')(this.app);

        let options = {
            swaggerDefinition: {
                info: {
                    description: `To create applications and connect your phone, go to: <a href="/admin">/admin</a> 
                                    <br />
                                    Visit our <a href="/privacy_policy.html">Privacy Policy</a> and <a href="/terms_and_conditions.html">Terms &amp; Conditions</a>.
                                    <hr />
                                    <small><p><i>This is a test environment and all data can be erased at any time without notice!</i></p></small>
                                    `,
                    title: 'Node SMS API',
                    version: '1.0.0'
                },
                basePath: '/',
                produces: [
                    "application/json"
                ],
                securityDefinitions: {
                    JWT: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'authorization',
                        description: ""
                    }
                }
            },
            basedir: __dirname, //app absolute path
            files: ['./routes/**/*.js'] //Path to the API handle folder
        };

        expressSwagger(options);

        this.app.use(cors());
        this.app.use(compression());
        this.app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(express.static(path.join(__dirname, "public")));
        this.app.set('view engine', 'html');
        this.app.set('views', './app/views');
        this.app.engine('html', ejs.renderFile);

        this.app.get("/admin*", (req, res) => {
            res.render("admin.html");
        });        

        this.app.get("/", (req, res) => {
            res.redirect('/api-docs');
        });

        require("./routes/index").init(this.app);

        PhoneController.setAllOffline();

        return this;
    }

    open(options, callBack) {

        options = options || {};
        options.exclusive = true;

        this.server = this.app.listen(options, (err) => {
            if (err) {
                logger.error("HTTP Server error!", err);

                if (callBack) {
                    callBack(err);
                }

                return;
            }

            this.startWebSocketServer();

            eventBus.on("newSMS", (message) => {
                this.sendSMSToPhone(message);
            });

            eventBus.on("disconnectPhone", (data) => {
                this.disconnectPhone(data);
            });

            setInterval(MessageController.setFailed, 60000); // 1 min

            logger.info(`HTTP Server is listening on ${options.port}`);

            if (callBack) {
                callBack();
            }
        }).on("error", (err) => {
            logger.error("HTTP Server error!", err);
            if (callBack) {
                callBack(err);
            }
        });
    }

    registerWs(ws, jsonWebToken){

        ws.role = jsonWebToken.role;
        ws.userId = jsonWebToken.userId;
        ws.phoneId = jsonWebToken.phoneId;

        this.trackWssConnection(ws);

        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.send(JSON.stringify({ event: "connection", message: "OK" }));

        ws.on("message", (data) => {
            this.handleMessageFromPhone(ws, data);
        });

        ws.on("close", () => {
            this.removeWssConnection(ws);
        });
    }

    startWebSocketServer() {
        this.wss = new WebSocketServer({ server: this.server });

        this.wss.on("connection", (ws, req) => {

            let jsonWebToken = token.decode(req.url.substring(req.url.indexOf("=") + 1));

            if (jsonWebToken === null) {
                return ws.close(4401, "Unauthorized");
            }

            if (jsonWebToken.role === "admin") {
                return this.registerWs(ws, jsonWebToken);
            }

            //only allow one connection per phoneId
            if (jsonWebToken.role === "phone" &&
                this.connectedWs !== undefined &&
                this.connectedWs[jsonWebToken.userId] !== undefined &&
                this.connectedWs[jsonWebToken.userId].phones[jsonWebToken.phoneId] !== undefined) {
                    return ws.close(4409, "Phone already connected");
            }

            PhoneController.get(jsonWebToken.phoneId, jsonWebToken.userId).then(phone => {

                if (!phone.active) {
                    return ws.close(4400, "Phone inactive");
                }

                this.registerWs(ws, jsonWebToken);

            }).catch(() => {
                ws.close(4401, "Unauthorized");
            });

        });

        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping(null);
            });
        }, 30000);
    }

    handleMessageFromPhone(ws, data) {

        try {
                
            let message = JSON.parse(data);
            
            if (message.event === "setSent") {

                return MessageController.setSent(message.messageId, ws.phoneId).then(() => {
                    //ignore
                });    
                
            }
            
        } 
        catch (err) {
            logger.error("Error on handleMessageFromPhone", err);
        }
    }

    sendSMSToPhone(message) {

        let fowarded = false;

        try {
            if (this.connectedWs !== undefined && this.connectedWs[message.userId] !== undefined) {

                let phoneOnlineCount = Object.keys(this.connectedWs[message.userId].phones).length;

                if (phoneOnlineCount > 0) {

                    //for now is a ramdom choice but, we must improve this
                    // pick phones by area code 
                    // set phones by application
                    // load balancing between connected phones

                    let ramdomPhone = Math.floor((Math.random() * phoneOnlineCount));
                    let ramdomPhoneId = Object.keys(this.connectedWs[message.userId].phones)[ramdomPhone];
                    
                    let SMSJson = { 
                        event: "newSMS", 
                        message: { 
                            id: message._id, 
                            phone: message.phone, 
                            body: message.body 
                        } 
                    };
                    
                    this.connectedWs[message.userId].phones[ramdomPhoneId].send(JSON.stringify(SMSJson));

                    MessageController.setPhone(message._id, ramdomPhoneId);

                    fowarded = true;
                }

            }
        } catch (err) {
            logger.error("Error on sendSMSToPhone", err);
        }

        if (!fowarded) {
            MessageController.setFailed(message._id);
        }
    }

    disconnectPhone(data) {
        if (this.connectedWs !== undefined &&
            this.connectedWs[data.userId] !== undefined &&
            this.connectedWs[data.userId].phones[data.phoneId] !== undefined) {
            this.connectedWs[data.userId].phones[data.phoneId].close();
        }
    }

    trackWssConnection(ws) {
        if (ws.role === undefined) {
            return;
        }

        this.connectedWs = this.connectedWs || {};

        if (this.connectedWs[ws.userId] === undefined) {
            this.connectedWs[ws.userId] = {
                wss: [],
                phones: {}
            };
        }

        if (ws.role === "phone") {
            this.connectedWs[ws.userId].phones[ws.phoneId] = ws;
            this.changeAndNotifyPhoneStatus(ws.userId, ws.phoneId, "phoneConnected");
        } else {
            this.connectedWs[ws.userId].wss.push(ws);
        }
    }

    removeWssConnection(ws) {
        if (ws.role === undefined) {
            return;
        }

        if (this.connectedWs === undefined || this.connectedWs[ws.userId] === undefined) {
            return;
        }

        if (ws.role === "phone") {
            delete this.connectedWs[ws.userId].phones[ws.phoneId];
            this.changeAndNotifyPhoneStatus(ws.userId, ws.phoneId, "phoneDisconnected");
        } else {
            this.connectedWs[ws.userId].wss = this.connectedWs[ws.userId].wss.filter(listWs => {
                return listWs !== ws;
            });
        }
    }

    changeAndNotifyPhoneStatus(userId, phoneId, event) {

        if (this.connectedWs[userId] !== undefined) {
            this.connectedWs[userId].wss.map(ws => {
                ws.send(JSON.stringify({ event, phoneId: phoneId }));
            });
        }

        PhoneController.setOnline(phoneId, event === "phoneConnected");
    }
}

module.exports.init = () => {
    return new HttpServer();
}; 