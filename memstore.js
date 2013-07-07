var _ = require('lodash')
  , util = require('util')
  , events = require('events')
  ;

function MemoryStore () {
  this.dict = {}
  this.sequences = {}
  this.i = 0
}
util.inherits(MemoryStore, events.EventEmitter)
MemoryStore.prototype.get = function (key) {
  return this.dict[key]
}
MemoryStore.prototype.put = function (key, value) {
  this.i += 1
  this.sequences[key] = {seq:this.i, id:key}
  this.dict[key] = value
  this.emit('change', this.sequences[key])
}
MemoryStore.prototype.getSequences = function (opts, cb) {
  cb(null, this.changes(opts))
}
MemoryStore.prototype.changes = function (opts) {
  var self = this
  opts.since = opts.since || 0
  function _map (key) {
    var change = _.clone(self.sequences[key], true)
    if (opts.include_data) change.data = self.dict[key]
    return change
  }
  function _filter (change) {
    return change.seq > opts.since
  }
  return _.sortBy(Object.keys(this.sequences).map(_map).filter(_filter), 'seq')
}

MemoryStore.prototype.getContinuousSequences = function (opts) {
  var ee = new events.EventEmitter()
    , self = this
    , emitted = 0
    ;

  opts.limit = opts.limit || Infinity

  function onChange (change) {
    if (emitted > opts.limit) return ee.close()
    var c = _.clone(change, true)
    if (opts.include_data) c.data = self.dict[change.id]
    ee.emit()
  }

  setImmediate(function () {
    self.changes(opts).forEach(function (c) { if (emitted < opts.limit) ee.emit('entry', c)})
    self.on('change', onChange)
  })

  ee.on('entry', function () {emitted += 1})

  ee.close = function ( ) { self.removeListener('change', onChange) }
  return ee
}

exports.MemoryStore = MemoryStore