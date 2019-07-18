## promise 实现 
## 前言
作为ES6处理异步操作的新规范，Promise一经出现就广受欢迎。面试中也是如此，当然此时对前端的要求就不仅仅局限会用这个阶段了。下面就一起看下Promise相关的内容。

## Promise用法及实现
在开始之前，还是简单回顾下Promise是什么以及怎么用，直接上来谈实现有点空中花园的感觉。(下面示例参考自[阮大佬es6 Promis,](http://es6.ruanyifeng.com/?search=promise+ruanyi&x=11&y=5#docs/promise))   
### 定义
Promise 是异步编程的一种解决方案，可以认为是一个对象，可以从中获取异步操作的信息。以替代传统的回调事件。
### 常见用法
#### Promise的创建
es6规范中，Promise是个构造函数，所以创建如下：
```js
const promise = new Promise((resolve, reject) => {
    setTimeout(resolve, 200, 'resolve');
    // 可以为同步，如下操作
    return resolve('resolve')
})
```
注意resolve或者reject 一旦执行，后续的代码可以执行但就不会再更新状态(否则这状态回调就无法控制了)。
举个例子:
```js
var a = new Promise((resolve,reject)=>{
    resolve(1)
    console.log('执行代码，改变状态')
    throw new Error('ss')
})
a.then((res)=>{
    console.log('resolved >>>',res)
},(err)=>{
    console.log('rejected>>>',err)  
})

// 输出
// 执行代码，改变状态
// resolved >>> 1
```
因此，状态更新函数之后的再次改变状态的操作都是无效的，例如异常之类的也不会被catch。
逻辑代码推荐在状态更新之前执行。
#### 构造函数
构造函数接收一个函数，该函数会同步执行，即我们的逻辑处理函数，何时执行对应的回调，这部分逻辑还是要自己管理的。

至于如何执行回调，就和入参有关系了。  
两个入参resolve和reject，分别更新不同状态，以触发对应处理函数。
触发操作由Promise内部实现，我们只关注触发时机即可
#### 构造函数实现
那么要实现一个Promise，其构造函数应该是这么个样子：

```js
// 三种状态 
const STATUS = {
    PENDING: 'pending',
    RESOLVED:'resolved',
    REJECTED:'rejected'
}    
class Promise{
    constructor(fn){
        // 初始化状态
        this.status = STATUS.PENDING
        // resolve事件队列
        this.resolves = []
        // reject事件队列
        this.rejects = [] 
        // resolve和reject是内部提供的，用以改变状态。
        const resovle = (val)=>{
           // 显然这里应该是改变状态触发回调
           this.triggerResolve(val)
        }
        const reject = (val)=>{
           // 显然这里应该是改变状态触发回调
           this.triggerReject(val)
        }
        // 执行fn
        try{
            fn(resolve,reject)
       }catch(err){
           // 运行异常要触发reject，就需要在这里catch了
           this.triggerReject(err)
       }
    }
    then(){
    }
}
```
触发回调的triggerReject/triggerResolve 做的事情主要两个：

1. 更新当前状态
2. 执行回调队列中的事件

```js
    // 触发 reject回调  
    triggerReject(val){
        // 保存当前值，以供后面调用
        this.value = val
        // promise状态一经变化就不再更新，所以对于非pending状态，不再操作
        if (this.status === STATUS.PENDING) {
            // 更新状态
            this.status = STATUS.REJECTED
            // 循环执行回调队列中事件
            this.rejects.forEach((it) => {
                it(val)
            })
        }
    }
    // resolve 功能类似
    // 触发 resolve回调
    triggerResolve(val) {
        this.value = val
        if(this.status === STATUS.PENDING){
            this.status = STATUS.RESOLVED
            this.resolves.forEach((it,i)=>{
                it(val)
            })
        }
    }
```
此时执行的话还是不能达到目的的，因为this.resolves/ this.rejects的回调队列里面还是空呢。
下面就看如何会用then往回调队列中增加监听事件。
#### then
该方法为Promise实例上的方法，作用是为Promise实例增加状态改变时的回调函数。
接受两个参数，resolve和reject即我们所谓成功和失败回调，其中reject可选

then方法返回的是一个新的实例(也就是新建了一个Promise实例)，可实现链式调用。

```js
new Promise((resolve, reject) => {
  return resolve(1)
}).then(function(res) {
  // ...
}).then(function(res) {
  // ...
});
```
前面的结果为后边then的参数，这样可以实现次序调用。
若前面返回一个promise，则后面的then会依旧遵循promise的状态变化机制进行调用。
#### then 实现
看起来也简单，then是往事件队列中push事件。那么很容易得出下面的代码：
```js
// 两个入参函数
then(onResolved,onRejected){
    const resolvehandle=(val)=>{
          return   onResolved(val)
    },rejecthandle =(val)=>{
          return   onRejected(val)
    }
    // rejecthandle 
    this.resolves.push(resolvehandle)
    this.rejects.push(rejecthandle)
}
```
此时执行示例代码，可以得到结果了。
```js
new Promise((resolve, reject) => {
    setTimeout(resolve, 200, 'done');
}).then((res)=>{
    console.log(res)
}) // done
```
不过这里太简陋了，而且then还有个特点是支持链式调用其实返回的也是promise 对象。
我们来改进一下。
##### then支持链式调用
```js       
 then(onResolved,onRejected){
        // 返回promise 保证链式调用，注意这里每次then都新建了promise
        return new Promise((resolve,reject)=>{
            const resolvehandle = (val)=>{
                // 对于值，回调方法存在就直接执行，否则不变传递下去。
                let res = onResolved ? onResolved(val) : val
                if(Promise.isPromise(res)){
                    // 如果onResolved 是promise，那么就增加then
                    return res.then((val)=>{
                        resolve(val)
                    })
                }else {
                    // 更新状态，执行完了，后面的随便
                    return resolve(val)
                }
            },
            rejecthandle = (val)=>{
                var res = onRejected ? onRejected(val) : val;
                if (Promise.isPromise(res)) {
                    res.then(function (val) {
                        reject(val);
                    })
                } else {
                    reject(val);
                }
            }
            // 正常加入队列
            this.resolves.push(resolvehandle)
            this.rejects.push(rejecthandle)
        })
    }        
```
此时链式调用和promise 的回调也已经支持了，可以用如下代码测试。
```js
new Promise((resolve, reject) => {
    setTimeout(resolve, 200, 'done');
}).then((res)=>{
    return new Promise((resolve)=>{
        console.log(res)
        setTimeout(resolve, 200, 'done2');
    })
}).then((res)=>{
    console.log('second then>>', res)
})
```
#### 同步resolve的实现
不过此时对于同步的执行，还是有些问题。
因为then中的实现，只是将回调事件假如回调队列。  
对于同步的状态，then执行在构造函数之后，
此时事件队列为空，而状态已经为resolved，  
所以这种状态下需要加个判断，如果非pending状态直接执行回调。

```js       
 then(onResolved,onRejected){
             /**省略**/
            // 刚执行then 状态就更新，那么直接执行回调
            if(this.status === STATUS.RESOLVED){
                return resolvehandle(this.value)
            }
            if (this.status === STATUS.REJECTED){
                return rejecthandle(this.value)
            }    
        })
    }        
```
这样就能解决同步执行的问题。
```js
new Promise((resolve, reject) => {
    resolve('done')
}).then((res)=>{
    console.log(res)
})
// done
```

#### catch
catch方法是.then(null, rejection)或.then(undefined, rejection)的别名，用于指定发生错误时的回调函数。
直接看例子比较简单：

```js
getJSON('/posts.json').then(function(posts) {
  // ...
}).catch(function(error) {
  // 处理 getJSON 和 前一个回调函数运行时发生的错误
  console.log('发生错误！', error);
});
```
此时catch是是getJSON和第一个then运行时的异常，如果只是在then中指定reject函数，那么then中执行的异常无法捕获。
因为then返回了一个新的promise，同级的reject回调，不会被触发。
举个例子：

```js
var a = new Promise((resolve,reject)=>{
    resolve(1)
})
a.then((res)=>{
    console.log(res)
    throw new Error('then')
},(err)=>{
    console.log('catch err>>>',err)  // 不能catch
})
```
该catch只能捕获构造函数中的异常，对于then中的error就不能捕获了。

```js
var a = new Promise((resolve,reject)=>{
   resolve(1)
})
a.then((res)=>{
    console.log(res)
    throw new Error('then')
}).catch((err)=>{
    console.log('catch err>>>',err) // catch err>>> Error: then  at <anonymous>:6:11
})
```
推荐每个then之后都跟catch来捕获所有异常。

#### catch 的实现
基于catch方法是.then(null, rejection)或.then(undefined, rejection)的别名这句话，其实实现就比较简单了。
其内部实现调用then就可以了。
```js
catch(onRejected){
        return this.then(null, onRejected)
    }
```

#### Promise.resolve/Promise.reject
该方法为获取一个指定状态的Promise对象的快捷操作。
直接看例子比较清晰：
```js
Promise.resolve(1);
// 等价于
new Promise((resolve) => resolve(1));
Promise.reject(1);
// 等价于
new Promise((resolve,reject) => reject(1));

```

既然是Promise的自身属性，那么可以用es6的static来实现：
Promise.reject与其类似，就不再实现了。 
```js
    // 转为promise resolve 状态
    static resolve(obj){
        if (Promise.isPromise(obj)) {
            return obj;
        }
        // 非promise 转为promise
        return new Promise(function (resolve, reject) {
            resolve(obj);
        })
    }
```

## 结束语
### 参考文章
[阮一峰es6入门](http://es6.ruanyifeng.com/?search=promise+ruanyi&x=11&y=5#docs/promise#Promise-resolve)  
[https://promisesaplus.com/](https://promisesaplus.com/)  
[http://liubin.org/promises-book/#chapter1-what-is-promise](http://liubin.org/promises-book/#chapter1-what-is-promise)  

本想把常见的promise面试题一起加上的，后面就写成了promise的实现，手动Promise都可以实现的话，相关面试题应该问题不大。这里附一个[JavaScript | Promises interiew ](https://www.geeksforgeeks.org/javascript-promises/) 大家可以看看。[完整代码请戳](https://github.com/xiaoxiangdaiyu/promise/blob/master/src/es6.js) 
