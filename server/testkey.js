const crypto = require('crypto');

const ENCRYPTION_KEY = '726f02cb3fe8c4014d6a7e206eba0eb421e4aea84f9ad4d6da04ae4fad4b15fd'; 
const IV_LENGTH = 16; 

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

console.log(encrypt('Hello World'));