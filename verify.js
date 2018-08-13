// verify.js
const sodium = require('sodium-native')

function verify(signatureBuf, messageStr, publicKeyBuf) {
    var messageBuf = Buffer.from(messageStr)
    var bool = sodium.crypto_sign_verify_detached(signatureBuf, messageBuf, publicKeyBuf)
    return bool
}

exports.verify = verify