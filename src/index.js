(function (global) {
    var PENDING = 'pendding',
        RESOLVED = 'resolved',
        REJECTED = 'rejected';
    var Promise = function (fun) {
        if (!fun instanceof Function) {
            throw 'Promise resolver undefined is not a function';
            return;
        }
        var self = this,
            resolve = function (val) {
                return self.resolve(val);
            },
            reject = function (val) {
                return self.reject(val);
            };
        self.status = PENDING;
        self.onResolved = [];
        self.onRejected = [];
        fun(resolve, reject);
    };
    var fn = Promise.prototype;
    fn.then = function (onResolved, onRejected) {
        var self = this;
        return new Promise(function(resolve,reject){
            var resolveHandle = function(val){
                var res = onResolved ? onResolved(val): val;
                if(Promise.isPromise(res)){
                    res.then(function(val){
                        resolve(val)
                    })
                }else{
                    resolve(val);
                }
            };
            var rejectHandle  = function(val){
                var res = onRejected ? onRejected(val): val;
                if(Promise.isPromise(res)){
                    res.then(function(val){
                        reject(val);
                    })
                }else{
                    reject(val);
                }
            };
            self.onResolved.push(resolveHandle);
            self.onRejected.push(rejectHandle);
            if(self.status == RESOLVED){
                resolveHandle(self.value);
            }
            if(self.status == REJECTED){
                rejectHandle(self.value);
            }
        })
    };
    fn.catch = function(onRejected){
        return this.then(null,onRejected);
    };
    /**
     * 成功回调
     * */
    fn.resolve = function (val) {
        if (this.status == PENDING) {
            this.status = RESOLVED;
            this.value = val;
            for (var i = 0, len = this.onResolved.length; i < len; i++) {
                this.onResolved[i](val);
            }
        }
    };
    /**
     * 失败回调
     * */
    fn.reject = function (val) {
        if (this.status == PENDING) {
            this.status = REJECTED;
            this.value = val;
            for (var i = 0, len = this.onRejected.length; i < len; i++) {
                this.onRejected[i](val);
            }
        }
    };
    Promise.isPromise = function (obj) {
        return obj instanceof Promise;
    };
    /**
     * 将对象转化为promise
     * */
    Promise.resolve = function (obj) {
        if (Promise.isPromise(obj)) {
            return obj;
        }
        return new Promise(function (resolve, reject) {
            resolve();
        })
    };
    /**
     * 转化为reject状态的promise
     * */
    Promise.reject = function (obj) {
        if (Promise.isPromise(obj)) {
            return obj;
        }
        return new Promise(function (resolve, reject) {
            reject();
        })
    };
})(this);