const generateKeyStrings = require('./sign').generateKeyStrings
const convertKeysToString = require('./sign').convertKeysToString
const sign = require('./sign').sign
const createKeyPair = require('./sign').createKeyPair
const verify = require('./verify').verify

const pubKeyStr = '5OFWDGZDHKORFZ2SZCPAUUKC4NH7B2E8'
const secretKeyStr = 'NUYBSD0NDLDR1R65JM4IFPS9G6ZYQ5CG7JX4L22O2RTHPF4MVPNGYJ9RTDXH2A08'

const pubKeyStr2 = 'MHEHDL86MHY2SQBK2GM7JSJDOC5SUYT1'
const secretKeyStr2 = '96053A32MFHEA5H70379VEDPXPHPOHQNJW3QW79PRW85OBD1DUOSTQPKO240PGAX'

var message = Buffer.from('Hello, World!')

var pairs = createKeyPair(pubKeyStr, secretKeyStr)
var pairStrings = convertKeysToString(pairs)
var signature = sign(pairStrings.secretKey, message)
var bool = verify(signature, message, pairStrings.publicKey)
console.log('verified:', bool)

var pairs2 = createKeyPair(pubKeyStr2, secretKeyStr2)
var pairStrings2 = convertKeysToString(pairs2)
var signature2 = sign(pairStrings2.secretKey, message)
var bool2 = verify(signature2, message, pairStrings.publicKey) // Use the wrong public key
console.log('verified:', bool2) // Should be false

const keyStrings3 = generateKeyStrings()
const pairs3 = createKeyPair(keyStrings3.publicKey, keyStrings3.secretKey)
var pairStrings3 = convertKeysToString(pairs3)
var signature3 = sign(pairStrings3.secretKey, message)
var bool3 = verify(signature3, message, pairStrings3.publicKey)
console.log('verified:', bool3)
