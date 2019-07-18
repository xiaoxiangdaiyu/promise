

// 状态map
const STATUS = {
    PENDING: 'pending',
    RESOLVED: 'resolved',
    REJECTED: 'rejected'
}
class Promise {
    constructor(fn) {
        // 初始化配置信息
        this.initConfig()
        const resolve = (val) => {
            return this.triggerResolve(val)
        }
        const reject = (val) => {
            return this.triggerReject(val)
        }
        try {
            fn(resolve, reject)
        } catch (err) {
            this.triggerReject(err)
        }
    }
    // 转为promise resolve 状态
    static resolve(obj) {
        if (Promise.isPromise(obj)) {
            return obj;
        }
        return new Promise(function (resolve, reject) {
            resolve(obj);
        })
    }
    // 转为promise状态
    static reject(obj) {
        if (Promise.isPromise(obj)) {
            return obj;
        }
        return new Promise(function (resolve, reject) {
            reject();
        })
    }
    // 静态方法
    static isPromise(obj) {
        return obj instanceof Promise
    }
    // 触发 resolve回调
    triggerResolve(val) {
        this.value = val
        if (this.status === STATUS.PENDING) {
            this.status = STATUS.RESOLVED
            this.resolves.forEach((it, i) => {
                it(val)
            })
        }
    }
    // 触发 reject回调
    triggerReject(val) {
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
    initConfig() {
        // 记录状态
        this.status = STATUS.PENDING
        // resolve事件队列
        this.resolves = []
        // reject事件队列
        this.rejects = []
        // 当前值
        this.value = null
    }
    // 这里就是将 事件加入监听队列，如果状态更改
    // 如果是直接resoled 则执行
    then(onResolved, onRejected) {
        // 返回promise 保证链式调用，注意这里每次then都新建了promise
        return new Promise((resolve, reject) => {
            const resolvehandle = (val) => {
                // 对于值，回调方法存在就直接执行，否则不变传递下去。
                let res = onResolved ? onResolved(val) : val
                if (Promise.isPromise(res)) {
                    // 如果onResolved 是promise，那么就增加then
                    return res.then((val) => {
                        resolve(val)
                    })
                } else {
                    // 更新状态，执行完了，后面的随便
                    return resolve(val)
                }
            },
                rejecthandle = (val) => {
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
            // 刚执行then 状态就更新，那么直接执行回调
            if (this.status === STATUS.RESOLVED) {
                return resolvehandle(this.value)
            }
            if (this.status === STATUS.REJECTED) {
                return rejecthandle(this.value)
            }
        })
    }
    catch(onRejected) {
        return this.then(null, onRejected)
    }
}
