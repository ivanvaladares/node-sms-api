const nodeCrypto = require("crypto");
const crypto = {

    algorithm: "aes-256-cbc",
    IV_LENGTH: 16,

	encrypt: function (text) {
        let iv = nodeCrypto.randomBytes(this.IV_LENGTH);
        let cipher = nodeCrypto.createCipheriv(this.algorithm, Buffer.from(process.env.ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);

        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return iv.toString("hex") + ":" + encrypted.toString("hex");
    },  
    
    decrypt: function (text) {
        if (!text) {
            return "";
        }

        let textParts = text.split(":");
        let iv = Buffer.from(textParts.shift(), "hex");
        let encryptedText = Buffer.from(textParts.join(":"), "hex");
        let decipher = nodeCrypto.createDecipheriv(this.algorithm, Buffer.from(process.env.ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
       
        decrypted = Buffer.concat([decrypted, decipher.final()]);
       
        return decrypted.toString();
	},

    hash: function (text, salt) {
        let hash = nodeCrypto.createHmac("sha512", salt); /** Hashing algorithm sha512 */
        hash.update(text);
        return hash.digest("hex");                
    },

    genRandomSalt: function (length){
        return nodeCrypto.randomBytes(Math.ceil(length / 2))
                .toString("hex") /** convert to hexadecimal format */
                .slice(0, length);   /** return required number of characters */
    }
    
};

module.exports = crypto;