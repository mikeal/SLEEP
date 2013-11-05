var sleep = require('../')
  , net = require('net')
  , http = require('http')
  , jsonstream = require("JSONStream")
  , assert = require('assert')
  , cleanup = require('cleanup')
  , ok = require('okdone')
  ;

var d = cleanup(function (error) {
  if (error) process.exit(1)
  netServer.close()
  httpServer.close()
  ok.done()
})

var store = sleep.memstore()
  , sl = sleep(store.getSequences.bind(store))
  ;

var netServer = net.createServer(sl.netHandler.bind(sl))
  , httpServer = http.createServer(sl.httpHandler.bind(sl))
  ;
netServer.listen(9999, function () {
  httpServer.listen(8888, function () {
    var netClient = sleep.client('tcp://127.0.0.1:9999')
      , httpClient = sleep.client('http://127.0.0.1:8888')
      ;
    test('net', netClient)
    test('http', httpClient)
  })
})

var i = 0
function check (name) {
  i += 1
  ok(name)
  if (i === 2) {
    d.cleanup()
  }
}

function test (name, client) {
  var changes = []
  client.on('data', changes.push.bind(changes))
  client.on('end', function () {
    assert.equal(changes.length, 2)
    assert.deepEqual(changes, [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ])
    check(name)
  })
}

ok.expect(2)

store.put('test1', 1)
store.put('test2', 2)
store.put('test1', 3)