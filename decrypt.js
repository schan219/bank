// decrypt.js
const sodium = require('sodium-native')

function decrypt(cipherBuf, nonceBuf, secretKeyBuf) {
    var messageBuf = sodium.sodium_malloc(cipherBuf.length - sodium.crypto_secretbox_MACBYTES)
    var bool = sodium.crypto_secretbox_open_easy(messageBuf, cipherBuf, nonceBuf, secretKeyBuf)
    if (bool) {
        return messageBuf
    } else {
        return null
    }
}

exports.decrypt = decrypt