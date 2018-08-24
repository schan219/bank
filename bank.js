// bank.js
const jsonStream = require('duplex-json-stream')
const net = require('net')
const fs = require('fs')
const path = require('path')
const sodium = require('sodium-native')
const assert = require('assert')

const generateKeyStrings = require('./sign').generateKeyStrings
const createKeyPair = require('./sign').createKeyPair
const sign = require('./sign').sign
const verify = require('./verify').verify
const generateSecretKey = require('./secret-key').generateSecret
const createNonce = require('./secret-key').createNonce
const encrypt = require('./encrypt').encrypt
const decrypt = require('./decrypt').decrypt
const writeKeysToFile = require('./util').writeKeysToFile
const writeStringToFile = require('./util').writeStringToFile
const writeBufferToFile = require('./util').writeBufferToFile
const getBufferFromFile = require('./util').getBufferFromFile
const getStringFromFile = require('./util').getStringFromFile
const getKeys = require('./util').getKeys

const logPath = path.resolve(__dirname, 'bank', 'log.txt')
const secretKeyPath = path.resolve(__dirname, 'bank', 'secret.txt')
const publicKeyPath = path.resolve(__dirname, 'bank', 'pub.txt')
const encryptionSecretPath = path.resolve(__dirname, 'bank', 'encryption-secret.txt')
const noncePath = path.resolve(__dirname, 'bank', 'nonce.txt')
const customerPath = path.resolve(__dirname, 'bank', 'customers.txt')

const HASH_SIZE = 32
const genesisHash = Buffer.alloc(HASH_SIZE).toString('hex')

/**
 * Keys are stored as buffers with the following property names:
 * - publicKey
 * - secretKey
 */
var keys = {}

var log = []

var customers = {}

var encryptKey
var nonce

/**
 * This iife runs when the bank starts up.
 * It creates the public and secret keys if it is not found on disk.
 * Otherwise, it reads the public and secret keys from disk.
 * It also gets the log from disk and verifies the log.
 */
;(async () => {
  var keyBuffer
  // Create or retrieve secret and public keys
  if (!fs.existsSync(secretKeyPath) || !fs.existsSync(publicKeyPath)) {
    var keyStrings = generateKeyStrings()
    keyBuffer = createKeyPair(keyStrings.publicKey, keyStrings.secretKey)
    keys = keyBuffer
    await writeKeysToFile(keys, publicKeyPath, secretKeyPath)
  } else {
    keys = await getKeys(publicKeyPath, secretKeyPath)
  }

  try {
    sodium.sodium_mprotect_noaccess(keys.secretKey)
  } catch (error) {
    if (!error.errno === 0) {
      console.log(error)
    }
  }

  // Create or retrieve encryption secret key and nonce
  if (!fs.existsSync(encryptionSecretPath) || !fs.existsSync(noncePath)) {
    encryptKey = generateSecretKey()
    await writeBufferToFile(encryptKey, encryptionSecretPath)
    nonce = createNonce()
    await writeBufferToFile(nonce, noncePath)
  } else {
    encryptKey = await getBufferFromFile(encryptionSecretPath)
    nonce = await getBufferFromFile(noncePath)
  }

  try {
    sodium.sodium_mprotect_noaccess(encryptKey)
  } catch (error) {
    if (!error.errno === 0) {
      console.log(error)
    }
  }

  // Retrieve log and verify
  if (fs.existsSync(logPath)) {
    try {
      log = await getPersistedLog()
      assert.strictEqual(Array.isArray(log), true)
      assert.strictEqual(verifyTransactionLog(keys.publicKey), true)
    } catch (error) {
      console.log(error)
      process.exit(1)
    }
  }

  if (fs.existsSync(customerPath)) {
    var customerStr = await getStringFromFile(customerPath)
    customers = JSON.parse(customerStr)
  }
})()

var server = net.createServer(async function (socket) {
  socket = jsonStream(socket)

  socket.on('data', async function (msg) {
    console.log('Bank received:', msg)
    // socket.write can be used to send a reply
    switch (msg.cmd) {
      case 'balance':
        // ...
        var registered = checkRegistered(msg.customerId)
        var verified = verifyCustomer(msg.signature, msg, msg.customerId)
        if (registered && verified) {
          socket.write({cmd: 'balance', balance: reduceLog(log, msg.customerId)})
        } else {
          socket.write({cmd: 'balance', message: 'You need to register first'})
        }
        break

      case 'deposit':
        // ...
        if (!isNaN(msg.amount) && msg.amount > 0) {
          var registered = checkRegistered(msg.customerId)
          var verified = verifyCustomer(msg.signature, msg, msg.customerId)
          var notReplayed = checkNotReplay(msg.previousTxHash)
          if (registered && verified && notReplayed) {
            appendToTransactionLog(msg)
            await persistLog(log)
            socket.write({cmd: 'deposit', balance: reduceLog(log, msg.customerId)})
          } else {
            socket.write({cmd: 'deposit', message: 'You need to register first'})
          }
        }
        break

      case 'withdraw':
        if (!isNaN(msg.amount) && msg.amount > 0) {
          var registered = checkRegistered(msg.customerId)
          var verified = verifyCustomer(msg.signature, msg, msg.customerId)
          var notReplayed = checkNotReplay(msg.previousTxHash)
          if (registered && verified && notReplayed) {
            var balance = reduceLog(log, msg.customerId)
            if (msg.amount <= balance) {
              appendToTransactionLog(msg)
              await persistLog(log)
              socket.write({cmd: 'withdraw', balance: reduceLog(log, msg.customerId)})
            } else {
              socket.write({cmd: 'withdraw', message: 'Failed: You do not have enough money'})
            }
          } else {
            socket.write({cmd: 'withdraw', message: 'You need to register first'})
          }
        }
        break

        case 'register':
          if (typeof msg.customerId === 'string') {
              try {
                await register(msg.customerId)
                socket.write({cmd: 'register', customerId: msg.customerId, message: `Registered with username ${msg.customerId}.`, error: false})
              } catch (registerError) {
                socket.write({cmd: 'register', message: `Customer with id ${msg.customerId} already exists`, error: true})
              }
          } else {
              socket.write({cmd: 'register', message: `Failed: Registration`, error: true})
          }
          break

        case 'gethash':
          if (typeof msg.customerId === 'string') {
            var hash = getLatestHash(msg.customerId)

            console.log('customerId', msg.customerId)
            console.log('log', log)
            if (hash) {
              socket.write({cmd: 'gethash', hash: hash, error: false})
            } else {
              socket.write({cmd: 'gethash', hash: hash, error: true})
            }
          }
          break

      default:
        // Unknown command
        break
    }
  })

  socket.on('error', function(err) {
    if (err.code === 'ECONNRESET') {
      console.log('A teller disconnected')
    }
  })
})

function checkRegistered(customerId) {
  if (customers[customerId]) {
    return true
  }
  return false
}

function register(customerId) {
  return new Promise(async (resolve, reject) => {
    if (!customers[customerId]) {
      customers[customerId] = 1
      await writeStringToFile(JSON.stringify(customers), customerPath)
      console.log(`Customer ${customerId} has been successfully registered`)
      resolve()
    } else {
      console.log(`Customer with ${customerId} already exists`)
      reject()
    }
  })
}

function reduceLog(log, customerId) {
  var balance = 0
  for (var entry of log) {
    if (entry.value.customerId === customerId && entry.value.cmd === 'deposit') {
      balance += parseInt(entry.value.amount, 10)
    } else if (entry.value.customerId === customerId && entry.value.cmd === 'withdraw') {
      balance -= parseInt(entry.value.amount, 10)
    }
  }
  console.log("balance: ", balance);
  return balance
}

function persistLog(log) {
  return new Promise(async (resolve, reject) => {
    var logStr = JSON.stringify(log, null, 4)
    nonce = createNonce()
    
    try {
      sodium.sodium_mprotect_readonly(encryptKey)
    } catch (error) {
      if (!error.errno === 0) {
        console.log(error)
      }
    }

    var encryptedLog = encrypt(logStr, nonce, encryptKey)

    try {
      sodium.sodium_mprotect_noaccess(encryptKey)
    } catch (error) {
      if (!error.errno === 0) {
        console.log(error)
      }
    }

    if (!encryptedLog || !nonce) {
      return reject()
    }
    try {
      await writeBufferToFile(encryptedLog, logPath)
      console.log('The log has been persisted')
    } catch (logError) {
      reject(logError)
    }
    
    try {
      await writeBufferToFile(nonce, noncePath)
      console.log('The encryption nonce has been persisted')
    } catch (nonceError) {
      reject(nonceError)
    }

    resolve()
  })
}

function getPersistedLog() {
  return new Promise(async (resolve, reject) => {
    try {
      var encryptedLog = await getBufferFromFile(logPath)
    } catch (error) {
      console.log('Error getting encrypted log')
      return reject(error)
    }
    
    if (encryptedLog === '') {
      console.log('No previous record of log')
      return resolve([])
    }

    console.log('Retrieved log from persistence')

    try {
      sodium.sodium_mprotect_readonly(keys.secretKey)
    } catch (error) {
      if (!error.errno === 0) {
        console.log(error)
      }
    }

    var log = decrypt(encryptedLog, nonce, encryptKey)

    try {
      sodium.sodium_mprotect_noaccess(encryptKey)
    } catch (error) {
      if (!error.errno === 0) {
        console.log(error)
      }
    }

    log = JSON.parse(log)
    resolve(log)
  })
}

function appendToTransactionLog(value) {
  var prevHash = log.length ? log[log.length - 1].hash : genesisHash
  try {
    sodium.sodium_mprotect_readonly(keys.secretKey)

    var signature = sign(keys.secretKey, JSON.stringify(value))

    try {
      sodium.sodium_mprotect_noaccess(keys.secretKey)

      var row = {
        value: value,
        signature: signature.toString('base64'),
        hash: hashToHex(prevHash + signature + JSON.stringify(value))
      }
      log.push(row)

    } catch (error) {
      if (!error.errno === 0) {
        console.log(error)
      }
    }
  } catch (error) {
    if (!error.errno === 0) {
      console.log(error)
    }
  }
}

function hashToHex(message) {
  var input = Buffer.from(message)
  var output = Buffer.alloc(HASH_SIZE)

  sodium.crypto_generichash(output, input)

  return output.toString('hex')
}

function verifyTransactionLog(publicKey) {
  var previousHash = genesisHash
  var currentHash = genesisHash
  var bool
  for (var entry of log) {
    bool = verify(Buffer.from(entry.signature, 'base64'), JSON.stringify(entry.value), publicKey)
    if (!bool) {
      console.log('Signature verification failed')
      return false
    }
    currentHash = hashToHex(previousHash + Buffer.from(entry.signature, 'base64') + JSON.stringify(entry.value))
    if (entry.hash !== currentHash) {
      console.log('Hash does not match')
      return false
    }
    previousHash = entry.hash
  }
  return true
}

function verifyCustomer(signature, message, publicKey) {
    var publicKeyBuf = Buffer.from(publicKey, 'base64')
    var signature = Buffer.from(message.signature, 'base64')
    delete message.signature
    var messageStr = JSON.stringify(message)
    var bool = verify(signature, messageStr, publicKeyBuf)
    return bool
}

function getLatestHash(customerId) {
  var hash
    for (var i = log.length-1; i>=0; i--) {
      if (log[i].value.customerId === customerId) {
        hash = log[i].hash
        break
      }
    }
    return hash
}

function checkNotReplay(msg) {
  var latestHash = getLatestHash(msg.customerId)
  if (msg.previousTxHash === latestHash) {
    return true
  }
  return false
}

server.listen(3876)
console.log('Listening on port 3876')