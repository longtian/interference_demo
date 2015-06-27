"use strict";

var http = require('http');

// message content will be modified !
global.message = "hello world!";

var server = http.createServer();
server.on('request', function (req, res) {
    res.end(global.message);
});
server.listen(8001);

console.log('Visit http://localhost:8001 to see the message');
console.log('pid = %d', process.pid);