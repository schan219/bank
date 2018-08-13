// hash-example.js
var sodium = require('sodium-native')
var assert = require('assert')
const answer = '511bc81dde11180838c562c82bb35f3223f46061ebde4a955c27b3f489cf1e03'

var message = Buffer.from('Hello, World!')
var ciphertext = Buffer.alloc(sodium.crypto_generichash_BYTES)

sodium.crypto_generichash(ciphertext, message)

console.log('ciphertext:', ciphertext.toString('hex'))
assert.strictEqual(ciphertext.toString('hex'), answer)
