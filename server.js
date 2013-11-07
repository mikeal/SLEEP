var qs = require('querystring')
  , url = require('url')
  , once = require('once')
  , util = require('util')
  , concat = require('concat-stream')
  , split = require('binary-split')
  , through = require('through')
  , extend = require('extend')
  ;

function fromObject (obj, start) {
  var i = start || 0
    , results = []
    ;
  Object.keys(obj).forEach(function (key) {
    i += 1
    results.push({seq:i, id:key, data:obj[key]})
  })
  return results
}

function fromArray (arr, start) {
  start = start || 0
  arr.forEach(function (a, i) {a.seq = i + start})
  return arr
}

function SLEEPStream (opts) {
  opts.limit = opts.limit || Infinity
  opts.style = opts.style || 'array'
  this.opts = opts
  this.i = 0
  var stream = through(this.change.bind(this), this.end.bind(this))
  this.queue = stream.queue
  this.emit = stream.emit
  return stream
}

SLEEPStream.prototype.change = function (change) {
  this.started = true
  if (this.i > this.opts.limit) return this.end()

  if (this.opts.style === 'newline') {
    var ndrow = JSON.stringify(change) + (this.opts.sep || '\r\n')
    this.queue(ndrow)
  } else if (this.opts.style === 'array') {

    if (this.i === 0) this.queue('[')
    else this.queue(',')

    this.queue(JSON.stringify(change))
  } else if (this.opts.style === 'object') {

    if (this.i === 0) this.queue('{"rows":[')
    else this.queue(',')
    
    this.queue(JSON.stringify(change))
  } else {
    this.emit('error', new Error('unknown feed style.'))
  }

  this.i += 1
}
SLEEPStream.prototype.end = function () {
  if (this.ended) return
  if (this.opts.style === 'newline') {
    // do nothing
  } else if (this.opts.style === 'array') {
    if (this.started) this.queue(']')
    else this.queue('[]')
  } else if (this.opts.style === 'object') {
    if (this.started) this.queue(']}')
    else this.queue('{"rows":[]}')
  } else {
    this.emit('error', new Error('unknown feed style.'))
  }

  this.queue(null)
  this.ended = true
}

function readData (stream, cb) {
  cb = once(cb)
  var finished = false
  stream.pipe(split()).pipe(through(write))
  function write(buf) {
    if (finished) return
    var ret
    try { ret = JSON.parse(buf) }
    catch(e) { cb(e) }
    if (ret) {
      finished = true
      cb(null, ret)
    }
  }
}

function SLEEP (getSequences, options) {
  this.getSequences = getSequences
  this.options = options || {}
}
SLEEP.prototype.httpHandler = function (req, resp) {
  var self = this
  if (req.method === 'GET') {
    var opts = qs.parse(url.parse(req.url).query)
    _httpHandler(opts)
  } if (req.method === 'POST') {
    readData(req, function (e, opts) {
      if (e) return resp.writeHead(500, 'socket error')
      _httpHandler(opts)
    })
  }

  function _httpHandler (opts) {
    resp.statusCode = 200
    resp.setHeader('content-type', 'application/json')
    self.handler(opts, resp)
  }
}
SLEEP.prototype.netHandler = function (socket) {
  var self = this
  readData(socket, function (e, opts) {
    if (e) return socket.close()
    self.handler(opts, socket)
  })
}
SLEEP.prototype.handler = function (opts, stream) {
  var self = this
  var sl = new SLEEPStream(extend({}, this.options, opts))
  self.getSequences(opts).pipe(sl).pipe(stream)
}

exports.SLEEP = SLEEP
exports.SLEEPStream = SLEEPStream
exports.fromObject = fromObject
exports.fromArray = fromArray