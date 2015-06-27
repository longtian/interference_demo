"use strict";

if (process.argv.length < 3) {
    console.log('Usage: node interference.js <pid>');
    process.exit(1);
}

var pid = parseInt(process.argv[2], 10);
var Client = require('_debugger').Client;
var client = new Client();

// once the client disconnent, stop the process
client.unref();

// capture all err
client.on('error', function (err) {
    console.error(err);
});

/**
 * send SIGUSR1 to the process to begin debug mode
 *
 * @param pid
 */
function enterDebugMode(pid) {
    process.kill(pid, 'SIGUSR1');
}

/**
 * peek on the global variable named message
 *
 */
function peekTheMessage() {
    client.req({
        'command': 'evaluate',
        'arguments': {
            'expression': 'global.message',
            'global': true
        }
    }, function (err, body, res) {
        if (err) {
            throw new Error(err);
        }
        console.log('peek successful', body.text);
    });
}


/**
 * modify the message
 *
 */
function modifyTheMessage(newMessage) {
    var msg = {
        'command': 'evaluate',
        'arguments': {
            'expression': 'global.message="' + newMessage + '"',
            'global': true
        }
    };
    client.req(msg, function (err, body, res) {
        console.log('modified to %s', newMessage);
    });
}


/**
 *
 */
function continueExecution() {
    client.reqContinue(function (err, body, res) {
        console.log('continued');
    });
}

/**
 *
 */
client.on('break', function () {
    console.log("break event");
    continueExecution();
});

enterDebugMode(pid);

setTimeout(function () {
    client.connect(5858);
    client.on('ready', function () {
        peekTheMessage();
        modifyTheMessage('hello bugs!');
    });
}, 500);

