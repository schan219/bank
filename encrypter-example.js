const encrypt = require('./encrypt').encrypt
const generateSecret = require('./secret-key').generateSecret
const createNonce = require('./secret-key').createNonce
const decrypt = require('./decrypt').decrypt
const bs58check = require('bs58check')

var message = 'Hello, World'

var secret = generateSecret()
var nonce = createNonce()

var ciphertext = encrypt(message, nonce, secret)

ciphertext = bs58check.encode(ciphertext)

console.log('encrypted:', ciphertext)
console.log('nonce:', nonce)
console.log('nonce:', bs58check.encode(nonce))

ciphertext = bs58check.decode(ciphertext)

var decrypted = decrypt(ciphertext, nonce, secret)

console.log('decrypted:', decrypted.toString('utf-8'))

//var fakeCipherText = Buffer.from('Bye')

//var decrypted = decrypt(message, fakeCipherText, nonce, secret)

//console.log('decrypted:', decrypted)