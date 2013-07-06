var sleep = require('../')
  , net = require('net')
  , jsonstream = require("JSONStream")
  , assert = require('assert')
  , cleanup = require('cleanup')
  , ok = require('okdone')
  ;

var d = cleanup(function (error) {
  if (error) process.exit(1)
  ok.done()
  server.close()
})

var store = sleep.memstore()
  , sl = sleep(store.getSequences.bind(store))
  ;

var server = net.createServer(sl.netHandler.bind(sl))
server.listen(9999, function () {
  var socket = net.connect(9999)
    , parser = jsonstream.parse([true])
    , changes = []
    ;
  socket.write('{}\r\n')
  socket.pipe(parser)

  parser.on('data', function (change) {
    changes.push(change)
  })
  parser.on('end', function () {
    assert.equal(changes.length, 2)
    ok('length')
    assert.deepEqual(changes, [ { seq: 2, id: 'test2' }, { seq: 3, id: 'test1' } ])
    ok('deepEqual')
    d.cleanup()
  })
})

store.put('test1', 1)
store.put('test2', 2)
store.put('test1', 3)