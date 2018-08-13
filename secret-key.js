// secret-key.js
const sodium = require('sodium-native')

function generateSecretKey() {
    var buf = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
    sodium.randombytes_buf(buf)
    return buf
}

function createNonce() {
    var nonceBuf = sodium.sodium_malloc(sodium.crypto_secretbox_NONCEBYTES)
    sodium.randombytes_buf(nonceBuf)
    return nonceBuf
}

exports.createNonce = createNonce

exports.generateSecret = generateSecretKey