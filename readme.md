## SLEEP

`npm install sleep-ref`

SLEEP is a protocol envisioned by @maxogden for open data publication and synchronization.

This project is meant to iterate on the spec through implementation and also to produce a module that is easily usable by other databases to expose their data with SLEEP.

```javascript
var sleep = require('sleep-ref')
  , http = require('http')
  ;

function getSequences (opts, cb) {
  var c = mydatabase.changes() // [{id:'uuid', seq:1}, {id:'uuid2', seq:3}]
  if (opts.include_data) c.forEach(function (c) {c.data = mydatabase.get(c.id)})
  cb(null, c)
}

var sl = sleep(getSequences)

http.createServer(function (req, resp) {
  sl.httpHandler(req, resp)
})

net.createServer(function (socket) {
  sl.netHandler(socket)
})
```