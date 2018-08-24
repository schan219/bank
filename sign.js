// sign.js
const sodium = require('sodium-native')
const crypto = require('crypto')

function generateKeyStrings() {
    return {
        publicKey: crypto.randomBytes(32).toString('base64'),
        secretKey: crypto.randomBytes(64).toString('base64')
    }
}

function createKeyPair(publicKeyStr, secretKeyStr) {
    var publicKey = sodium.sodium_malloc(publicKeyStr.length)
    var secretKey = sodium.sodium_malloc(secretKeyStr.length)
    sodium.crypto_sign_keypair(publicKey, secretKey)
    return {
        publicKey: publicKey,
        secretKey: secretKey
    }
}

function encodeKeys(keyBuffer) {
    var keys = {}
    keys.publicKey = keyBuffer.publicKey.toString('base64')
    keys.secretKey = keyBuffer.secretKey.toString('base64')
    return keys
}

function decodeKeys(encodedKeys) {
    var keys = {}
    keys.publicKey = Buffer.from(encodedKeys.publicKey, 'base64')
    keys.secretKey = Buffer.from(encodedKeys.secretKey, 'base64')
    return keys
}

function sign(secretKeyBuf, messageStr) {
    var messageBuf = Buffer.from(messageStr)
    var signature = Buffer.alloc(sodium.crypto_sign_BYTES)

    sodium.crypto_sign_detached(signature, messageBuf, secretKeyBuf)

    return signature
}

exports.generateKeyStrings = generateKeyStrings

exports.createKeyPair = createKeyPair

exports.encodeKeys = encodeKeys

exports.decodeKeys = decodeKeys

exports.sign = sign