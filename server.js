var qs = require('querystring')
  , url = require('url')
  , once = require('once')
  , util = require('util')
  , concat = require('concat-stream')
  , stream = require('stream')
  , _ = require('lodash')
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
  stream.Readable.call(this)

  opts.limit = opts.limit || Infinity
  opts.style = opts.style || 'array'
  this.opts = opts
  this.i = 0
}
util.inherits(SLEEPStream, stream.Readable)
SLEEPStream.prototype.change = function (change) {
  this.started = true
  if (this.i > this.opts.limit) return this.end()

  if (this.opts.style === 'newline') {
    this.push(JSON.stringify(change) + (this.opts.sep || '\r\n'))
  } else if (this.opts.style === 'array') {

    if (this.i === 0) this.push('[')
    else this.push(',')

    this.push(JSON.stringify(change))
  } else if (this.opts.style === 'object') {

    if (this.i === 0) this.push('{"rows":[')
    else this.push(',')
    
    this.push(JSON.stringify(change))
  } else {
    this.emit('error', new Error('unknown feed style.'))
  }

  this.i += 1
}
SLEEPStream.prototype._read = function () {}
SLEEPStream.prototype.end = function () {
  if (this.ended) return
  if (this.opts.style === 'newline') {
    var sep = this.opts.sep 
    if (this.started) this.push(sep || '\r\n' + (sep ? sep : ''))
  } else if (this.opts.style === 'array') {
    if (this.started) this.push(']')
    else this.push('[]')
  } else if (this.opts.style === 'object') {
    if (this.started) this.push(']}')
    else this.push('{"rows":[]}')
  } else {
    this.emit('error', new Error('unknown feed style.'))
  }

  this.emit('end')
  this.ended = true
}

function readData (stream, cb) {
  var buf = ''
    , finished
    , cb = once(cb)
    ;
  stream.on('data', function (c) {buf += c; check()})
  stream.on('error', cb)
  function check () {
    if (finished) return
    if (buf.indexOf('\r\n') !== -1) {
      buf = buf.slice(0, buf.indexOf('\r\n'))
      var ret
      try {
        ret = JSON.parse(buf)
      } catch(e) {
        cb(e)
      }
      if (ret) cb(null, ret)
      finished = true
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
  var sleepstream = new SLEEPStream(_.extend({}, this.options, opts))
  sleepstream.pipe(stream)
  var seqStream = self.getSequences(opts)
  seqStream.on('data', sleepstream.change.bind(sleepstream))
  seqStream.on('error', stream.close ? stream.close.bind(stream) : stream.end.bind(stream))
  seqStream.on('end', sleepstream.end.bind(sleepstream))
}

exports.SLEEP = SLEEP
exports.SLEEPStream = SLEEPStream
exports.fromObject = fromObject
exports.fromArray = fromArray