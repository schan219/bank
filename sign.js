// sign.js
const sodium = require('sodium-native')
const cryptoRandomString = require('crypto-random-string')
const bs58check = require('bs58check')

function generateKeyStrings() {
    return {
        publicKey: cryptoRandomString(32),
        secretKey: cryptoRandomString(64)
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
    keys.publicKey = bs58check.encode(keyBuffer.publicKey)
    keys.secretKey = bs58check.encode(keyBuffer.secretKey)
    return keys
}

function decodeKeys(encodedKeys) {
    var keys = {}
    keys.publicKey = bs58check.decode(encodedKeys.publicKey)
    keys.secretKey = bs58check.decode(encodedKeys.secretKey)
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