const encodeKeys = require('./sign').encodeKeys
const decodeKeys = require('./sign').decodeKeys
const fs = require('fs')

function writeKeysToFile(keys, publicKeyPath, secretKeyPath) {
    return new Promise((resolve, reject) => {
        var encodedKeys = encodeKeys(keys)
        fs.writeFile(publicKeyPath, encodedKeys.publicKey, function (err) {
        if(err) {
            console.log(err)
            return reject()
        }
        
            fs.writeFile(secretKeyPath, encodedKeys.secretKey, function (err) {
                if(err) {
                    console.log(err)
                    return reject()
                }
                console.log('Created public and secret keys')
                resolve()
            })
        })
    })
}
  
function writeStringToFile(str, filePath) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, str, function (err) {
            if (err) {
                console.log(err)
                return reject()
            }
            console.log('Wrote string to file')
            resolve()
        })
    })
}
  
function writeBufferToFile(keyBuf, filePath) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, keyBuf.toString('base64'), function (err) {
            if (err) {
            console.log(err)
            return reject()
            }
            console.log('Wrote buffer to file')
            resolve()
        })
    })
}
  
function getStringFromFile(filePath) {
    return new Promise((resolve) => {
        var str = fs.readFileSync(filePath, 'utf-8')
        console.log('Retrieved string from file')
        if (str === '') {
            console.log('There is no prevous customer database')
            resolve('')
        } else {
            resolve(str)
        }
})
}
  
function getBufferFromFile(filePath) {
    return new Promise((resolve) => {
        var str = fs.readFileSync(filePath, 'utf-8')
        console.log('Retrieved buffer from file')
        if (str === '') {
            resolve('')
        } else {
            var buf = Buffer.from(str, 'base64')
            resolve(buf)
        }
    })
}

function getKeys(publicKeyPath, secretKeyPath) {
    return new Promise(async (resolve) => {
        var keys = {}
        keys.publicKey = await getPublicKey(publicKeyPath)
        keys.secretKey = await getSecretKey(secretKeyPath)
        var decodedKeys = decodeKeys(keys)
        resolve(decodedKeys)
    })
}

function getPublicKey(publicKeyPath) {
return new Promise((resolve, reject) => {
    var publicKey = fs.readFileSync(publicKeyPath, 'utf-8')
    console.log('Retrieved public key')
    if (publicKey === '') {
        reject()
    } else {
        resolve(publicKey)
    }
})
}

function getSecretKey(secretKeyPath) {
    return new Promise((resolve, reject) => {
        var secretKey = fs.readFileSync(secretKeyPath, 'utf-8')
        console.log('Retrieved secret key')
        if (secretKey === '') {
            reject()
        } else {
            resolve(secretKey)
        }
    })
}

exports.writeKeysToFile = writeKeysToFile
exports.writeStringToFile = writeStringToFile
exports.writeBufferToFile = writeBufferToFile
exports.getBufferFromFile = getBufferFromFile
exports.getStringFromFile = getStringFromFile
exports.getKeys = getKeys