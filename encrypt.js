// encrypt.js
const sodium = require('sodium-native')

function encrypt(messageStr, nonceBuf, secretKeyBuf) {
    var cipherBuf = sodium.sodium_malloc(messageStr.length + sodium.crypto_box_MACBYTES)
    var messageBuf = Buffer.from(messageStr)
    sodium.crypto_secretbox_easy(cipherBuf, messageBuf, nonceBuf, secretKeyBuf)
    return cipherBuf
}

exports.encrypt = encrypt