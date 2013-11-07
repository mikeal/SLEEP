## SLEEP

[![NPM](https://nodei.co/npm/sleep-ref.png)](https://nodei.co/npm/sleep-ref/)

SLEEP is a protocol envisioned by @maxogden for open data publication and synchronization. It stands for Syncasble Lightweight Event Emitting Persistence, but is mostly just a pun on REST.

The official SLEEP spec lives [on dataprotocols.org](http://dataprotocols.org/sleep/). `sleep-ref` doesn't necessarily follow the spec as it is currently written -- consider this to be more experimental.

This project is meant to iterate on the spec through implementation and also to produce a module that is easily usable by other databases to expose their data with SLEEP.

### Server

```javascript
var sleep = require('sleep-ref')
  , http = require('http')
  , net = require('net')
  ;

function getSequences (opts) {
  var c = mydatabase.getChangesStream(opts) // emits {id:'uuid', seq:1}, {id:'uuid2', seq:3}
  // if opts.include_data it emits e.g. c.data = mydatabase.get(c.id)
  return c
}

var sl = sleep(getSequences)

http.createServer(function (req, resp) {
  sl.httpHandler(req, resp)
})

net.createServer(function (socket) {
  sl.netHandler(socket)
})
```

### Client

```javascript
var sleep = require('sleep-ref')
  , changes = sleep.client('http://localhost:8888/', { include_data: true })
  ;
changes.on('data', function (entry) { console.log(entry) })
changes.on('end', function () { console.log('up to date') })
```

`sleep.client(url[, opts])` takes all valid SLEEP options. The url responds to the following protocols: `http:`, `https:`, `tcp:`, and `tls:`. You can pass tls options to `opts` via the `tls` property.

### Tests

    % make test

or if you don't have `make`:

    % npm install
    % npm test
