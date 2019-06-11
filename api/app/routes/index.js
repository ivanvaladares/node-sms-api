exports.init = (app) => {
    app.use("/message", require("./message-routes")); 
    app.use("/phone", require("./phone-routes")); 
    app.use("/application", require("./application-routes")); 
    app.use("/user", require("./user-routes")); 
};