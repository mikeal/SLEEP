var net = require('net')
  , http = require('http')
  , https = require('https')
  , jsonstream = require('JSONStream')
  , url = require('url')
  , split = require('binary-split')
  , util = require('util')
  , qs = require('querystring')
  , combiner = require('stream-combiner')
  , through = require('through')
  , _ = require('lodash')
  , headers = {'content-type':'application/json'}
  ;

module.exports = function (_url, opts) {
  var u = url.parse(_url)
    , opts = opts || {}
    ;
  if (u.protocol === 'tcp:') return netConnect(opts, u)
  if (u.protocol === 'tls:') return tlsConnect(opts, u)
  if (u.protocol === 'http:') return httpConnect(opts, u)
  if (u.protocol === 'https:') return httpsConnect(opts, u)
}

function jsonParser (opts) {
  opts.style = opts.style || 'array'
  var parser
  if (opts.style === 'newline') {
    parser = combiner(split(), through(parse))
    function parse(buff) {
      this.queue(JSON.parse(buff))
    }
  } else if (opts.style === 'array') {
    parser = jsonstream.parse([true])
  } else if (opts.style === 'object') {
    parser = jsonstream.parse(['rows', /./])
  } else {
    throw new Error('Unknown feed style.')
  }
  return parser
}

function httpopts (opts, u) {
  opts.path = u.path + '?' + qs.stringify(opts)
  opts.hostname = u.hostname
  opts.port = u.port
  opts.method = 'GET'
  opts.headers = headers
  return opts
}

function httpConnect (opts, u) {
  var r = http.request(httpopts(opts, u))
    , c = jsonParser(opts)
    ;
  r.on('response', function (resp) {
    if (!resp.statusCode === 200) return c.emit('error', new Error('StatusCode is not 200'))
    resp.pipe(c)
  })
  r.on('error', function(e) {
    return c.emit('error', e)
  })
  r.end()
  return c
}
 
function httpsConnect (opts, u) {
  var opts = _.clone(opts.tls || {})
  delete opts.tls
  var r = https.request(httpopts(opts, u))
    , c = jsonParser(opts)
    ;
  r.on('response', function (resp) {
    if (!resp.statusCode === 200) return c.emit('error', new Error('StatusCode is not 200'))
    resp.pipe(c)
  })
  r.end()
  return c
}

function netConnect (opts, u) {
  var socket = net.connect(u.port, u.hostname)
  socket.write(JSON.stringify(opts)+'\r\n')
  return socket.pipe(jsonParser(opts))
}

function tlsConnect (opts, u) {
  var socket = net.connect(u.port, u.hostname, opts.tls || {})
  socket.write(JSON.stringify(opts)+'\r\n')
  return socket.pipe(jsonParser(opts))
}
