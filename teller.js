// teller.js
var jsonStream = require('duplex-json-stream')
var net = require('net')
const fs = require('fs')
const path = require('path')

const generateKeyStrings = require('./sign').generateKeyStrings
const createKeyPair = require('./sign').createKeyPair
const sign = require('./sign').sign
const writeBufferToFile = require('./util').writeBufferToFile
const getKeys = require('./util').getKeys

const secretKeyPath = path.resolve(__dirname, 'teller', 'secret.txt')
const publicKeyPath = path.resolve(__dirname, 'teller', 'pub.txt')

var client = jsonStream(net.connect(3876))

var readline = require('readline')
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'teller> '
})

var keys = {}
var latestHash = ''

;(async () => {
    if (fs.existsSync(secretKeyPath) && fs.existsSync(publicKeyPath)) {
        keys = await getKeys(publicKeyPath, secretKeyPath)
        client.write({cmd: 'gethash', customerId: keys.publicKey.toString('base64')})
    }

    rl.prompt()
})()

rl.on('line', function(command) {
    var args = parseCommand(command)
    cmd = args[0]
    switch (cmd) {
        case 'balance':
            // ...
            if (args[0] !== null && keys.secretKey != undefined && keys.publicKey != undefined) {
                var msg = {
                    cmd: 'balance',
                    customerId: keys.publicKey.toString('base64')
                }
                var sigBuf = sign(keys.secretKey, JSON.stringify(msg))
                msg.signature = sigBuf.toString('base64')
                client.write(msg)
            } else {
                console.log('You do not have authentication keys')
                rl.prompt()
            }
            break

        case 'deposit':
            // ...
            if (args[0] !== null && args[1] !== null && args[1] > 0 && keys.secretKey != undefined && keys.publicKey != undefined) {
                var msg = {
                    cmd: 'deposit',
                    amount: args[1],
                    customerId: keys.publicKey.toString('base64'),
                    previousTxHash: latestHash
                }
                var sigBuf = sign(keys.secretKey, JSON.stringify(msg))
                msg.signature = sigBuf.toString('base64')
                client.write(msg)
            } else {
                console.log('You do not have authentication keys')
                rl.prompt()
            }
            break

        case 'withdraw':
            if (args[0] !== null && args[1] !== null && args[1] > 0 && args[2] !== null && keys.secretKey != undefined && keys.publicKey) {
                var msg = {
                    cmd: 'withdraw',
                    amount: args[1],
                    customerId: keys.publicKey.toString('base64'),
                    previousTxHash: latestHash
                }
                var sigBuf = sign(keys.secretKey, JSON.stringify(msg))
                msg.signature = sigBuf.toString('base64')
                client.write(msg)
            } else {
                console.log('You do not have authentication keys')
                rl.prompt()
            }
            break
        
        case 'register':
            if (args[0] !== null) {
                var keyStrings = generateKeyStrings()
                keys = createKeyPair(keyStrings.publicKey, keyStrings.secretKey)
                client.write({
                    cmd: 'register',
                    customerId: keys.publicKey.toString('base64')
                })
            } else {
                rl.prompt()
            }
            break

        case 'help':
            console.log('Commands:\n\t\tbalance\n\t\tdeposit [amount]\n\t\twithdraw [amount]\n\t\tregister\n\t\tquit')
            rl.prompt()
            break

        case 'quit':
            rl.close()

        case '':
            break

        default:
            // Unknown command
            console.log('Invalid command.')
            rl.prompt()
            break
        
    }

}).on('close',function(){
    console.log('Bye.')
    process.exit(0)
})

client.on('data', async function (msg) {
    console.log('Teller received:', msg)
    switch (msg.cmd) {
        case 'register':
            if (!msg.error) {
                // generate key pair
                console.log('Creating public and secret keys...')
                await writeBufferToFile(keys.publicKey, publicKeyPath)
                await writeBufferToFile(keys.secretKey, secretKeyPath)
                console.log('Your public key is:', keys.publicKey.toString('base64'))
            } else {
                // Cannot register with key pair
                keys = {}
            }
            break
        case 'gethash':
            if (!msg.error) {
                latestHash = msg.hash
            }
            break
    }
    rl.prompt()
})

client.on('error', function(error) {
    console.log('\nThe bank has shut down...')
    rl.close()
})

function parseCommand(command) {
    var res = command.trim().split(' ')
    if (res.length > 0) {
        var cmd = res[0].toLowerCase()
        var amt
        // deposit and withdraw
        if (res.length === 2 && !isNaN(parseInt(res[1], 10))) {
            if (res[0] === 'deposit' || res[0] === 'withdraw') {
                amt = res[1]
                return [cmd, amt]
            }
        }

        // register
        if (res.length === 1) {
            if (res[0] === 'register') {
                return [cmd, null]
            }
        }

        // balance
        if (res.length === 1) {
            if (res[0] === 'balance') {
                return [cmd, null]
            }
        }

        // help
        if (res.length === 1) {
            if (res[0] === 'quit' || res[0] === 'help') {
                return [cmd, null]
            }
        }

    }
    return [null, null]
}

// client.end can be used to send a request and close the socket