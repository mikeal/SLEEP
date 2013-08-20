var sleep = require('./server')
  , memstore = require('./memstore')
  ;

module.exports = function (getSequence, options) { return new sleep.SLEEP(getSequence, options) }
module.exports.memstore = function () {return new memstore.MemoryStore}

module.exports.MemoryStore = memstore.MemoryStore

module.exports.SLEEP = sleep.SLEEP
module.exports.SLEEPStream = sleep.SLEEPStream
module.exports.fromObject = sleep.fromObject
module.exports.fromArray = sleep.fromArray

module.exports.client = require('./client')