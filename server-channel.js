var net = require('net')
var noise = require('noise-protocol-stream');

net.createServer(function (socket) {
  var server = noise()

  server.encrypt.pipe(socket).pipe(server.decrypt)

  // Emitted after the connection is accepted in the verify function
  server.encrypt.on('handshake', function (localPrivateKey, localPublicKey, remotePublicKey) {
    console.log(remotePublicKey)
  })

  // Reading and writing will only work after the connection is accepted
  server.decrypt.on('data', function (data) {
    console.log(data.toString())
  })

  server.encrypt.write('server response!!')

}).listen(6379)
