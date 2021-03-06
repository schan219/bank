const encrypt = require('./encrypt').encrypt
const generateSecret = require('./secret-key').generateSecret
const createNonce = require('./secret-key').createNonce
const decrypt = require('./decrypt').decrypt

var message = 'Hello, World'

var secret = generateSecret()
var nonce = createNonce()

var ciphertext = encrypt(message, nonce, secret)

ciphertext = ciphertext.toString('base64')

console.log('encrypted:', ciphertext)
console.log('nonce:', nonce)
console.log('nonce:', nonce.toString('hex'))

ciphertext = Buffer.from(ciphertext, 'base64')

var decrypted = decrypt(ciphertext, nonce, secret)

console.log('decrypted:', decrypted.toString('utf-8'))

//var fakeCipherText = Buffer.from('Bye')

//var decrypted = decrypt(message, fakeCipherText, nonce, secret)

//console.log('decrypted:', decrypted)