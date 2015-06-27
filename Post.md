# 使用 Debugger 动态修改 NodeJS 程序中的变量值

如果一个 NodeJS 进程正在运行，有办法修改程序中的变量值么？答案是：可以！本文将详细讲解如何实现。

## 启动一个 HTTP Server

用简单的 Hello World 做例子吧，不过略作修改。在 `global` 下放一个变量 `message`， 然后打印出来：

```js
// message content will be modified !
global.message = "hello world!";

var server = require('http').createServer(function (req, res) {
  res.end(global.message);
}).listen(8001);

console.log('pid = %d', process.pid);
```

通过命令启动 Server，可以看到进程的 pid，记住这个数值因为之后要用到。此时，通过用浏览器访问 `http://localhost:8001` 可以看到网页
上是 `hello world!`。 接下来我们将尝试在不改变代码，不重启进程的情况下把 `message` 换成 "hello bugs!"。

## 使 Server 进程进入 Debug 模式

V8 引擎在实现的时候留了一个 Debug 接口。在操作系统下给进程发一个 `SIGUSR1` 可以让 NodeJS 进程进入 Debug 模式。
进入 Debug 模式的进程会在本地启动一个 TCP Server 并且监听 `5858` 端口。 此时执行命令 `node debug localhost:5858` 就可以连接到调试
端口， 并且可以使用很多常用的 Debug 命令，比如 `c`继续执行，`s` 步入， `o`步出等。

## Debugger 协议

使用 `node debug` 命令连接到进程进行 Debug 的方式比较简单，但是要完成一些高级的功能就会处处受限，因为它只封装了 Debugger 协议中的一部分。下面介绍一下
这个简单的协议。

DebugClient 和 DebugServer 的通讯是通过 TCP 进行的。 DebugClient 第一次连接到 DebugServer 的时候会拿到一些 Header，比如 Node 版本， V8 版本等。
后面紧跟着一个空的消息1

**消息1**

```text
Content-Length: 0 \r\n
\r\n
```

消息实体分成 Header 和 Body，消息1的 Body 为空，所以 Header 中对应的 Content-Length 为 0。而在下面这个例子里，Body 为一个单行的 JSON 字符串，这是由协议所规定的。


**消息2**

```text
Content-Length: 46\r\n
\r\n
{"command":"version","type":"request","seq":1}
```

消息2的类型( type )是 `request`，代表这是 Client 发给 Server 的命令，其他的可能值是 `response` 和 `event` 分别代表 Server 对 Client 的相应，和 Server 端发生的事件。

**消息3**

```
Content-Length: 137\r\n
\r\n
{"seq":1,"request_seq":1,"type":"response","command":"version","success":true,"body":{"V8Version":"3.28.71.19"},"refs":[],"running":true}
```

消息2是 Client 发送给 Server的，消息3是 Server 对 Client 的相应，那么如何判断消息3是不是消息2的结果呢？可以看到消息2中的 seq 值是1，而
消息3中的 request_seq 值是1。 Debugger 协议正是通过这两个值把异步返回的结果和请求一一对应起来的。

Debugger 协议就是这么的简单。

### 实例化一个 Debugg Client

了解了 Debugger 协议后，相信好奇心强的程序员已经跃跃欲试自己实现一个了。本着不重复发明轮子的原则开始在网上找实现，找了好久找到这个库 [pDebug](https://www.npmjs.com/package/pDebug)，
可惜这个库已经好久不更新了。后来通过阅读 `node-inspector` 的源码才发现，其实 NodeJS 自带了一个 Debugger 模块, 相关代码在 `_debugger` 
模块里([源码](https://github.com/joyent/node/blob/master/lib/_debugger.js))，由于模块名是以 `_` 开头的，所以网上找不到它的 API，好在代码注释写的非常详细，很快就能上手。

我们需要的正是这个模块下的 Client， 而 Client 其实是继承于 Socket 的.

```js
var Client = require('_debugger').Client;
var client = new Client();

client.connect(5858);
client.on('ready', function () {
    // 连接成功
});
```

### 关键时刻到来了

接下来我们来看看如何修改这个 global 的变量，代码如下

```js
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
```

`client.req` 方法封装了 `type=request` 消息类型 和 `seq` 自增的逻辑，因此在构造 `msg` JSON对象的时候不需要指明这两个属性。
我们要修改 message 其实就是在 JavaScript 调用的顶层执行 `global.message=newMessage`


### 总结

此时，再访问 `http://localhost:8001` 可以看到网页上显示的内容已经由 `'hello world!'` 变成了 `'hello bugs!'`，是不是很神奇。这种方式也带来了很多可能性：

- 动态修改配置

线上的服务器不用重启就可以应用新的配置

- 模块注入

通过其他任意语言编写的应用程序为已经运行的 NodeJS 进程注入新的模块

- 性能监控

可以剥离用户线上代码对第三方性能监控模块的直接依赖

- 错误监控

发生异常时，通过 Debugger 可以抓到发生错误的函数和行号，并且抓取各个调用栈中的每一个变量，即使是在闭包里

- Chrome 调试

由于 Chrome 也是基于 V8 的，上述方法也可以用于 Chrome 相关的功能集成