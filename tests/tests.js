var sleep = require('../')
  , net = require('net')
  , http = require('http')
  , jsonstream = require("JSONStream")
  , test = require('tape')
  , concat = require('concat-stream')
  , request = require('request')
  ;

test('http client', function(t) {
  var sl = getStore()
  insertDummyData(sl)

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
  insertDummyData(sl)
  
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
  insertDummyData(sl)
  
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

test('opts.style = newline', function(t) {
  var sl = getStore()
  insertDummyData(sl)

  var expected = new Buffer('{"seq":2,"id":"test2"}\r\n{"seq":3,"id":"test1"}\r\n')
  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  
  httpServer.listen(8888, function () {
    var req = request('http://localhost:8888?style=newline', function(err, resp, buff) {
      t.equal(buff.toString(), expected.toString())
      httpServer.close()
      t.end()
    })
  })
})

test('opts.style = array', function(t) {
  var sl = getStore()
  insertDummyData(sl)

  var expected = [{"seq":2,"id":"test2"},{"seq":3,"id":"test1"}]
  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  
  httpServer.listen(8888, function () {
    var req = request('http://localhost:8888?style=array', function(err, resp, buff) {
      t.equal(JSON.stringify(JSON.parse(buff)), JSON.stringify(expected))
      httpServer.close()
      t.end()
    })
  })
})

test('opts.style = object', function(t) {
  var sl = getStore()
  insertDummyData(sl)

  var expected = {"rows": [{"seq":2,"id":"test2"},{"seq":3,"id":"test1"}]}
  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  
  httpServer.listen(8888, function () {
    var req = request('http://localhost:8888?style=object', function(err, resp, buff) {
      t.equal(JSON.stringify(JSON.parse(buff)), JSON.stringify(expected))
      httpServer.close()
      t.end()
    })
  })
})

test('opts.style = sse', function(t) {
  var sl = getStore()
  insertDummyData(sl)

  var expected = 'event: data\ndata: {"seq":2,"id":"test2"}\n\nevent: data\ndata: {"seq":3,"id":"test1"}\n\n'
  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  
  httpServer.listen(8888, function () {
    var req = request('http://localhost:8888?style=sse', function(err, resp, buff) {
      t.equal(buff.toString(), expected)
      httpServer.close()
      t.end()
    })
  })
})

test('client parsing', function(t) {
  var sl = getStore()
  insertDummyData(sl)

  var httpServer = http.createServer(sl.httpHandler.bind(sl))
  var pending = 3
  
  httpServer.listen(8888, function () {
    testNewline()
    testArray()
    testObject()
  })
  
  function testNewline() {
    var httpClient = sleep.client('http://127.0.0.1:8888', {style: 'newline'})
    var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
    testClient(t, httpClient, expected, done)
  }
  
  function testArray() {
    var httpClient = sleep.client('http://127.0.0.1:8888', {style: 'array'})
    var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
    testClient(t, httpClient, expected, done)
  }
  
  function testObject() {
    var httpClient = sleep.client('http://127.0.0.1:8888', {style: 'object'})
    var expected = [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ]
    testClient(t, httpClient, expected, done)
  }
  
  function done() {
    pending--
    if (pending > 0) return
    httpServer.close()
    t.end()
  }
})

function insertDummyData(sl) {
  sl.store.put('test1', 1)
  sl.store.put('test2', 2)
  sl.store.put('test1', 3)
}

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
    t.equal(changes.length, 2, '2 items')
    t.equal(JSON.stringify(changes), JSON.stringify(expected), 'results match')
    cb()
  }
}
