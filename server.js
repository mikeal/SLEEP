var qs = require('querystring')
  , url = require('url')
  , once = require('once')
  , util = require('util')
  , stream = require('stream')
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
  if (this.i > this.opts.limit) return this.end()

  if (this.opts.style === 'newline') {
    this.push(JSON.stringify(change) + this.opts.sep || '\r\n')
  } else if (this.opts.style === 'array') {

    if (this.i === 0) this.push('[')
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
    this.push(this.opts.sep || '\r\n' + this.opts.sep || '\r\n')
  } else if (this.opts.style === 'array') {
    this.push(']')
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

function SLEEP (getSequences) {
  this.getSequences = getSequences
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
  var sleepstream = new SLEEPStream(opts)
  sleepstream.pipe(stream)
  var ret = self.getSequences(opts, function (e, changes) {
    if (ret) return
    // defer in case this is called synchronously
    setImmediate(function () {
      changes.forEach(function (c) { sleepstream.change(c) })
      sleepstream.end()
    })
  })
  if (ret && ret.on) {
    ret.on('entry', sleepstream.change.bind(sleepstream))
    ret.on('error', stream.close ? stream.close.bind(stream) : stream.end.bind(stream))
    ret.on('end', sleepstream.end.bind(sleepstream))
  }
}

exports.SLEEP = SLEEP
exports.SLEEPStream = SLEEPStream
exports.fromObject = fromObject
exports.fromArray = fromArray