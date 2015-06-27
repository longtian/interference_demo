# intereference_demo

> If we know the pid of a running NodeJS process, is it possible to modify the variables used in it ?
> 
> The answer is Yes!

## Sample 

1. Start the server `node server.js`, Visit [http://localhost:8001](http://localhost:8001) you will see the original message

2. Run the interference script `node interference.js <pid>`, **replace the pid with the actual process pid of the running server**,
Visit [http://localhost:8001](http://localhost:8001) you will see the message has been changed.

## Reference

1. [V8 Debuger Protocol](https://github.com/buggerjs/bugger-v8-client/blob/master/PROTOCOL.md)
2. [oneapm-debugger](https://www.npmjs.com/package/oneapm-debugger)