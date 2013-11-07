var sleep = require('../')
  , net = require('net')
  , http = require('http')
  , jsonstream = require("JSONStream")
  , test = require('tape')
  , concat = require('concat-stream')
  ;

test('http client', function(t) {
  var sl = getStore()

  sl.store.put('test1', 1)
  sl.store.put('test2', 2)
  sl.store.put('test1', 3)

  var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  
  httpServer.listen(8888, function () {
    var httpClient = sleep.client('http://127.0.0.1:8888')
    testClient(t, httpClient, expected, function() {
      httpServer.close()
      t.end()
    })
  })
})

test('tcp client', function(t) {
  var sl = getStore()
  
  sl.store.put('test1', 1)
  sl.store.put('test2', 2)
  sl.store.put('test1', 3)
  
  var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
  var netServer = net.createServer(sl.netHandler.bind(sl))
  
  netServer.listen(9999, function () {
    var netClient = sleep.client('tcp://127.0.0.1:9999')
    testClient(t, netClient, expected, function() {
      netServer.close()
      t.end()
    })
  })
})

test('raw socket JSON parsing', function(t) {
  var sl = getStore()
  
  sl.store.put('test1', 1)
  sl.store.put('test2', 2)
  sl.store.put('test1', 3)
  
  var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
  var netServer = net.createServer(sl.netHandler.bind(sl))
  
  netServer.listen(9999, function () {
    var socket = net.connect(9999)
      , parser = jsonstream.parse([true])
      , changes = []
      ;
    
    socket.write('{}\r\n')
    socket.pipe(parser)

    parser.pipe(concat(function(changes) {
      t.equal(changes.length, 2)
      t.equal(JSON.stringify(changes), JSON.stringify(expected))
      netServer.close()
      t.end()
    }))
  })
})

function getStore() {
  var store = sleep.memstore()
    , sl = sleep(store.getSequences.bind(store))
    ;
  sl.store = store
  return sl
}

function testClient (t, client, expected, cb) {
  client.pipe(concat(getChanges))
  function getChanges(changes) {
    t.equal(changes.length, 2)
    t.equal(JSON.stringify(changes), JSON.stringify(expected))
    cb()
  }
}
