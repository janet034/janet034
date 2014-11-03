/*! WebUploader 0.1.5 */
/**
 * @fileOverview 让内部各个部件的代码可以用[amd](https://github.com/amdjs/amdjs-api/wiki/AMD)模块定义方式组织起来。
 *
 * AMD API 内部的简单不完全实现，请忽略。只有当WebUploader被合并成一个文件的时候才会引入。
 */
(function (root, factory) {
  var modules = {},
    // 内部require, 简单不完全实现。
    // https://github.com/amdjs/amdjs-api/wiki/require
    _require = function (deps, callback) {
      var args, len, i;
      // 如果deps不是数组，则直接返回指定module
      if (typeof deps === 'string') {
        return getModule(deps);
      } else {
        args = [];
        for (len = deps.length, i = 0; i < len; i++) {
          args.push(getModule(deps[i]));
        }
        return callback.apply(null, args);
      }
    },
    // 内部define，暂时不支持不指定id.
    _define = function (id, deps, factory) {
      if (arguments.length === 2) {
        factory = deps;
        deps = null;
      }
      _require(deps || [], function () {
        setModule(id, factory, arguments);
      });
    },
    // 设置module, 兼容CommonJs写法。
    setModule = function (id, factory, args) {
      var module = { exports: factory }, returned;
      if (typeof factory === 'function') {
        args.length || (args = [
          _require,
          module.exports,
          module
        ]);
        returned = factory.apply(null, args);
        returned !== undefined && (module.exports = returned);
      }
      modules[id] = module.exports;
    },
    // 根据id获取module
    getModule = function (id) {
      var module = modules[id] || root[id];
      if (!module) {
        throw new Error('`' + id + '` is undefined');
      }
      return module;
    },
    // 将所有modules，将路径ids装换成对象。
    exportsTo = function (obj) {
      var key, host, parts, part, last, ucFirst;
      // make the first character upper case.
      ucFirst = function (str) {
        return str && str.charAt(0).toUpperCase() + str.substr(1);
      };
      for (key in modules) {
        host = obj;
        if (!modules.hasOwnProperty(key)) {
          continue;
        }
        parts = key.split('/');
        last = ucFirst(parts.pop());
        while (part = ucFirst(parts.shift())) {
          host[part] = host[part] || {};
          host = host[part];
        }
        host[last] = modules[key];
      }
      return obj;
    }, makeExport = function (dollar) {
      root.__dollar = dollar;
      // exports every module.
      return exportsTo(factory(root, _define, _require));
    }, origin;
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // For CommonJS and CommonJS-like environments where a proper window is present,
    module.exports = makeExport();
  } else if (typeof define === 'function' && define.amd) {
    // Allow using this built library as an AMD module
    // in another project. That other project will only
    // see this AMD call, not the internal modules in
    // the closure below.
    define(['jquery'], makeExport);
  } else {
    // Browser globals case. Just assign the
    // result to a property on the global.
    origin = root.WebUploader;
    root.WebUploader = makeExport();
    root.WebUploader.noConflict = function () {
      root.WebUploader = origin;
    };
  }
}(window, function (window, define, require) {
  /**
     * @fileOverview jQuery or Zepto
     */
  define('dollar-third', [], function () {
    var $ = window.__dollar || window.jQuery || window.Zepto;
    if (!$) {
      throw new Error('jQuery or Zepto not found!');
    }
    return $;
  });
  /**
     * @fileOverview Dom 操作相关
     */
  define('dollar', ['dollar-third'], function (_) {
    return _;
  });
  /**
     * @fileOverview 使用jQuery的Promise
     */
  define('promise-third', ['dollar'], function ($) {
    return {
      Deferred: $.Deferred,
      when: $.when,
      isPromise: function (anything) {
        return anything && typeof anything.then === 'function';
      }
    };
  });
  /**
     * @fileOverview Promise/A+
     */
  define('promise', ['promise-third'], function (_) {
    return _;
  });
  /**
     * @fileOverview 基础类方法。
     */
  /**
     * Web Uploader内部类的详细说明，以下提及的功能类，都可以在`WebUploader`这个变量中访问到。
     *
     * As you know, Web Uploader的每个文件都是用过[AMD](https://github.com/amdjs/amdjs-api/wiki/AMD)规范中的`define`组织起来的, 每个Module都会有个module id.
     * 默认module id为该文件的路径，而此路径将会转化成名字空间存放在WebUploader中。如：
     *
     * * module `base`：WebUploader.Base
     * * module `file`: WebUploader.File
     * * module `lib/dnd`: WebUploader.Lib.Dnd
     * * module `runtime/html5/dnd`: WebUploader.Runtime.Html5.Dnd
     *
     *
     * 以下文档中对类的使用可能省略掉了`WebUploader`前缀。
     * @module WebUploader
     * @title WebUploader API文档
     */
  define('base', [
    'dollar',
    'promise'
  ], function ($, promise) {
    var noop = function () {
      }, call = Function.call;
    // http://jsperf.com/uncurrythis
    // 反科里化
    function uncurryThis(fn) {
      return function () {
        return call.apply(fn, arguments);
      };
    }
    function bindFn(fn, context) {
      return function () {
        return fn.apply(context, arguments);
      };
    }
    function createObject(proto) {
      var f;
      if (Object.create) {
        return Object.create(proto);
      } else {
        f = function () {
        };
        f.prototype = proto;
        return new f();
      }
    }
    /**
         * 基础类，提供一些简单常用的方法。
         * @class Base
         */
    return {
      version: '0.1.5',
      $: $,
      Deferred: promise.Deferred,
      isPromise: promise.isPromise,
      when: promise.when,
      browser: function (ua) {
        var ret = {}, webkit = ua.match(/WebKit\/([\d.]+)/), chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/), ie = ua.match(/MSIE\s([\d\.]+)/) || ua.match(/(?:trident)(?:.*rv:([\w.]+))?/i), firefox = ua.match(/Firefox\/([\d.]+)/), safari = ua.match(/Safari\/([\d.]+)/), opera = ua.match(/OPR\/([\d.]+)/);
        webkit && (ret.webkit = parseFloat(webkit[1]));
        chrome && (ret.chrome = parseFloat(chrome[1]));
        ie && (ret.ie = parseFloat(ie[1]));
        firefox && (ret.firefox = parseFloat(firefox[1]));
        safari && (ret.safari = parseFloat(safari[1]));
        opera && (ret.opera = parseFloat(opera[1]));
        return ret;
      }(navigator.userAgent),
      os: function (ua) {
        var ret = {},
          // osx = !!ua.match( /\(Macintosh\; Intel / ),
          android = ua.match(/(?:Android);?[\s\/]+([\d.]+)?/), ios = ua.match(/(?:iPad|iPod|iPhone).*OS\s([\d_]+)/);
        // osx && (ret.osx = true);
        android && (ret.android = parseFloat(android[1]));
        ios && (ret.ios = parseFloat(ios[1].replace(/_/g, '.')));
        return ret;
      }(navigator.userAgent),
      inherits: function (Super, protos, staticProtos) {
        var child;
        if (typeof protos === 'function') {
          child = protos;
          protos = null;
        } else if (protos && protos.hasOwnProperty('constructor')) {
          child = protos.constructor;
        } else {
          child = function () {
            return Super.apply(this, arguments);
          };
        }
        // 复制静态方法
        $.extend(true, child, Super, staticProtos || {});
        /* jshint camelcase: false */
        // 让子类的__super__属性指向父类。
        child.__super__ = Super.prototype;
        // 构建原型，添加原型方法或属性。
        // 暂时用Object.create实现。
        child.prototype = createObject(Super.prototype);
        protos && $.extend(true, child.prototype, protos);
        return child;
      },
      noop: noop,
      bindFn: bindFn,
      log: function () {
        if (window.console) {
          return bindFn(console.log, console);
        }
        return noop;
      }(),
      nextTick: function () {
        return function (cb) {
          setTimeout(cb, 1);
        };  // @bug 当浏览器不在当前窗口时就停了。
            // var next = window.requestAnimationFrame ||
            //     window.webkitRequestAnimationFrame ||
            //     window.mozRequestAnimationFrame ||
            //     function( cb ) {
            //         window.setTimeout( cb, 1000 / 60 );
            //     };
            // // fix: Uncaught TypeError: Illegal invocation
            // return bindFn( next, window );
      }(),
      slice: uncurryThis([].slice),
      guid: function () {
        var counter = 0;
        return function (prefix) {
          var guid = (+new Date()).toString(32), i = 0;
          for (; i < 5; i++) {
            guid += Math.floor(Math.random() * 65535).toString(32);
          }
          return (prefix || 'wu_') + guid + (counter++).toString(32);
        };
      }(),
      formatSize: function (size, pointLength, units) {
        var unit;
        units = units || [
          'B',
          'K',
          'M',
          'G',
          'TB'
        ];
        while ((unit = units.shift()) && size > 1024) {
          size = size / 1024;
        }
        return (unit === 'B' ? size : size.toFixed(pointLength || 2)) + unit;
      }
    };
  });
  /**
     * 事件处理类，可以独立使用，也可以扩展给对象使用。
     * @fileOverview Mediator
     */
  define('mediator', ['base'], function (Base) {
    var $ = Base.$, slice = [].slice, separator = /\s+/, protos;
    // 根据条件过滤出事件handlers.
    function findHandlers(arr, name, callback, context) {
      return $.grep(arr, function (handler) {
        return handler && (!name || handler.e === name) && (!callback || handler.cb === callback || handler.cb._cb === callback) && (!context || handler.ctx === context);
      });
    }
    function eachEvent(events, callback, iterator) {
      // 不支持对象，只支持多个event用空格隔开
      $.each((events || '').split(separator), function (_, key) {
        iterator(key, callback);
      });
    }
    function triggerHanders(events, args) {
      var stoped = false, i = -1, len = events.length, handler;
      while (++i < len) {
        handler = events[i];
        if (handler.cb.apply(handler.ctx2, args) === false) {
          stoped = true;
          break;
        }
      }
      return !stoped;
    }
    protos = {
      on: function (name, callback, context) {
        var me = this, set;
        if (!callback) {
          return this;
        }
        set = this._events || (this._events = []);
        eachEvent(name, callback, function (name, callback) {
          var handler = { e: name };
          handler.cb = callback;
          handler.ctx = context;
          handler.ctx2 = context || me;
          handler.id = set.length;
          set.push(handler);
        });
        return this;
      },
      once: function (name, callback, context) {
        var me = this;
        if (!callback) {
          return me;
        }
        eachEvent(name, callback, function (name, callback) {
          var once = function () {
            me.off(name, once);
            return callback.apply(context || me, arguments);
          };
          once._cb = callback;
          me.on(name, once, context);
        });
        return me;
      },
      off: function (name, cb, ctx) {
        var events = this._events;
        if (!events) {
          return this;
        }
        if (!name && !cb && !ctx) {
          this._events = [];
          return this;
        }
        eachEvent(name, cb, function (name, cb) {
          $.each(findHandlers(events, name, cb, ctx), function () {
            delete events[this.id];
          });
        });
        return this;
      },
      trigger: function (type) {
        var args, events, allEvents;
        if (!this._events || !type) {
          return this;
        }
        args = slice.call(arguments, 1);
        events = findHandlers(this._events, type);
        allEvents = findHandlers(this._events, 'all');
        return triggerHanders(events, args) && triggerHanders(allEvents, arguments);
      }
    };
    /**
         * 中介者，它本身是个单例，但可以通过[installTo](#WebUploader:Mediator:installTo)方法，使任何对象具备事件行为。
         * 主要目的是负责模块与模块之间的合作，降低耦合度。
         *
         * @class Mediator
         */
    return $.extend({
      installTo: function (obj) {
        return $.extend(obj, protos);
      }
    }, protos);
  });
  /**
     * @fileOverview Uploader上传类
     */
  define('uploader', [
    'base',
    'mediator'
  ], function (Base, Mediator) {
    var $ = Base.$;
    /**
         * 上传入口类。
         * @class Uploader
         * @constructor
         * @grammar new Uploader( opts ) => Uploader
         * @example
         * var uploader = WebUploader.Uploader({
         *     swf: 'path_of_swf/Uploader.swf',
         *
         *     // 开起分片上传。
         *     chunked: true
         * });
         */
    function Uploader(opts) {
      this.options = $.extend(true, {}, Uploader.options, opts);
      this._init(this.options);
    }
    // default Options
    // widgets中有相应扩展
    Uploader.options = {};
    Mediator.installTo(Uploader.prototype);
    // 批量添加纯命令式方法。
    $.each({
      upload: 'start-upload',
      stop: 'stop-upload',
      getFile: 'get-file',
      getFiles: 'get-files',
      addFile: 'add-file',
      addFiles: 'add-file',
      sort: 'sort-files',
      removeFile: 'remove-file',
      cancelFile: 'cancel-file',
      skipFile: 'skip-file',
      retry: 'retry',
      isInProgress: 'is-in-progress',
      makeThumb: 'make-thumb',
      md5File: 'md5-file',
      getDimension: 'get-dimension',
      addButton: 'add-btn',
      predictRuntimeType: 'predict-runtime-type',
      refresh: 'refresh',
      disable: 'disable',
      enable: 'enable',
      reset: 'reset'
    }, function (fn, command) {
      Uploader.prototype[fn] = function () {
        return this.request(command, arguments);
      };
    });
    $.extend(Uploader.prototype, {
      state: 'pending',
      _init: function (opts) {
        var me = this;
        me.request('init', opts, function () {
          me.state = 'ready';
          me.trigger('ready');
        });
      },
      option: function (key, val) {
        var opts = this.options;
        // setter
        if (arguments.length > 1) {
          if ($.isPlainObject(val) && $.isPlainObject(opts[key])) {
            $.extend(opts[key], val);
          } else {
            opts[key] = val;
          }
        } else {
          // getter
          return key ? opts[key] : opts;
        }
      },
      getStats: function () {
        // return this._mgr.getStats.apply( this._mgr, arguments );
        var stats = this.request('get-stats');
        return stats ? {
          successNum: stats.numOfSuccess,
          progressNum: stats.numOfProgress,
          cancelNum: stats.numOfCancel,
          invalidNum: stats.numOfInvalid,
          uploadFailNum: stats.numOfUploadFailed,
          queueNum: stats.numOfQueue,
          interruptNum: stats.numofInterrupt
        } : {};
      },
      trigger: function (type) {
        var args = [].slice.call(arguments, 1), opts = this.options, name = 'on' + type.substring(0, 1).toUpperCase() + type.substring(1);
        if (Mediator.trigger.apply(this, arguments) === false || $.isFunction(opts[name]) && opts[name].apply(this, args) === false || $.isFunction(this[name]) && this[name].apply(this, args) === false || Mediator.trigger.apply(Mediator, [
            this,
            type
          ].concat(args)) === false) {
          return false;
        }
        return true;
      },
      destroy: function () {
        this.request('destroy', arguments);
        this.off();
      },
      request: Base.noop
    });
    /**
         * 创建Uploader实例，等同于new Uploader( opts );
         * @method create
         * @class Base
         * @static
         * @grammar Base.create( opts ) => Uploader
         */
    Base.create = Uploader.create = function (opts) {
      return new Uploader(opts);
    };
    // 暴露Uploader，可以通过它来扩展业务逻辑。
    Base.Uploader = Uploader;
    return Uploader;
  });
  /**
     * @fileOverview Runtime管理器，负责Runtime的选择, 连接
     */
  define('runtime/runtime', [
    'base',
    'mediator'
  ], function (Base, Mediator) {
    var $ = Base.$, factories = {},
      // 获取对象的第一个key
      getFirstKey = function (obj) {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            return key;
          }
        }
        return null;
      };
    // 接口类。
    function Runtime(options) {
      this.options = $.extend({ container: document.body }, options);
      this.uid = Base.guid('rt_');
    }
    $.extend(Runtime.prototype, {
      getContainer: function () {
        var opts = this.options, parent, container;
        if (this._container) {
          return this._container;
        }
        parent = $(opts.container || document.body);
        container = $(document.createElement('div'));
        container.attr('id', 'rt_' + this.uid);
        container.css({
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        });
        parent.append(container);
        parent.addClass('webuploader-container');
        this._container = container;
        this._parent = parent;
        return container;
      },
      init: Base.noop,
      exec: Base.noop,
      destroy: function () {
        this._container && this._container.remove();
        this._parent && this._parent.removeClass('webuploader-container');
        this.off();
      }
    });
    Runtime.orders = 'html5,flash';
    /**
         * 添加Runtime实现。
         * @param {String} type    类型
         * @param {Runtime} factory 具体Runtime实现。
         */
    Runtime.addRuntime = function (type, factory) {
      factories[type] = factory;
    };
    Runtime.hasRuntime = function (type) {
      return !!(type ? factories[type] : getFirstKey(factories));
    };
    Runtime.create = function (opts, orders) {
      var type, runtime;
      orders = orders || Runtime.orders;
      $.each(orders.split(/\s*,\s*/g), function () {
        if (factories[this]) {
          type = this;
          return false;
        }
      });
      type = type || getFirstKey(factories);
      if (!type) {
        throw new Error('Runtime Error');
      }
      runtime = new factories[type](opts);
      return runtime;
    };
    Mediator.installTo(Runtime.prototype);
    return Runtime;
  });
  /**
     * @fileOverview Runtime管理器，负责Runtime的选择, 连接
     */
  define('runtime/client', [
    'base',
    'mediator',
    'runtime/runtime'
  ], function (Base, Mediator, Runtime) {
    var cache;
    cache = function () {
      var obj = {};
      return {
        add: function (runtime) {
          obj[runtime.uid] = runtime;
        },
        get: function (ruid, standalone) {
          var i;
          if (ruid) {
            return obj[ruid];
          }
          for (i in obj) {
            // 有些类型不能重用，比如filepicker.
            if (standalone && obj[i].__standalone) {
              continue;
            }
            return obj[i];
          }
          return null;
        },
        remove: function (runtime) {
          delete obj[runtime.uid];
        }
      };
    }();
    function RuntimeClient(component, standalone) {
      var deferred = Base.Deferred(), runtime;
      this.uid = Base.guid('client_');
      // 允许runtime没有初始化之前，注册一些方法在初始化后执行。
      this.runtimeReady = function (cb) {
        return deferred.done(cb);
      };
      this.connectRuntime = function (opts, cb) {
        // already connected.
        if (runtime) {
          throw new Error('already connected!');
        }
        deferred.done(cb);
        if (typeof opts === 'string' && cache.get(opts)) {
          runtime = cache.get(opts);
        }
        // 像filePicker只能独立存在，不能公用。
        runtime = runtime || cache.get(null, standalone);
        // 需要创建
        if (!runtime) {
          runtime = Runtime.create(opts, opts.runtimeOrder);
          runtime.__promise = deferred.promise();
          runtime.once('ready', deferred.resolve);
          runtime.init();
          cache.add(runtime);
          runtime.__client = 1;
        } else {
          // 来自cache
          Base.$.extend(runtime.options, opts);
          runtime.__promise.then(deferred.resolve);
          runtime.__client++;
        }
        standalone && (runtime.__standalone = standalone);
        return runtime;
      };
      this.getRuntime = function () {
        return runtime;
      };
      this.disconnectRuntime = function () {
        if (!runtime) {
          return;
        }
        runtime.__client--;
        if (runtime.__client <= 0) {
          cache.remove(runtime);
          delete runtime.__promise;
          runtime.destroy();
        }
        runtime = null;
      };
      this.exec = function () {
        if (!runtime) {
          return;
        }
        var args = Base.slice(arguments);
        component && args.unshift(component);
        return runtime.exec.apply(this, args);
      };
      this.getRuid = function () {
        return runtime && runtime.uid;
      };
      this.destroy = function (destroy) {
        return function () {
          destroy && destroy.apply(this, arguments);
          this.trigger('destroy');
          this.off();
          this.exec('destroy');
          this.disconnectRuntime();
        };
      }(this.destroy);
    }
    Mediator.installTo(RuntimeClient.prototype);
    return RuntimeClient;
  });
  /**
     * @fileOverview 错误信息
     */
  define('lib/dnd', [
    'base',
    'mediator',
    'runtime/client'
  ], function (Base, Mediator, RuntimeClent) {
    var $ = Base.$;
    function DragAndDrop(opts) {
      opts = this.options = $.extend({}, DragAndDrop.options, opts);
      opts.container = $(opts.container);
      if (!opts.container.length) {
        return;
      }
      RuntimeClent.call(this, 'DragAndDrop');
    }
    DragAndDrop.options = {
      accept: null,
      disableGlobalDnd: false
    };
    Base.inherits(RuntimeClent, {
      constructor: DragAndDrop,
      init: function () {
        var me = this;
        me.connectRuntime(me.options, function () {
          me.exec('init');
          me.trigger('ready');
        });
      }
    });
    Mediator.installTo(DragAndDrop.prototype);
    return DragAndDrop;
  });
  /**
     * @fileOverview 组件基类。
     */
  define('widgets/widget', [
    'base',
    'uploader'
  ], function (Base, Uploader) {
    var $ = Base.$, _init = Uploader.prototype._init, _destroy = Uploader.prototype.destroy, IGNORE = {}, widgetClass = [];
    function isArrayLike(obj) {
      if (!obj) {
        return false;
      }
      var length = obj.length, type = $.type(obj);
      if (obj.nodeType === 1 && length) {
        return true;
      }
      return type === 'array' || type !== 'function' && type !== 'string' && (length === 0 || typeof length === 'number' && length > 0 && length - 1 in obj);
    }
    function Widget(uploader) {
      this.owner = uploader;
      this.options = uploader.options;
    }
    $.extend(Widget.prototype, {
      init: Base.noop,
      invoke: function (apiName, args) {
        /*
                    {
                        'make-thumb': 'makeThumb'
                    }
                 */
        var map = this.responseMap;
        // 如果无API响应声明则忽略
        if (!map || !(apiName in map) || !(map[apiName] in this) || !$.isFunction(this[map[apiName]])) {
          return IGNORE;
        }
        return this[map[apiName]].apply(this, args);
      },
      request: function () {
        return this.owner.request.apply(this.owner, arguments);
      }
    });
    // 扩展Uploader.
    $.extend(Uploader.prototype, {
      _init: function () {
        var me = this, widgets = me._widgets = [], deactives = me.options.disableWidgets || '';
        $.each(widgetClass, function (_, klass) {
          (!deactives || !~deactives.indexOf(klass._name)) && widgets.push(new klass(me));
        });
        return _init.apply(me, arguments);
      },
      request: function (apiName, args, callback) {
        var i = 0, widgets = this._widgets, len = widgets && widgets.length, rlts = [], dfds = [], widget, rlt, promise, key;
        args = isArrayLike(args) ? args : [args];
        for (; i < len; i++) {
          widget = widgets[i];
          rlt = widget.invoke(apiName, args);
          if (rlt !== IGNORE) {
            // Deferred对象
            if (Base.isPromise(rlt)) {
              dfds.push(rlt);
            } else {
              rlts.push(rlt);
            }
          }
        }
        // 如果有callback，则用异步方式。
        if (callback || dfds.length) {
          promise = Base.when.apply(Base, dfds);
          key = promise.pipe ? 'pipe' : 'then';
          // 很重要不能删除。删除了会死循环。
          // 保证执行顺序。让callback总是在下一个 tick 中执行。
          return promise[key](function () {
            var deferred = Base.Deferred(), args = arguments;
            if (args.length === 1) {
              args = args[0];
            }
            setTimeout(function () {
              deferred.resolve(args);
            }, 1);
            return deferred.promise();
          })[callback ? key : 'done'](callback || Base.noop);
        } else {
          return rlts[0];
        }
      },
      destroy: function () {
        _destroy.apply(this, arguments);
        this._widgets = null;
      }
    });
    /**
         * 添加组件
         * @grammar Uploader.register(proto);
         * @grammar Uploader.register(map, proto);
         * @param  {object} responseMap API 名称与函数实现的映射
         * @param  {object} proto 组件原型，构造函数通过 constructor 属性定义
         * @method Uploader.register
         * @for Uploader
         * @example
         * Uploader.register({
         *     'make-thumb': 'makeThumb'
         * }, {
         *     init: function( options ) {},
         *     makeThumb: function() {}
         * });
         *
         * Uploader.register({
         *     'make-thumb': function() {
         *         
         *     }
         * });
         */
    Uploader.register = Widget.register = function (responseMap, widgetProto) {
      var map = {
          init: 'init',
          destroy: 'destroy',
          name: 'anonymous'
        }, klass;
      if (arguments.length === 1) {
        widgetProto = responseMap;
        // 自动生成 map 表。
        $.each(widgetProto, function (key) {
          if (key[0] === '_' || key === 'name') {
            key === 'name' && (map.name = widgetProto.name);
            return;
          }
          map[key.replace(/[A-Z]/g, '-$&').toLowerCase()] = key;
        });
      } else {
        map = $.extend(map, responseMap);
      }
      widgetProto.responseMap = map;
      klass = Base.inherits(Widget, widgetProto);
      klass._name = map.name;
      widgetClass.push(klass);
      return klass;
    };
    /**
         * 删除插件，只有在注册时指定了名字的才能被删除。
         * @grammar Uploader.unRegister(name);
         * @param  {string} name 组件名字
         * @method Uploader.unRegister
         * @for Uploader
         * @example
         *
         * Uploader.register({
         *     name: 'custom',
         *     
         *     'make-thumb': function() {
         *         
         *     }
         * });
         *
         * Uploader.unRegister('custom');
         */
    Uploader.unRegister = Widget.unRegister = function (name) {
      if (!name || name === 'anonymous') {
        return;
      }
      // 删除指定的插件。
      for (var i = widgetClass.length; i--;) {
        if (widgetClass[i]._name === name) {
          widgetClass.splice(i, 1);
        }
      }
    };
    return Widget;
  });
  /**
     * @fileOverview DragAndDrop Widget。
     */
  define('widgets/filednd', [
    'base',
    'uploader',
    'lib/dnd',
    'widgets/widget'
  ], function (Base, Uploader, Dnd) {
    var $ = Base.$;
    Uploader.options.dnd = '';
    /**
         * @property {Selector} [dnd=undefined]  指定Drag And Drop拖拽的容器，如果不指定，则不启动。
         * @namespace options
         * @for Uploader
         */
    /**
         * @property {Selector} [disableGlobalDnd=false]  是否禁掉整个页面的拖拽功能，如果不禁用，图片拖进来的时候会默认被浏览器打开。
         * @namespace options
         * @for Uploader
         */
    /**
         * @event dndAccept
         * @param {DataTransferItemList} items DataTransferItem
         * @description 阻止此事件可以拒绝某些类型的文件拖入进来。目前只有 chrome 提供这样的 API，且只能通过 mime-type 验证。
         * @for  Uploader
         */
    return Uploader.register({
      name: 'dnd',
      init: function (opts) {
        if (!opts.dnd || this.request('predict-runtime-type') !== 'html5') {
          return;
        }
        var me = this, deferred = Base.Deferred(), options = $.extend({}, {
            disableGlobalDnd: opts.disableGlobalDnd,
            container: opts.dnd,
            accept: opts.accept
          }), dnd;
        this.dnd = dnd = new Dnd(options);
        dnd.once('ready', deferred.resolve);
        dnd.on('drop', function (files) {
          me.request('add-file', [files]);
        });
        // 检测文件是否全部允许添加。
        dnd.on('accept', function (items) {
          return me.owner.trigger('dndAccept', items);
        });
        dnd.init();
        return deferred.promise();
      },
      destroy: function () {
        this.dnd && this.dnd.destroy();
      }
    });
  });
  /**
     * @fileOverview 错误信息
     */
  define('lib/filepaste', [
    'base',
    'mediator',
    'runtime/client'
  ], function (Base, Mediator, RuntimeClent) {
    var $ = Base.$;
    function FilePaste(opts) {
      opts = this.options = $.extend({}, opts);
      opts.container = $(opts.container || document.body);
      RuntimeClent.call(this, 'FilePaste');
    }
    Base.inherits(RuntimeClent, {
      constructor: FilePaste,
      init: function () {
        var me = this;
        me.connectRuntime(me.options, function () {
          me.exec('init');
          me.trigger('ready');
        });
      }
    });
    Mediator.installTo(FilePaste.prototype);
    return FilePaste;
  });
  /**
     * @fileOverview 组件基类。
     */
  define('widgets/filepaste', [
    'base',
    'uploader',
    'lib/filepaste',
    'widgets/widget'
  ], function (Base, Uploader, FilePaste) {
    var $ = Base.$;
    /**
         * @property {Selector} [paste=undefined]  指定监听paste事件的容器，如果不指定，不启用此功能。此功能为通过粘贴来添加截屏的图片。建议设置为`document.body`.
         * @namespace options
         * @for Uploader
         */
    return Uploader.register({
      name: 'paste',
      init: function (opts) {
        if (!opts.paste || this.request('predict-runtime-type') !== 'html5') {
          return;
        }
        var me = this, deferred = Base.Deferred(), options = $.extend({}, {
            container: opts.paste,
            accept: opts.accept
          }), paste;
        this.paste = paste = new FilePaste(options);
        paste.once('ready', deferred.resolve);
        paste.on('paste', function (files) {
          me.owner.request('add-file', [files]);
        });
        paste.init();
        return deferred.promise();
      },
      destroy: function () {
        this.paste && this.paste.destroy();
      }
    });
  });
  /**
     * @fileOverview Blob
     */
  define('lib/blob', [
    'base',
    'runtime/client'
  ], function (Base, RuntimeClient) {
    function Blob(ruid, source) {
      var me = this;
      me.source = source;
      me.ruid = ruid;
      this.size = source.size || 0;
      // 如果没有指定 mimetype, 但是知道文件后缀。
      if (!source.type && this.ext && ~'jpg,jpeg,png,gif,bmp'.indexOf(this.ext)) {
        this.type = 'image/' + (this.ext === 'jpg' ? 'jpeg' : this.ext);
      } else {
        this.type = source.type || 'application/octet-stream';
      }
      RuntimeClient.call(me, 'Blob');
      this.uid = source.uid || this.uid;
      if (ruid) {
        me.connectRuntime(ruid);
      }
    }
    Base.inherits(RuntimeClient, {
      constructor: Blob,
      slice: function (start, end) {
        return this.exec('slice', start, end);
      },
      getSource: function () {
        return this.source;
      }
    });
    return Blob;
  });
  /**
     * 为了统一化Flash的File和HTML5的File而存在。
     * 以至于要调用Flash里面的File，也可以像调用HTML5版本的File一下。
     * @fileOverview File
     */
  define('lib/file', [
    'base',
    'lib/blob'
  ], function (Base, Blob) {
    var uid = 1, rExt = /\.([^.]+)$/;
    function File(ruid, file) {
      var ext;
      this.name = file.name || 'untitled' + uid++;
      ext = rExt.exec(file.name) ? RegExp.$1.toLowerCase() : '';
      // todo 支持其他类型文件的转换。
      // 如果有 mimetype, 但是文件名里面没有找出后缀规律
      if (!ext && file.type) {
        ext = /\/(jpg|jpeg|png|gif|bmp)$/i.exec(file.type) ? RegExp.$1.toLowerCase() : '';
        this.name += '.' + ext;
      }
      this.ext = ext;
      this.lastModifiedDate = file.lastModifiedDate || new Date().toLocaleString();
      Blob.apply(this, arguments);
    }
    return Base.inherits(Blob, File);
  });
  /**
     * @fileOverview 错误信息
     */
  define('lib/filepicker', [
    'base',
    'runtime/client',
    'lib/file'
  ], function (Base, RuntimeClent, File) {
    var $ = Base.$;
    function FilePicker(opts) {
      opts = this.options = $.extend({}, FilePicker.options, opts);
      opts.container = $(opts.id);
      if (!opts.container.length) {
        throw new Error('\u6309\u94ae\u6307\u5b9a\u9519\u8bef');
      }
      opts.innerHTML = opts.innerHTML || opts.label || opts.container.html() || '';
      opts.button = $(opts.button || document.createElement('div'));
      opts.button.html(opts.innerHTML);
      opts.container.html(opts.button);
      RuntimeClent.call(this, 'FilePicker', true);
    }
    FilePicker.options = {
      button: null,
      container: null,
      label: null,
      innerHTML: null,
      multiple: true,
      accept: null,
      name: 'file'
    };
    Base.inherits(RuntimeClent, {
      constructor: FilePicker,
      init: function () {
        var me = this, opts = me.options, button = opts.button;
        button.addClass('webuploader-pick');
        me.on('all', function (type) {
          var files;
          switch (type) {
          case 'mouseenter':
            button.addClass('webuploader-pick-hover');
            break;
          case 'mouseleave':
            button.removeClass('webuploader-pick-hover');
            break;
          case 'change':
            files = me.exec('getFiles');
            me.trigger('select', $.map(files, function (file) {
              file = new File(me.getRuid(), file);
              // 记录来源。
              file._refer = opts.container;
              return file;
            }), opts.container);
            break;
          }
        });
        me.connectRuntime(opts, function () {
          me.refresh();
          me.exec('init', opts);
          me.trigger('ready');
        });
        this._resizeHandler = Base.bindFn(this.refresh, this);
        $(window).on('resize', this._resizeHandler);
      },
      refresh: function () {
        var shimContainer = this.getRuntime().getContainer(), button = this.options.button, width = button.outerWidth ? button.outerWidth() : button.width(), height = button.outerHeight ? button.outerHeight() : button.height(), pos = button.offset();
        width && height && shimContainer.css({
          bottom: 'auto',
          right: 'auto',
          width: width + 'px',
          height: height + 'px'
        }).offset(pos);
      },
      enable: function () {
        var btn = this.options.button;
        btn.removeClass('webuploader-pick-disable');
        this.refresh();
      },
      disable: function () {
        var btn = this.options.button;
        this.getRuntime().getContainer().css({ top: '-99999px' });
        btn.addClass('webuploader-pick-disable');
      },
      destroy: function () {
        var btn = this.options.button;
        $(window).off('resize', this._resizeHandler);
        btn.removeClass('webuploader-pick-disable webuploader-pick-hover ' + 'webuploader-pick');
      }
    });
    return FilePicker;
  });
  /**
     * @fileOverview 文件选择相关
     */
  define('widgets/filepicker', [
    'base',
    'uploader',
    'lib/filepicker',
    'widgets/widget'
  ], function (Base, Uploader, FilePicker) {
    var $ = Base.$;
    $.extend(Uploader.options, {
      pick: null,
      accept: null
    });
    return Uploader.register({
      name: 'picker',
      init: function (opts) {
        this.pickers = [];
        return opts.pick && this.addBtn(opts.pick);
      },
      refresh: function () {
        $.each(this.pickers, function () {
          this.refresh();
        });
      },
      addBtn: function (pick) {
        var me = this, opts = me.options, accept = opts.accept, promises = [];
        if (!pick) {
          return;
        }
        $.isPlainObject(pick) || (pick = { id: pick });
        $(pick.id).each(function () {
          var options, picker, deferred;
          deferred = Base.Deferred();
          options = $.extend({}, pick, {
            accept: $.isPlainObject(accept) ? [accept] : accept,
            swf: opts.swf,
            runtimeOrder: opts.runtimeOrder,
            id: this
          });
          picker = new FilePicker(options);
          picker.once('ready', deferred.resolve);
          picker.on('select', function (files) {
            me.owner.request('add-file', [files]);
          });
          picker.init();
          me.pickers.push(picker);
          promises.push(deferred.promise());
        });
        return Base.when.apply(Base, promises);
      },
      disable: function () {
        $.each(this.pickers, function () {
          this.disable();
        });
      },
      enable: function () {
        $.each(this.pickers, function () {
          this.enable();
        });
      },
      destroy: function () {
        $.each(this.pickers, function () {
          this.destroy();
        });
        this.pickers = null;
      }
    });
  });
  /**
     * @fileOverview Image
     */
  define('lib/image', [
    'base',
    'runtime/client',
    'lib/blob'
  ], function (Base, RuntimeClient, Blob) {
    var $ = Base.$;
    // 构造器。
    function Image(opts) {
      this.options = $.extend({}, Image.options, opts);
      RuntimeClient.call(this, 'Image');
      this.on('load', function () {
        this._info = this.exec('info');
        this._meta = this.exec('meta');
      });
    }
    // 默认选项。
    Image.options = {
      quality: 90,
      crop: false,
      preserveHeaders: false,
      allowMagnify: false
    };
    // 继承RuntimeClient.
    Base.inherits(RuntimeClient, {
      constructor: Image,
      info: function (val) {
        // setter
        if (val) {
          this._info = val;
          return this;
        }
        // getter
        return this._info;
      },
      meta: function (val) {
        // setter
        if (val) {
          this._meta = val;
          return this;
        }
        // getter
        return this._meta;
      },
      loadFromBlob: function (blob) {
        var me = this, ruid = blob.getRuid();
        this.connectRuntime(ruid, function () {
          me.exec('init', me.options);
          me.exec('loadFromBlob', blob);
        });
      },
      resize: function () {
        var args = Base.slice(arguments);
        return this.exec.apply(this, ['resize'].concat(args));
      },
      crop: function () {
        var args = Base.slice(arguments);
        return this.exec.apply(this, ['crop'].concat(args));
      },
      getAsDataUrl: function (type) {
        return this.exec('getAsDataUrl', type);
      },
      getAsBlob: function (type) {
        var blob = this.exec('getAsBlob', type);
        return new Blob(this.getRuid(), blob);
      }
    });
    return Image;
  });
  /**
     * @fileOverview 图片操作, 负责预览图片和上传前压缩图片
     */
  define('widgets/image', [
    'base',
    'uploader',
    'lib/image',
    'widgets/widget'
  ], function (Base, Uploader, Image) {
    var $ = Base.$, throttle;
    // 根据要处理的文件大小来节流，一次不能处理太多，会卡。
    throttle = function (max) {
      var occupied = 0, waiting = [], tick = function () {
          var item;
          while (waiting.length && occupied < max) {
            item = waiting.shift();
            occupied += item[0];
            item[1]();
          }
        };
      return function (emiter, size, cb) {
        waiting.push([
          size,
          cb
        ]);
        emiter.once('destroy', function () {
          occupied -= size;
          setTimeout(tick, 1);
        });
        setTimeout(tick, 1);
      };
    }(5 * 1024 * 1024);
    $.extend(Uploader.options, {
      thumb: {
        width: 110,
        height: 110,
        quality: 70,
        allowMagnify: true,
        crop: true,
        preserveHeaders: false,
        type: 'image/jpeg'
      },
      compress: {
        width: 1600,
        height: 1600,
        quality: 90,
        allowMagnify: false,
        crop: false,
        preserveHeaders: true
      }
    });
    return Uploader.register({
      name: 'image',
      makeThumb: function (file, cb, width, height) {
        var opts, image;
        file = this.request('get-file', file);
        // 只预览图片格式。
        if (!file.type.match(/^image/)) {
          cb(true);
          return;
        }
        opts = $.extend({}, this.options.thumb);
        // 如果传入的是object.
        if ($.isPlainObject(width)) {
          opts = $.extend(opts, width);
          width = null;
        }
        width = width || opts.width;
        height = height || opts.height;
        image = new Image(opts);
        image.once('load', function () {
          file._info = file._info || image.info();
          file._meta = file._meta || image.meta();
          // 如果 width 的值介于 0 - 1
          // 说明设置的是百分比。
          if (width <= 1 && width > 0) {
            width = file._info.width * width;
          }
          // 同样的规则应用于 height
          if (height <= 1 && height > 0) {
            height = file._info.height * height;
          }
          image.resize(width, height);
        });
        // 当 resize 完后
        image.once('complete', function () {
          cb(false, image.getAsDataUrl(opts.type));
          image.destroy();
        });
        image.once('error', function (reason) {
          cb(reason || true);
          image.destroy();
        });
        throttle(image, file.source.size, function () {
          file._info && image.info(file._info);
          file._meta && image.meta(file._meta);
          image.loadFromBlob(file.source);
        });
      },
      beforeSendFile: function (file) {
        var opts = this.options.compress || this.options.resize, compressSize = opts && opts.compressSize || 0, noCompressIfLarger = opts && opts.noCompressIfLarger || false, image, deferred;
        file = this.request('get-file', file);
        // 只压缩 jpeg 图片格式。
        // gif 可能会丢失针
        // bmp png 基本上尺寸都不大，且压缩比比较小。
        if (!opts || !~'image/jpeg,image/jpg'.indexOf(file.type) || file.size < compressSize || file._compressed) {
          return;
        }
        opts = $.extend({}, opts);
        deferred = Base.Deferred();
        image = new Image(opts);
        deferred.always(function () {
          image.destroy();
          image = null;
        });
        image.once('error', deferred.reject);
        image.once('load', function () {
          var width = opts.width, height = opts.height;
          file._info = file._info || image.info();
          file._meta = file._meta || image.meta();
          // 如果 width 的值介于 0 - 1
          // 说明设置的是百分比。
          if (width <= 1 && width > 0) {
            width = file._info.width * width;
          }
          // 同样的规则应用于 height
          if (height <= 1 && height > 0) {
            height = file._info.height * height;
          }
          image.resize(width, height);
        });
        image.once('complete', function () {
          var blob, size;
          // 移动端 UC / qq 浏览器的无图模式下
          // ctx.getImageData 处理大图的时候会报 Exception
          // INDEX_SIZE_ERR: DOM Exception 1
          try {
            blob = image.getAsBlob(opts.type);
            size = file.size;
            // 如果压缩后，比原来还大则不用压缩后的。
            if (!noCompressIfLarger || blob.size < size) {
              // file.source.destroy && file.source.destroy();
              file.source = blob;
              file.size = blob.size;
              file.trigger('resize', blob.size, size);
            }
            // 标记，避免重复压缩。
            file._compressed = true;
            deferred.resolve();
          } catch (e) {
            // 出错了直接继续，让其上传原始图片
            deferred.resolve();
          }
        });
        file._info && image.info(file._info);
        file._meta && image.meta(file._meta);
        image.loadFromBlob(file.source);
        return deferred.promise();
      }
    });
  });
  /**
     * @fileOverview 文件属性封装
     */
  define('file', [
    'base',
    'mediator'
  ], function (Base, Mediator) {
    var $ = Base.$, idPrefix = 'WU_FILE_', idSuffix = 0, rExt = /\.([^.]+)$/, statusMap = {};
    function gid() {
      return idPrefix + idSuffix++;
    }
    /**
         * 文件类
         * @class File
         * @constructor 构造函数
         * @grammar new File( source ) => File
         * @param {Lib.File} source [lib.File](#Lib.File)实例, 此source对象是带有Runtime信息的。
         */
    function WUFile(source) {
      /**
             * 文件名，包括扩展名（后缀）
             * @property name
             * @type {string}
             */
      this.name = source.name || 'Untitled';
      /**
             * 文件体积（字节）
             * @property size
             * @type {uint}
             * @default 0
             */
      this.size = source.size || 0;
      /**
             * 文件MIMETYPE类型，与文件类型的对应关系请参考[http://t.cn/z8ZnFny](http://t.cn/z8ZnFny)
             * @property type
             * @type {string}
             * @default 'application/octet-stream'
             */
      this.type = source.type || 'application/octet-stream';
      /**
             * 文件最后修改日期
             * @property lastModifiedDate
             * @type {int}
             * @default 当前时间戳
             */
      this.lastModifiedDate = source.lastModifiedDate || new Date() * 1;
      /**
             * 文件ID，每个对象具有唯一ID，与文件名无关
             * @property id
             * @type {string}
             */
      this.id = gid();
      /**
             * 文件扩展名，通过文件名获取，例如test.png的扩展名为png
             * @property ext
             * @type {string}
             */
      this.ext = rExt.exec(this.name) ? RegExp.$1 : '';
      /**
             * 状态文字说明。在不同的status语境下有不同的用途。
             * @property statusText
             * @type {string}
             */
      this.statusText = '';
      // 存储文件状态，防止通过属性直接修改
      statusMap[this.id] = WUFile.Status.INITED;
      this.source = source;
      this.loaded = 0;
      this.on('error', function (msg) {
        this.setStatus(WUFile.Status.ERROR, msg);
      });
    }
    $.extend(WUFile.prototype, {
      setStatus: function (status, text) {
        var prevStatus = statusMap[this.id];
        typeof text !== 'undefined' && (this.statusText = text);
        if (status !== prevStatus) {
          statusMap[this.id] = status;
          /**
                     * 文件状态变化
                     * @event statuschange
                     */
          this.trigger('statuschange', status, prevStatus);
        }
      },
      getStatus: function () {
        return statusMap[this.id];
      },
      getSource: function () {
        return this.source;
      },
      destroy: function () {
        this.off();
        delete statusMap[this.id];
      }
    });
    Mediator.installTo(WUFile.prototype);
    /**
         * 文件状态值，具体包括以下几种类型：
         * * `inited` 初始状态
         * * `queued` 已经进入队列, 等待上传
         * * `progress` 上传中
         * * `complete` 上传完成。
         * * `error` 上传出错，可重试
         * * `interrupt` 上传中断，可续传。
         * * `invalid` 文件不合格，不能重试上传。会自动从队列中移除。
         * * `cancelled` 文件被移除。
         * @property {Object} Status
         * @namespace File
         * @class File
         * @static
         */
    WUFile.Status = {
      INITED: 'inited',
      QUEUED: 'queued',
      PROGRESS: 'progress',
      ERROR: 'error',
      COMPLETE: 'complete',
      CANCELLED: 'cancelled',
      INTERRUPT: 'interrupt',
      INVALID: 'invalid'
    };
    return WUFile;
  });
  /**
     * @fileOverview 文件队列
     */
  define('queue', [
    'base',
    'mediator',
    'file'
  ], function (Base, Mediator, WUFile) {
    var $ = Base.$, STATUS = WUFile.Status;
    /**
         * 文件队列, 用来存储各个状态中的文件。
         * @class Queue
         * @extends Mediator
         */
    function Queue() {
      /**
             * 统计文件数。
             * * `numOfQueue` 队列中的文件数。
             * * `numOfSuccess` 上传成功的文件数
             * * `numOfCancel` 被取消的文件数
             * * `numOfProgress` 正在上传中的文件数
             * * `numOfUploadFailed` 上传错误的文件数。
             * * `numOfInvalid` 无效的文件数。
             * * `numofDeleted` 被移除的文件数。
             * @property {Object} stats
             */
      this.stats = {
        numOfQueue: 0,
        numOfSuccess: 0,
        numOfCancel: 0,
        numOfProgress: 0,
        numOfUploadFailed: 0,
        numOfInvalid: 0,
        numofDeleted: 0,
        numofInterrupt: 0
      };
      // 上传队列，仅包括等待上传的文件
      this._queue = [];
      // 存储所有文件
      this._map = {};
    }
    $.extend(Queue.prototype, {
      append: function (file) {
        this._queue.push(file);
        this._fileAdded(file);
        return this;
      },
      prepend: function (file) {
        this._queue.unshift(file);
        this._fileAdded(file);
        return this;
      },
      getFile: function (fileId) {
        if (typeof fileId !== 'string') {
          return fileId;
        }
        return this._map[fileId];
      },
      fetch: function (status) {
        var len = this._queue.length, i, file;
        status = status || STATUS.QUEUED;
        for (i = 0; i < len; i++) {
          file = this._queue[i];
          if (status === file.getStatus()) {
            return file;
          }
        }
        return null;
      },
      sort: function (fn) {
        if (typeof fn === 'function') {
          this._queue.sort(fn);
        }
      },
      getFiles: function () {
        var sts = [].slice.call(arguments, 0), ret = [], i = 0, len = this._queue.length, file;
        for (; i < len; i++) {
          file = this._queue[i];
          if (sts.length && !~$.inArray(file.getStatus(), sts)) {
            continue;
          }
          ret.push(file);
        }
        return ret;
      },
      removeFile: function (file) {
        var me = this, existing = this._map[file.id];
        if (existing) {
          delete this._map[file.id];
          file.destroy();
          this.stats.numofDeleted++;
        }
      },
      _fileAdded: function (file) {
        var me = this, existing = this._map[file.id];
        if (!existing) {
          this._map[file.id] = file;
          file.on('statuschange', function (cur, pre) {
            me._onFileStatusChange(cur, pre);
          });
        }
      },
      _onFileStatusChange: function (curStatus, preStatus) {
        var stats = this.stats;
        switch (preStatus) {
        case STATUS.PROGRESS:
          stats.numOfProgress--;
          break;
        case STATUS.QUEUED:
          stats.numOfQueue--;
          break;
        case STATUS.ERROR:
          stats.numOfUploadFailed--;
          break;
        case STATUS.INVALID:
          stats.numOfInvalid--;
          break;
        case STATUS.INTERRUPT:
          stats.numofInterrupt--;
          break;
        }
        switch (curStatus) {
        case STATUS.QUEUED:
          stats.numOfQueue++;
          break;
        case STATUS.PROGRESS:
          stats.numOfProgress++;
          break;
        case STATUS.ERROR:
          stats.numOfUploadFailed++;
          break;
        case STATUS.COMPLETE:
          stats.numOfSuccess++;
          break;
        case STATUS.CANCELLED:
          stats.numOfCancel++;
          break;
        case STATUS.INVALID:
          stats.numOfInvalid++;
          break;
        case STATUS.INTERRUPT:
          stats.numofInterrupt++;
          break;
        }
      }
    });
    Mediator.installTo(Queue.prototype);
    return Queue;
  });
  /**
     * @fileOverview 队列
     */
  define('widgets/queue', [
    'base',
    'uploader',
    'queue',
    'file',
    'lib/file',
    'runtime/client',
    'widgets/widget'
  ], function (Base, Uploader, Queue, WUFile, File, RuntimeClient) {
    var $ = Base.$, rExt = /\.\w+$/, Status = WUFile.Status;
    return Uploader.register({
      name: 'queue',
      init: function (opts) {
        var me = this, deferred, len, i, item, arr, accept, runtime;
        if ($.isPlainObject(opts.accept)) {
          opts.accept = [opts.accept];
        }
        // accept中的中生成匹配正则。
        if (opts.accept) {
          arr = [];
          for (i = 0, len = opts.accept.length; i < len; i++) {
            item = opts.accept[i].extensions;
            item && arr.push(item);
          }
          if (arr.length) {
            accept = '\\.' + arr.join(',').replace(/,/g, '$|\\.').replace(/\*/g, '.*') + '$';
          }
          me.accept = new RegExp(accept, 'i');
        }
        me.queue = new Queue();
        me.stats = me.queue.stats;
        // 如果当前不是html5运行时，那就算了。
        // 不执行后续操作
        if (this.request('predict-runtime-type') !== 'html5') {
          return;
        }
        // 创建一个 html5 运行时的 placeholder
        // 以至于外部添加原生 File 对象的时候能正确包裹一下供 webuploader 使用。
        deferred = Base.Deferred();
        this.placeholder = runtime = new RuntimeClient('Placeholder');
        runtime.connectRuntime({ runtimeOrder: 'html5' }, function () {
          me._ruid = runtime.getRuid();
          deferred.resolve();
        });
        return deferred.promise();
      },
      _wrapFile: function (file) {
        if (!(file instanceof WUFile)) {
          if (!(file instanceof File)) {
            if (!this._ruid) {
              throw new Error('Can\'t add external files.');
            }
            file = new File(this._ruid, file);
          }
          file = new WUFile(file);
        }
        return file;
      },
      acceptFile: function (file) {
        var invalid = !file || !file.size || this.accept && rExt.exec(file.name) && !this.accept.test(file.name);
        return !invalid;
      },
      _addFile: function (file) {
        var me = this;
        file = me._wrapFile(file);
        // 不过类型判断允许不允许，先派送 `beforeFileQueued`
        if (!me.owner.trigger('beforeFileQueued', file)) {
          return;
        }
        // 类型不匹配，则派送错误事件，并返回。
        if (!me.acceptFile(file)) {
          me.owner.trigger('error', 'Q_TYPE_DENIED', file);
          return;
        }
        me.queue.append(file);
        me.owner.trigger('fileQueued', file);
        return file;
      },
      getFile: function (fileId) {
        return this.queue.getFile(fileId);
      },
      addFile: function (files) {
        var me = this;
        if (!files.length) {
          files = [files];
        }
        files = $.map(files, function (file) {
          return me._addFile(file);
        });
        me.owner.trigger('filesQueued', files);
        if (me.options.auto) {
          setTimeout(function () {
            me.request('start-upload');
          }, 20);
        }
      },
      getStats: function () {
        return this.stats;
      },
      removeFile: function (file, remove) {
        var me = this;
        file = file.id ? file : me.queue.getFile(file);
        this.request('cancel-file', file);
        if (remove) {
          this.queue.removeFile(file);
        }
      },
      getFiles: function () {
        return this.queue.getFiles.apply(this.queue, arguments);
      },
      fetchFile: function () {
        return this.queue.fetch.apply(this.queue, arguments);
      },
      retry: function (file, noForceStart) {
        var me = this, files, i, len;
        if (file) {
          file = file.id ? file : me.queue.getFile(file);
          file.setStatus(Status.QUEUED);
          noForceStart || me.request('start-upload');
          return;
        }
        files = me.queue.getFiles(Status.ERROR);
        i = 0;
        len = files.length;
        for (; i < len; i++) {
          file = files[i];
          file.setStatus(Status.QUEUED);
        }
        me.request('start-upload');
      },
      sortFiles: function () {
        return this.queue.sort.apply(this.queue, arguments);
      },
      reset: function () {
        this.owner.trigger('reset');
        this.queue = new Queue();
        this.stats = this.queue.stats;
      },
      destroy: function () {
        this.reset();
        this.placeholder && this.placeholder.destroy();
      }
    });
  });
  /**
     * @fileOverview 添加获取Runtime相关信息的方法。
     */
  define('widgets/runtime', [
    'uploader',
    'runtime/runtime',
    'widgets/widget'
  ], function (Uploader, Runtime) {
    Uploader.support = function () {
      return Runtime.hasRuntime.apply(Runtime, arguments);
    };
    /**
         * @property {Object} [runtimeOrder=html5,flash]
         * @namespace options
         * @for Uploader
         * @description 指定运行时启动顺序。默认会想尝试 html5 是否支持，如果支持则使用 html5, 否则则使用 flash.
         *
         * 可以将此值设置成 `flash`，来强制使用 flash 运行时。
         */
    return Uploader.register({
      name: 'runtime',
      init: function () {
        if (!this.predictRuntimeType()) {
          throw Error('Runtime Error');
        }
      },
      predictRuntimeType: function () {
        var orders = this.options.runtimeOrder || Runtime.orders, type = this.type, i, len;
        if (!type) {
          orders = orders.split(/\s*,\s*/g);
          for (i = 0, len = orders.length; i < len; i++) {
            if (Runtime.hasRuntime(orders[i])) {
              this.type = type = orders[i];
              break;
            }
          }
        }
        return type;
      }
    });
  });
  /**
     * @fileOverview Transport
     */
  define('lib/transport', [
    'base',
    'runtime/client',
    'mediator'
  ], function (Base, RuntimeClient, Mediator) {
    var $ = Base.$;
    function Transport(opts) {
      var me = this;
      opts = me.options = $.extend(true, {}, Transport.options, opts || {});
      RuntimeClient.call(this, 'Transport');
      this._blob = null;
      this._formData = opts.formData || {};
      this._headers = opts.headers || {};
      this.on('progress', this._timeout);
      this.on('load error', function () {
        me.trigger('progress', 1);
        clearTimeout(me._timer);
      });
    }
    Transport.options = {
      server: '',
      method: 'POST',
      withCredentials: false,
      fileVal: 'file',
      timeout: 2 * 60 * 1000,
      formData: {},
      headers: {},
      sendAsBinary: false
    };
    $.extend(Transport.prototype, {
      appendBlob: function (key, blob, filename) {
        var me = this, opts = me.options;
        if (me.getRuid()) {
          me.disconnectRuntime();
        }
        // 连接到blob归属的同一个runtime.
        me.connectRuntime(blob.ruid, function () {
          me.exec('init');
        });
        me._blob = blob;
        opts.fileVal = key || opts.fileVal;
        opts.filename = filename || opts.filename;
      },
      append: function (key, value) {
        if (typeof key === 'object') {
          $.extend(this._formData, key);
        } else {
          this._formData[key] = value;
        }
      },
      setRequestHeader: function (key, value) {
        if (typeof key === 'object') {
          $.extend(this._headers, key);
        } else {
          this._headers[key] = value;
        }
      },
      send: function (method) {
        this.exec('send', method);
        this._timeout();
      },
      abort: function () {
        clearTimeout(this._timer);
        return this.exec('abort');
      },
      destroy: function () {
        this.trigger('destroy');
        this.off();
        this.exec('destroy');
        this.disconnectRuntime();
      },
      getResponse: function () {
        return this.exec('getResponse');
      },
      getResponseAsJson: function () {
        return this.exec('getResponseAsJson');
      },
      getStatus: function () {
        return this.exec('getStatus');
      },
      _timeout: function () {
        var me = this, duration = me.options.timeout;
        if (!duration) {
          return;
        }
        clearTimeout(me._timer);
        me._timer = setTimeout(function () {
          me.abort();
          me.trigger('error', 'timeout');
        }, duration);
      }
    });
    // 让Transport具备事件功能。
    Mediator.installTo(Transport.prototype);
    return Transport;
  });
  /**
     * @fileOverview 负责文件上传相关。
     */
  define('widgets/upload', [
    'base',
    'uploader',
    'file',
    'lib/transport',
    'widgets/widget'
  ], function (Base, Uploader, WUFile, Transport) {
    var $ = Base.$, isPromise = Base.isPromise, Status = WUFile.Status;
    // 添加默认配置项
    $.extend(Uploader.options, {
      prepareNextFile: false,
      chunked: false,
      chunkSize: 5 * 1024 * 1024,
      chunkRetry: 2,
      threads: 3,
      formData: {}
    });
    // 负责将文件切片。
    function CuteFile(file, chunkSize) {
      var pending = [], blob = file.source, total = blob.size, chunks = chunkSize ? Math.ceil(total / chunkSize) : 1, start = 0, index = 0, len, api;
      api = {
        file: file,
        has: function () {
          return !!pending.length;
        },
        shift: function () {
          return pending.shift();
        },
        unshift: function (block) {
          pending.unshift(block);
        }
      };
      while (index < chunks) {
        len = Math.min(chunkSize, total - start);
        pending.push({
          file: file,
          start: start,
          end: chunkSize ? start + len : total,
          total: total,
          chunks: chunks,
          chunk: index++,
          cuted: api
        });
        start += len;
      }
      file.blocks = pending.concat();
      file.remaning = pending.length;
      return api;
    }
    Uploader.register({
      name: 'upload',
      init: function () {
        var owner = this.owner, me = this;
        this.runing = false;
        this.progress = false;
        owner.on('startUpload', function () {
          me.progress = true;
        }).on('uploadFinished', function () {
          me.progress = false;
        });
        // 记录当前正在传的数据，跟threads相关
        this.pool = [];
        // 缓存分好片的文件。
        this.stack = [];
        // 缓存即将上传的文件。
        this.pending = [];
        // 跟踪还有多少分片在上传中但是没有完成上传。
        this.remaning = 0;
        this.__tick = Base.bindFn(this._tick, this);
        owner.on('uploadComplete', function (file) {
          // 把其他块取消了。
          file.blocks && $.each(file.blocks, function (_, v) {
            v.transport && (v.transport.abort(), v.transport.destroy());
            delete v.transport;
          });
          delete file.blocks;
          delete file.remaning;
        });
      },
      reset: function () {
        this.request('stop-upload', true);
        this.runing = false;
        this.pool = [];
        this.stack = [];
        this.pending = [];
        this.remaning = 0;
        this._trigged = false;
        this._promise = null;
      },
      startUpload: function (file) {
        var me = this;
        // 移出invalid的文件
        $.each(me.request('get-files', Status.INVALID), function () {
          me.request('remove-file', this);
        });
        // 如果指定了开始某个文件，则只开始指定文件。
        if (file) {
          file = file.id ? file : me.request('get-file', file);
          if (file.getStatus() === Status.INTERRUPT) {
            $.each(me.pool, function (_, v) {
              // 之前暂停过。
              if (v.file !== file) {
                return;
              }
              v.transport && v.transport.send();
            });
            file.setStatus(Status.QUEUED);
          } else if (file.getStatus() === Status.PROGRESS) {
            return;
          } else {
            file.setStatus(Status.QUEUED);
          }
        } else {
          $.each(me.request('get-files', [Status.INITED]), function () {
            this.setStatus(Status.QUEUED);
          });
        }
        if (me.runing) {
          return;
        }
        me.runing = true;
        // 如果有暂停的，则续传
        $.each(me.pool, function (_, v) {
          var file = v.file;
          if (file.getStatus() === Status.INTERRUPT) {
            file.setStatus(Status.PROGRESS);
            me._trigged = false;
            v.transport && v.transport.send();
          }
        });
        file || $.each(me.request('get-files', Status.INTERRUPT), function () {
          this.setStatus(Status.PROGRESS);
        });
        me._trigged = false;
        Base.nextTick(me.__tick);
        me.owner.trigger('startUpload');
      },
      stopUpload: function (file, interrupt) {
        var me = this;
        if (file === true) {
          interrupt = file;
          file = null;
        }
        if (me.runing === false) {
          return;
        }
        // 如果只是暂停某个文件。
        if (file) {
          file = file.id ? file : me.request('get-file', file);
          if (file.getStatus() !== Status.PROGRESS && file.getStatus() !== Status.QUEUED) {
            return;
          }
          file.setStatus(Status.INTERRUPT);
          $.each(me.pool, function (_, v) {
            // 只 abort 指定的文件。
            if (v.file !== file) {
              return;
            }
            v.transport && v.transport.abort();
            me._putback(v);
            me._popBlock(v);
          });
          return Base.nextTick(me.__tick);
        }
        me.runing = false;
        if (this._promise && this._promise.file) {
          this._promise.file.setStatus(Status.INTERRUPT);
        }
        interrupt && $.each(me.pool, function (_, v) {
          v.transport && v.transport.abort();
          v.file.setStatus(Status.INTERRUPT);
        });
        me.owner.trigger('stopUpload');
      },
      cancelFile: function (file) {
        file = file.id ? file : this.request('get-file', file);
        // 如果正在上传。
        file.blocks && $.each(file.blocks, function (_, v) {
          var _tr = v.transport;
          if (_tr) {
            _tr.abort();
            _tr.destroy();
            delete v.transport;
          }
        });
        file.setStatus(Status.CANCELLED);
        this.owner.trigger('fileDequeued', file);
      },
      isInProgress: function () {
        return !!this.progress;
      },
      _getStats: function () {
        return this.request('get-stats');
      },
      skipFile: function (file, status) {
        file = file.id ? file : this.request('get-file', file);
        file.setStatus(status || Status.COMPLETE);
        file.skipped = true;
        // 如果正在上传。
        file.blocks && $.each(file.blocks, function (_, v) {
          var _tr = v.transport;
          if (_tr) {
            _tr.abort();
            _tr.destroy();
            delete v.transport;
          }
        });
        this.owner.trigger('uploadSkip', file);
      },
      _tick: function () {
        var me = this, opts = me.options, fn, val;
        // 上一个promise还没有结束，则等待完成后再执行。
        if (me._promise) {
          return me._promise.always(me.__tick);
        }
        // 还有位置，且还有文件要处理的话。
        if (me.pool.length < opts.threads && (val = me._nextBlock())) {
          me._trigged = false;
          fn = function (val) {
            me._promise = null;
            // 有可能是reject过来的，所以要检测val的类型。
            val && val.file && me._startSend(val);
            Base.nextTick(me.__tick);
          };
          me._promise = isPromise(val) ? val.always(fn) : fn(val);  // 没有要上传的了，且没有正在传输的了。
        } else if (!me.remaning && !me._getStats().numOfQueue && !me._getStats().numofInterrupt) {
          me.runing = false;
          me._trigged || Base.nextTick(function () {
            me.owner.trigger('uploadFinished');
          });
          me._trigged = true;
        }
      },
      _putback: function (block) {
        var idx;
        block.cuted.unshift(block);
        idx = this.stack.indexOf(block.cuted);
        if (!~idx) {
          this.stack.unshift(block.cuted);
        }
      },
      _getStack: function () {
        var i = 0, act;
        while (act = this.stack[i++]) {
          if (act.has() && act.file.getStatus() === Status.PROGRESS) {
            return act;
          } else if (!act.has() || act.file.getStatus() !== Status.PROGRESS && act.file.getStatus() !== Status.INTERRUPT) {
            // 把已经处理完了的，或者，状态为非 progress（上传中）、
            // interupt（暂停中） 的移除。
            this.stack.splice(--i, 1);
          }
        }
        return null;
      },
      _nextBlock: function () {
        var me = this, opts = me.options, act, next, done, preparing;
        // 如果当前文件还有没有需要传输的，则直接返回剩下的。
        if (act = this._getStack()) {
          // 是否提前准备下一个文件
          if (opts.prepareNextFile && !me.pending.length) {
            me._prepareNextFile();
          }
          return act.shift();  // 否则，如果正在运行，则准备下一个文件，并等待完成后返回下个分片。
        } else if (me.runing) {
          // 如果缓存中有，则直接在缓存中取，没有则去queue中取。
          if (!me.pending.length && me._getStats().numOfQueue) {
            me._prepareNextFile();
          }
          next = me.pending.shift();
          done = function (file) {
            if (!file) {
              return null;
            }
            act = CuteFile(file, opts.chunked ? opts.chunkSize : 0);
            me.stack.push(act);
            return act.shift();
          };
          // 文件可能还在prepare中，也有可能已经完全准备好了。
          if (isPromise(next)) {
            preparing = next.file;
            next = next[next.pipe ? 'pipe' : 'then'](done);
            next.file = preparing;
            return next;
          }
          return done(next);
        }
      },
      _prepareNextFile: function () {
        var me = this, file = me.request('fetch-file'), pending = me.pending, promise;
        if (file) {
          promise = me.request('before-send-file', file, function () {
            // 有可能文件被skip掉了。文件被skip掉后，状态坑定不是Queued.
            if (file.getStatus() === Status.PROGRESS || file.getStatus() === Status.INTERRUPT) {
              return file;
            }
            return me._finishFile(file);
          });
          me.owner.trigger('uploadStart', file);
          file.setStatus(Status.PROGRESS);
          promise.file = file;
          // 如果还在pending中，则替换成文件本身。
          promise.done(function () {
            var idx = $.inArray(promise, pending);
            ~idx && pending.splice(idx, 1, file);
          });
          // befeore-send-file的钩子就有错误发生。
          promise.fail(function (reason) {
            file.setStatus(Status.ERROR, reason);
            me.owner.trigger('uploadError', file, reason);
            me.owner.trigger('uploadComplete', file);
          });
          pending.push(promise);
        }
      },
      _popBlock: function (block) {
        var idx = $.inArray(block, this.pool);
        this.pool.splice(idx, 1);
        block.file.remaning--;
        this.remaning--;
      },
      _startSend: function (block) {
        var me = this, file = block.file, promise;
        // 有可能在 before-send-file 的 promise 期间改变了文件状态。
        // 如：暂停，取消
        // 我们不能中断 promise, 但是可以在 promise 完后，不做上传操作。
        if (file.getStatus() !== Status.PROGRESS) {
          // 如果是中断，则还需要放回去。
          if (file.getStatus() === Status.INTERRUPT) {
            me._putback(block);
          }
          return;
        }
        me.pool.push(block);
        me.remaning++;
        // 如果没有分片，则直接使用原始的。
        // 不会丢失content-type信息。
        block.blob = block.chunks === 1 ? file.source : file.source.slice(block.start, block.end);
        // hook, 每个分片发送之前可能要做些异步的事情。
        promise = me.request('before-send', block, function () {
          // 有可能文件已经上传出错了，所以不需要再传输了。
          if (file.getStatus() === Status.PROGRESS) {
            me._doSend(block);
          } else {
            me._popBlock(block);
            Base.nextTick(me.__tick);
          }
        });
        // 如果为fail了，则跳过此分片。
        promise.fail(function () {
          if (file.remaning === 1) {
            me._finishFile(file).always(function () {
              block.percentage = 1;
              me._popBlock(block);
              me.owner.trigger('uploadComplete', file);
              Base.nextTick(me.__tick);
            });
          } else {
            block.percentage = 1;
            me.updateFileProgress(file);
            me._popBlock(block);
            Base.nextTick(me.__tick);
          }
        });
      },
      _doSend: function (block) {
        var me = this, owner = me.owner, opts = me.options, file = block.file, tr = new Transport(opts), data = $.extend({}, opts.formData), headers = $.extend({}, opts.headers), requestAccept, ret;
        block.transport = tr;
        tr.on('destroy', function () {
          delete block.transport;
          me._popBlock(block);
          Base.nextTick(me.__tick);
        });
        // 广播上传进度。以文件为单位。
        tr.on('progress', function (percentage) {
          block.percentage = percentage;
          me.updateFileProgress(file);
        });
        // 用来询问，是否返回的结果是有错误的。
        requestAccept = function (reject) {
          var fn;
          ret = tr.getResponseAsJson() || {};
          ret._raw = tr.getResponse();
          fn = function (value) {
            reject = value;
          };
          // 服务端响应了，不代表成功了，询问是否响应正确。
          if (!owner.trigger('uploadAccept', block, ret, fn)) {
            reject = reject || 'server';
          }
          return reject;
        };
        // 尝试重试，然后广播文件上传出错。
        tr.on('error', function (type, flag) {
          block.retried = block.retried || 0;
          // 自动重试
          if (block.chunks > 1 && ~'http,abort'.indexOf(type) && block.retried < opts.chunkRetry) {
            block.retried++;
            tr.send();
          } else {
            // http status 500 ~ 600
            if (!flag && type === 'server') {
              type = requestAccept(type);
            }
            file.setStatus(Status.ERROR, type);
            owner.trigger('uploadError', file, type);
            owner.trigger('uploadComplete', file);
          }
        });
        // 上传成功
        tr.on('load', function () {
          var reason;
          // 如果非预期，转向上传出错。
          if (reason = requestAccept()) {
            tr.trigger('error', reason, true);
            return;
          }
          // 全部上传完成。
          if (file.remaning === 1) {
            me._finishFile(file, ret);
          } else {
            tr.destroy();
          }
        });
        // 配置默认的上传字段。
        data = $.extend(data, {
          id: file.id,
          name: file.name,
          type: file.type,
          lastModifiedDate: file.lastModifiedDate,
          size: file.size
        });
        block.chunks > 1 && $.extend(data, {
          chunks: block.chunks,
          chunk: block.chunk
        });
        // 在发送之间可以添加字段什么的。。。
        // 如果默认的字段不够使用，可以通过监听此事件来扩展
        owner.trigger('uploadBeforeSend', block, data, headers);
        // 开始发送。
        tr.appendBlob(opts.fileVal, block.blob, file.name);
        tr.append(data);
        tr.setRequestHeader(headers);
        tr.send();
      },
      _finishFile: function (file, ret, hds) {
        var owner = this.owner;
        return owner.request('after-send-file', arguments, function () {
          file.setStatus(Status.COMPLETE);
          owner.trigger('uploadSuccess', file, ret, hds);
        }).fail(function (reason) {
          // 如果外部已经标记为invalid什么的，不再改状态。
          if (file.getStatus() === Status.PROGRESS) {
            file.setStatus(Status.ERROR, reason);
          }
          owner.trigger('uploadError', file, reason);
        }).always(function () {
          owner.trigger('uploadComplete', file);
        });
      },
      updateFileProgress: function (file) {
        var totalPercent = 0, uploaded = 0;
        if (!file.blocks) {
          return;
        }
        $.each(file.blocks, function (_, v) {
          uploaded += (v.percentage || 0) * (v.end - v.start);
        });
        totalPercent = uploaded / file.size;
        this.owner.trigger('uploadProgress', file, totalPercent || 0);
      }
    });
  });
  /**
     * @fileOverview 各种验证，包括文件总大小是否超出、单文件是否超出和文件是否重复。
     */
  define('widgets/validator', [
    'base',
    'uploader',
    'file',
    'widgets/widget'
  ], function (Base, Uploader, WUFile) {
    var $ = Base.$, validators = {}, api;
    /**
         * @event error
         * @param {String} type 错误类型。
         * @description 当validate不通过时，会以派送错误事件的形式通知调用者。通过`upload.on('error', handler)`可以捕获到此类错误，目前有以下错误会在特定的情况下派送错来。
         *
         * * `Q_EXCEED_NUM_LIMIT` 在设置了`fileNumLimit`且尝试给`uploader`添加的文件数量超出这个值时派送。
         * * `Q_EXCEED_SIZE_LIMIT` 在设置了`Q_EXCEED_SIZE_LIMIT`且尝试给`uploader`添加的文件总大小超出这个值时派送。
         * * `Q_TYPE_DENIED` 当文件类型不满足时触发。。
         * @for  Uploader
         */
    // 暴露给外面的api
    api = {
      addValidator: function (type, cb) {
        validators[type] = cb;
      },
      removeValidator: function (type) {
        delete validators[type];
      }
    };
    // 在Uploader初始化的时候启动Validators的初始化
    Uploader.register({
      name: 'validator',
      init: function () {
        var me = this;
        Base.nextTick(function () {
          $.each(validators, function () {
            this.call(me.owner);
          });
        });
      }
    });
    /**
         * @property {int} [fileNumLimit=undefined]
         * @namespace options
         * @for Uploader
         * @description 验证文件总数量, 超出则不允许加入队列。
         */
    api.addValidator('fileNumLimit', function () {
      var uploader = this, opts = uploader.options, count = 0, max = parseInt(opts.fileNumLimit, 10), flag = true;
      if (!max) {
        return;
      }
      uploader.on('beforeFileQueued', function (file) {
        if (count >= max && flag) {
          flag = false;
          this.trigger('error', 'Q_EXCEED_NUM_LIMIT', max, file);
          setTimeout(function () {
            flag = true;
          }, 1);
        }
        return count >= max ? false : true;
      });
      uploader.on('fileQueued', function () {
        count++;
      });
      uploader.on('fileDequeued', function () {
        count--;
      });
      uploader.on('reset', function () {
        count = 0;
      });
    });
    /**
         * @property {int} [fileSizeLimit=undefined]
         * @namespace options
         * @for Uploader
         * @description 验证文件总大小是否超出限制, 超出则不允许加入队列。
         */
    api.addValidator('fileSizeLimit', function () {
      var uploader = this, opts = uploader.options, count = 0, max = parseInt(opts.fileSizeLimit, 10), flag = true;
      if (!max) {
        return;
      }
      uploader.on('beforeFileQueued', function (file) {
        var invalid = count + file.size > max;
        if (invalid && flag) {
          flag = false;
          this.trigger('error', 'Q_EXCEED_SIZE_LIMIT', max, file);
          setTimeout(function () {
            flag = true;
          }, 1);
        }
        return invalid ? false : true;
      });
      uploader.on('fileQueued', function (file) {
        count += file.size;
      });
      uploader.on('fileDequeued', function (file) {
        count -= file.size;
      });
      uploader.on('reset', function () {
        count = 0;
      });
    });
    /**
         * @property {int} [fileSingleSizeLimit=undefined]
         * @namespace options
         * @for Uploader
         * @description 验证单个文件大小是否超出限制, 超出则不允许加入队列。
         */
    api.addValidator('fileSingleSizeLimit', function () {
      var uploader = this, opts = uploader.options, max = opts.fileSingleSizeLimit;
      if (!max) {
        return;
      }
      uploader.on('beforeFileQueued', function (file) {
        if (file.size > max) {
          file.setStatus(WUFile.Status.INVALID, 'exceed_size');
          this.trigger('error', 'F_EXCEED_SIZE', max, file);
          return false;
        }
      });
    });
    /**
         * @property {Boolean} [duplicate=undefined]
         * @namespace options
         * @for Uploader
         * @description 去重， 根据文件名字、文件大小和最后修改时间来生成hash Key.
         */
    api.addValidator('duplicate', function () {
      var uploader = this, opts = uploader.options, mapping = {};
      if (opts.duplicate) {
        return;
      }
      function hashString(str) {
        var hash = 0, i = 0, len = str.length, _char;
        for (; i < len; i++) {
          _char = str.charCodeAt(i);
          hash = _char + (hash << 6) + (hash << 16) - hash;
        }
        return hash;
      }
      uploader.on('beforeFileQueued', function (file) {
        var hash = file.__hash || (file.__hash = hashString(file.name + file.size + file.lastModifiedDate));
        // 已经重复了
        if (mapping[hash]) {
          this.trigger('error', 'F_DUPLICATE', file);
          return false;
        }
      });
      uploader.on('fileQueued', function (file) {
        var hash = file.__hash;
        hash && (mapping[hash] = true);
      });
      uploader.on('fileDequeued', function (file) {
        var hash = file.__hash;
        hash && delete mapping[hash];
      });
      uploader.on('reset', function () {
        mapping = {};
      });
    });
    return api;
  });
  /**
     * @fileOverview Md5
     */
  define('lib/md5', [
    'runtime/client',
    'mediator'
  ], function (RuntimeClient, Mediator) {
    function Md5() {
      RuntimeClient.call(this, 'Md5');
    }
    // 让 Md5 具备事件功能。
    Mediator.installTo(Md5.prototype);
    Md5.prototype.loadFromBlob = function (blob) {
      var me = this;
      if (me.getRuid()) {
        me.disconnectRuntime();
      }
      // 连接到blob归属的同一个runtime.
      me.connectRuntime(blob.ruid, function () {
        me.exec('init');
        me.exec('loadFromBlob', blob);
      });
    };
    Md5.prototype.getResult = function () {
      return this.exec('getResult');
    };
    return Md5;
  });
  /**
     * @fileOverview 图片操作, 负责预览图片和上传前压缩图片
     */
  define('widgets/md5', [
    'base',
    'uploader',
    'lib/md5',
    'lib/blob',
    'widgets/widget'
  ], function (Base, Uploader, Md5, Blob) {
    return Uploader.register({
      name: 'md5',
      md5File: function (file, start, end) {
        var md5 = new Md5(), deferred = Base.Deferred(), blob = file instanceof Blob ? file : this.request('get-file', file).source;
        md5.on('progress load', function (e) {
          e = e || {};
          deferred.notify(e.total ? e.loaded / e.total : 1);
        });
        md5.on('complete', function () {
          deferred.resolve(md5.getResult());
        });
        md5.on('error', function (reason) {
          deferred.reject(reason);
        });
        if (arguments.length > 1) {
          start = start || 0;
          end = end || 0;
          start < 0 && (start = blob.size + start);
          end < 0 && (end = blob.size + end);
          end = Math.min(end, blob.size);
          blob = blob.slice(start, end);
        }
        md5.loadFromBlob(blob);
        return deferred.promise();
      }
    });
  });
  /**
     * @fileOverview Runtime管理器，负责Runtime的选择, 连接
     */
  define('runtime/compbase', [], function () {
    function CompBase(owner, runtime) {
      this.owner = owner;
      this.options = owner.options;
      this.getRuntime = function () {
        return runtime;
      };
      this.getRuid = function () {
        return runtime.uid;
      };
      this.trigger = function () {
        return owner.trigger.apply(owner, arguments);
      };
    }
    return CompBase;
  });
  /**
     * @fileOverview Html5Runtime
     */
  define('runtime/html5/runtime', [
    'base',
    'runtime/runtime',
    'runtime/compbase'
  ], function (Base, Runtime, CompBase) {
    var type = 'html5', components = {};
    function Html5Runtime() {
      var pool = {}, me = this, destroy = this.destroy;
      Runtime.apply(me, arguments);
      me.type = type;
      // 这个方法的调用者，实际上是RuntimeClient
      me.exec = function (comp, fn) {
        var client = this, uid = client.uid, args = Base.slice(arguments, 2), instance;
        if (components[comp]) {
          instance = pool[uid] = pool[uid] || new components[comp](client, me);
          if (instance[fn]) {
            return instance[fn].apply(instance, args);
          }
        }
      };
      me.destroy = function () {
        // @todo 删除池子中的所有实例
        return destroy && destroy.apply(this, arguments);
      };
    }
    Base.inherits(Runtime, {
      constructor: Html5Runtime,
      init: function () {
        var me = this;
        setTimeout(function () {
          me.trigger('ready');
        }, 1);
      }
    });
    // 注册Components
    Html5Runtime.register = function (name, component) {
      var klass = components[name] = Base.inherits(CompBase, component);
      return klass;
    };
    // 注册html5运行时。
    // 只有在支持的前提下注册。
    if (window.Blob && window.FileReader && window.DataView) {
      Runtime.addRuntime(type, Html5Runtime);
    }
    return Html5Runtime;
  });
  /**
     * @fileOverview Blob Html实现
     */
  define('runtime/html5/blob', [
    'runtime/html5/runtime',
    'lib/blob'
  ], function (Html5Runtime, Blob) {
    return Html5Runtime.register('Blob', {
      slice: function (start, end) {
        var blob = this.owner.source, slice = blob.slice || blob.webkitSlice || blob.mozSlice;
        blob = slice.call(blob, start, end);
        return new Blob(this.getRuid(), blob);
      }
    });
  });
  /**
     * @fileOverview FilePaste
     */
  define('runtime/html5/dnd', [
    'base',
    'runtime/html5/runtime',
    'lib/file'
  ], function (Base, Html5Runtime, File) {
    var $ = Base.$, prefix = 'webuploader-dnd-';
    return Html5Runtime.register('DragAndDrop', {
      init: function () {
        var elem = this.elem = this.options.container;
        this.dragEnterHandler = Base.bindFn(this._dragEnterHandler, this);
        this.dragOverHandler = Base.bindFn(this._dragOverHandler, this);
        this.dragLeaveHandler = Base.bindFn(this._dragLeaveHandler, this);
        this.dropHandler = Base.bindFn(this._dropHandler, this);
        this.dndOver = false;
        elem.on('dragenter', this.dragEnterHandler);
        elem.on('dragover', this.dragOverHandler);
        elem.on('dragleave', this.dragLeaveHandler);
        elem.on('drop', this.dropHandler);
        if (this.options.disableGlobalDnd) {
          $(document).on('dragover', this.dragOverHandler);
          $(document).on('drop', this.dropHandler);
        }
      },
      _dragEnterHandler: function (e) {
        var me = this, denied = me._denied || false, items;
        e = e.originalEvent || e;
        if (!me.dndOver) {
          me.dndOver = true;
          // 注意只有 chrome 支持。
          items = e.dataTransfer.items;
          if (items && items.length) {
            me._denied = denied = !me.trigger('accept', items);
          }
          me.elem.addClass(prefix + 'over');
          me.elem[denied ? 'addClass' : 'removeClass'](prefix + 'denied');
        }
        e.dataTransfer.dropEffect = denied ? 'none' : 'copy';
        return false;
      },
      _dragOverHandler: function (e) {
        // 只处理框内的。
        var parentElem = this.elem.parent().get(0);
        if (parentElem && !$.contains(parentElem, e.currentTarget)) {
          return false;
        }
        clearTimeout(this._leaveTimer);
        this._dragEnterHandler.call(this, e);
        return false;
      },
      _dragLeaveHandler: function () {
        var me = this, handler;
        handler = function () {
          me.dndOver = false;
          me.elem.removeClass(prefix + 'over ' + prefix + 'denied');
        };
        clearTimeout(me._leaveTimer);
        me._leaveTimer = setTimeout(handler, 100);
        return false;
      },
      _dropHandler: function (e) {
        var me = this, ruid = me.getRuid(), parentElem = me.elem.parent().get(0), dataTransfer, data;
        // 只处理框内的。
        if (parentElem && !$.contains(parentElem, e.currentTarget)) {
          return false;
        }
        e = e.originalEvent || e;
        dataTransfer = e.dataTransfer;
        // 如果是页面内拖拽，还不能处理，不阻止事件。
        // 此处 ie11 下会报参数错误，
        try {
          data = dataTransfer.getData('text/html');
        } catch (err) {
        }
        if (data) {
          return;
        }
        me._getTansferFiles(dataTransfer, function (results) {
          me.trigger('drop', $.map(results, function (file) {
            return new File(ruid, file);
          }));
        });
        me.dndOver = false;
        me.elem.removeClass(prefix + 'over');
        return false;
      },
      _getTansferFiles: function (dataTransfer, callback) {
        var results = [], promises = [], items, files, file, item, i, len, canAccessFolder;
        items = dataTransfer.items;
        files = dataTransfer.files;
        canAccessFolder = !!(items && items[0].webkitGetAsEntry);
        for (i = 0, len = files.length; i < len; i++) {
          file = files[i];
          item = items && items[i];
          if (canAccessFolder && item.webkitGetAsEntry().isDirectory) {
            promises.push(this._traverseDirectoryTree(item.webkitGetAsEntry(), results));
          } else {
            results.push(file);
          }
        }
        Base.when.apply(Base, promises).done(function () {
          if (!results.length) {
            return;
          }
          callback(results);
        });
      },
      _traverseDirectoryTree: function (entry, results) {
        var deferred = Base.Deferred(), me = this;
        if (entry.isFile) {
          entry.file(function (file) {
            results.push(file);
            deferred.resolve();
          });
        } else if (entry.isDirectory) {
          entry.createReader().readEntries(function (entries) {
            var len = entries.length, promises = [], arr = [],
              // 为了保证顺序。
              i;
            for (i = 0; i < len; i++) {
              promises.push(me._traverseDirectoryTree(entries[i], arr));
            }
            Base.when.apply(Base, promises).then(function () {
              results.push.apply(results, arr);
              deferred.resolve();
            }, deferred.reject);
          });
        }
        return deferred.promise();
      },
      destroy: function () {
        var elem = this.elem;
        // 还没 init 就调用 destroy
        if (!elem) {
          return;
        }
        elem.off('dragenter', this.dragEnterHandler);
        elem.off('dragover', this.dragOverHandler);
        elem.off('dragleave', this.dragLeaveHandler);
        elem.off('drop', this.dropHandler);
        if (this.options.disableGlobalDnd) {
          $(document).off('dragover', this.dragOverHandler);
          $(document).off('drop', this.dropHandler);
        }
      }
    });
  });
  /**
     * @fileOverview FilePaste
     */
  define('runtime/html5/filepaste', [
    'base',
    'runtime/html5/runtime',
    'lib/file'
  ], function (Base, Html5Runtime, File) {
    return Html5Runtime.register('FilePaste', {
      init: function () {
        var opts = this.options, elem = this.elem = opts.container, accept = '.*', arr, i, len, item;
        // accetp的mimeTypes中生成匹配正则。
        if (opts.accept) {
          arr = [];
          for (i = 0, len = opts.accept.length; i < len; i++) {
            item = opts.accept[i].mimeTypes;
            item && arr.push(item);
          }
          if (arr.length) {
            accept = arr.join(',');
            accept = accept.replace(/,/g, '|').replace(/\*/g, '.*');
          }
        }
        this.accept = accept = new RegExp(accept, 'i');
        this.hander = Base.bindFn(this._pasteHander, this);
        elem.on('paste', this.hander);
      },
      _pasteHander: function (e) {
        var allowed = [], ruid = this.getRuid(), items, item, blob, i, len;
        e = e.originalEvent || e;
        items = e.clipboardData.items;
        for (i = 0, len = items.length; i < len; i++) {
          item = items[i];
          if (item.kind !== 'file' || !(blob = item.getAsFile())) {
            continue;
          }
          allowed.push(new File(ruid, blob));
        }
        if (allowed.length) {
          // 不阻止非文件粘贴（文字粘贴）的事件冒泡
          e.preventDefault();
          e.stopPropagation();
          this.trigger('paste', allowed);
        }
      },
      destroy: function () {
        this.elem.off('paste', this.hander);
      }
    });
  });
  /**
     * @fileOverview FilePicker
     */
  define('runtime/html5/filepicker', [
    'base',
    'runtime/html5/runtime'
  ], function (Base, Html5Runtime) {
    var $ = Base.$;
    return Html5Runtime.register('FilePicker', {
      init: function () {
        var container = this.getRuntime().getContainer(), me = this, owner = me.owner, opts = me.options, label = this.label = $(document.createElement('label')), input = this.input = $(document.createElement('input')), arr, i, len, mouseHandler;
        input.attr('type', 'file');
        input.attr('name', opts.name);
        input.addClass('webuploader-element-invisible');
        label.on('click', function () {
          input.trigger('click');
        });
        label.css({
          opacity: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'pointer',
          background: '#ffffff'
        });
        if (opts.multiple) {
          input.attr('multiple', 'multiple');
        }
        // @todo Firefox不支持单独指定后缀
        if (opts.accept && opts.accept.length > 0) {
          arr = [];
          for (i = 0, len = opts.accept.length; i < len; i++) {
            arr.push(opts.accept[i].mimeTypes);
          }
          input.attr('accept', arr.join(','));
        }
        container.append(input);
        container.append(label);
        mouseHandler = function (e) {
          owner.trigger(e.type);
        };
        input.on('change', function (e) {
          var fn = arguments.callee, clone;
          me.files = e.target.files;
          // reset input
          clone = this.cloneNode(true);
          clone.value = null;
          this.parentNode.replaceChild(clone, this);
          input.off();
          input = $(clone).on('change', fn).on('mouseenter mouseleave', mouseHandler);
          owner.trigger('change');
        });
        label.on('mouseenter mouseleave', mouseHandler);
      },
      getFiles: function () {
        return this.files;
      },
      destroy: function () {
        this.input.off();
        this.label.off();
      }
    });
  });
  /**
     * Terms:
     *
     * Uint8Array, FileReader, BlobBuilder, atob, ArrayBuffer
     * @fileOverview Image控件
     */
  define('runtime/html5/util', ['base'], function (Base) {
    var urlAPI = window.createObjectURL && window || window.URL && URL.revokeObjectURL && URL || window.webkitURL, createObjectURL = Base.noop, revokeObjectURL = createObjectURL;
    if (urlAPI) {
      // 更安全的方式调用，比如android里面就能把context改成其他的对象。
      createObjectURL = function () {
        return urlAPI.createObjectURL.apply(urlAPI, arguments);
      };
      revokeObjectURL = function () {
        return urlAPI.revokeObjectURL.apply(urlAPI, arguments);
      };
    }
    return {
      createObjectURL: createObjectURL,
      revokeObjectURL: revokeObjectURL,
      dataURL2Blob: function (dataURI) {
        var byteStr, intArray, ab, i, mimetype, parts;
        parts = dataURI.split(',');
        if (~parts[0].indexOf('base64')) {
          byteStr = atob(parts[1]);
        } else {
          byteStr = decodeURIComponent(parts[1]);
        }
        ab = new ArrayBuffer(byteStr.length);
        intArray = new Uint8Array(ab);
        for (i = 0; i < byteStr.length; i++) {
          intArray[i] = byteStr.charCodeAt(i);
        }
        mimetype = parts[0].split(':')[1].split(';')[0];
        return this.arrayBufferToBlob(ab, mimetype);
      },
      dataURL2ArrayBuffer: function (dataURI) {
        var byteStr, intArray, i, parts;
        parts = dataURI.split(',');
        if (~parts[0].indexOf('base64')) {
          byteStr = atob(parts[1]);
        } else {
          byteStr = decodeURIComponent(parts[1]);
        }
        intArray = new Uint8Array(byteStr.length);
        for (i = 0; i < byteStr.length; i++) {
          intArray[i] = byteStr.charCodeAt(i);
        }
        return intArray.buffer;
      },
      arrayBufferToBlob: function (buffer, type) {
        var builder = window.BlobBuilder || window.WebKitBlobBuilder, bb;
        // android不支持直接new Blob, 只能借助blobbuilder.
        if (builder) {
          bb = new builder();
          bb.append(buffer);
          return bb.getBlob(type);
        }
        return new Blob([buffer], type ? { type: type } : {});
      },
      canvasToDataUrl: function (canvas, type, quality) {
        return canvas.toDataURL(type, quality / 100);
      },
      parseMeta: function (blob, callback) {
        callback(false, {});
      },
      updateImageHead: function (data) {
        return data;
      }
    };
  });
  /**
     * Terms:
     *
     * Uint8Array, FileReader, BlobBuilder, atob, ArrayBuffer
     * @fileOverview Image控件
     */
  define('runtime/html5/imagemeta', ['runtime/html5/util'], function (Util) {
    var api;
    api = {
      parsers: { 65505: [] },
      maxMetaDataSize: 262144,
      parse: function (blob, cb) {
        var me = this, fr = new FileReader();
        fr.onload = function () {
          cb(false, me._parse(this.result));
          fr = fr.onload = fr.onerror = null;
        };
        fr.onerror = function (e) {
          cb(e.message);
          fr = fr.onload = fr.onerror = null;
        };
        blob = blob.slice(0, me.maxMetaDataSize);
        fr.readAsArrayBuffer(blob.getSource());
      },
      _parse: function (buffer, noParse) {
        if (buffer.byteLength < 6) {
          return;
        }
        var dataview = new DataView(buffer), offset = 2, maxOffset = dataview.byteLength - 4, headLength = offset, ret = {}, markerBytes, markerLength, parsers, i;
        if (dataview.getUint16(0) === 65496) {
          while (offset < maxOffset) {
            markerBytes = dataview.getUint16(offset);
            if (markerBytes >= 65504 && markerBytes <= 65519 || markerBytes === 65534) {
              markerLength = dataview.getUint16(offset + 2) + 2;
              if (offset + markerLength > dataview.byteLength) {
                break;
              }
              parsers = api.parsers[markerBytes];
              if (!noParse && parsers) {
                for (i = 0; i < parsers.length; i += 1) {
                  parsers[i].call(api, dataview, offset, markerLength, ret);
                }
              }
              offset += markerLength;
              headLength = offset;
            } else {
              break;
            }
          }
          if (headLength > 6) {
            if (buffer.slice) {
              ret.imageHead = buffer.slice(2, headLength);
            } else {
              // Workaround for IE10, which does not yet
              // support ArrayBuffer.slice:
              ret.imageHead = new Uint8Array(buffer).subarray(2, headLength);
            }
          }
        }
        return ret;
      },
      updateImageHead: function (buffer, head) {
        var data = this._parse(buffer, true), buf1, buf2, bodyoffset;
        bodyoffset = 2;
        if (data.imageHead) {
          bodyoffset = 2 + data.imageHead.byteLength;
        }
        if (buffer.slice) {
          buf2 = buffer.slice(bodyoffset);
        } else {
          buf2 = new Uint8Array(buffer).subarray(bodyoffset);
        }
        buf1 = new Uint8Array(head.byteLength + 2 + buf2.byteLength);
        buf1[0] = 255;
        buf1[1] = 216;
        buf1.set(new Uint8Array(head), 2);
        buf1.set(new Uint8Array(buf2), head.byteLength + 2);
        return buf1.buffer;
      }
    };
    Util.parseMeta = function () {
      return api.parse.apply(api, arguments);
    };
    Util.updateImageHead = function () {
      return api.updateImageHead.apply(api, arguments);
    };
    return api;
  });
  /**
     * 代码来自于：https://github.com/blueimp/JavaScript-Load-Image
     * 暂时项目中只用了orientation.
     *
     * 去除了 Exif Sub IFD Pointer, GPS Info IFD Pointer, Exif Thumbnail.
     * @fileOverview EXIF解析
     */
  // Sample
  // ====================================
  // Make : Apple
  // Model : iPhone 4S
  // Orientation : 1
  // XResolution : 72 [72/1]
  // YResolution : 72 [72/1]
  // ResolutionUnit : 2
  // Software : QuickTime 7.7.1
  // DateTime : 2013:09:01 22:53:55
  // ExifIFDPointer : 190
  // ExposureTime : 0.058823529411764705 [1/17]
  // FNumber : 2.4 [12/5]
  // ExposureProgram : Normal program
  // ISOSpeedRatings : 800
  // ExifVersion : 0220
  // DateTimeOriginal : 2013:09:01 22:52:51
  // DateTimeDigitized : 2013:09:01 22:52:51
  // ComponentsConfiguration : YCbCr
  // ShutterSpeedValue : 4.058893515764426
  // ApertureValue : 2.5260688216892597 [4845/1918]
  // BrightnessValue : -0.3126686601998395
  // MeteringMode : Pattern
  // Flash : Flash did not fire, compulsory flash mode
  // FocalLength : 4.28 [107/25]
  // SubjectArea : [4 values]
  // FlashpixVersion : 0100
  // ColorSpace : 1
  // PixelXDimension : 2448
  // PixelYDimension : 3264
  // SensingMethod : One-chip color area sensor
  // ExposureMode : 0
  // WhiteBalance : Auto white balance
  // FocalLengthIn35mmFilm : 35
  // SceneCaptureType : Standard
  define('runtime/html5/imagemeta/exif', [
    'base',
    'runtime/html5/imagemeta'
  ], function (Base, ImageMeta) {
    var EXIF = {};
    EXIF.ExifMap = function () {
      return this;
    };
    EXIF.ExifMap.prototype.map = { 'Orientation': 274 };
    EXIF.ExifMap.prototype.get = function (id) {
      return this[id] || this[this.map[id]];
    };
    EXIF.exifTagTypes = {
      1: {
        getValue: function (dataView, dataOffset) {
          return dataView.getUint8(dataOffset);
        },
        size: 1
      },
      2: {
        getValue: function (dataView, dataOffset) {
          return String.fromCharCode(dataView.getUint8(dataOffset));
        },
        size: 1,
        ascii: true
      },
      3: {
        getValue: function (dataView, dataOffset, littleEndian) {
          return dataView.getUint16(dataOffset, littleEndian);
        },
        size: 2
      },
      4: {
        getValue: function (dataView, dataOffset, littleEndian) {
          return dataView.getUint32(dataOffset, littleEndian);
        },
        size: 4
      },
      5: {
        getValue: function (dataView, dataOffset, littleEndian) {
          return dataView.getUint32(dataOffset, littleEndian) / dataView.getUint32(dataOffset + 4, littleEndian);
        },
        size: 8
      },
      9: {
        getValue: function (dataView, dataOffset, littleEndian) {
          return dataView.getInt32(dataOffset, littleEndian);
        },
        size: 4
      },
      10: {
        getValue: function (dataView, dataOffset, littleEndian) {
          return dataView.getInt32(dataOffset, littleEndian) / dataView.getInt32(dataOffset + 4, littleEndian);
        },
        size: 8
      }
    };
    // undefined, 8-bit byte, value depending on field:
    EXIF.exifTagTypes[7] = EXIF.exifTagTypes[1];
    EXIF.getExifValue = function (dataView, tiffOffset, offset, type, length, littleEndian) {
      var tagType = EXIF.exifTagTypes[type], tagSize, dataOffset, values, i, str, c;
      if (!tagType) {
        Base.log('Invalid Exif data: Invalid tag type.');
        return;
      }
      tagSize = tagType.size * length;
      // Determine if the value is contained in the dataOffset bytes,
      // or if the value at the dataOffset is a pointer to the actual data:
      dataOffset = tagSize > 4 ? tiffOffset + dataView.getUint32(offset + 8, littleEndian) : offset + 8;
      if (dataOffset + tagSize > dataView.byteLength) {
        Base.log('Invalid Exif data: Invalid data offset.');
        return;
      }
      if (length === 1) {
        return tagType.getValue(dataView, dataOffset, littleEndian);
      }
      values = [];
      for (i = 0; i < length; i += 1) {
        values[i] = tagType.getValue(dataView, dataOffset + i * tagType.size, littleEndian);
      }
      if (tagType.ascii) {
        str = '';
        // Concatenate the chars:
        for (i = 0; i < values.length; i += 1) {
          c = values[i];
          // Ignore the terminating NULL byte(s):
          if (c === '\0') {
            break;
          }
          str += c;
        }
        return str;
      }
      return values;
    };
    EXIF.parseExifTag = function (dataView, tiffOffset, offset, littleEndian, data) {
      var tag = dataView.getUint16(offset, littleEndian);
      data.exif[tag] = EXIF.getExifValue(dataView, tiffOffset, offset, dataView.getUint16(offset + 2, littleEndian), dataView.getUint32(offset + 4, littleEndian), littleEndian);
    };
    EXIF.parseExifTags = function (dataView, tiffOffset, dirOffset, littleEndian, data) {
      var tagsNumber, dirEndOffset, i;
      if (dirOffset + 6 > dataView.byteLength) {
        Base.log('Invalid Exif data: Invalid directory offset.');
        return;
      }
      tagsNumber = dataView.getUint16(dirOffset, littleEndian);
      dirEndOffset = dirOffset + 2 + 12 * tagsNumber;
      if (dirEndOffset + 4 > dataView.byteLength) {
        Base.log('Invalid Exif data: Invalid directory size.');
        return;
      }
      for (i = 0; i < tagsNumber; i += 1) {
        this.parseExifTag(dataView, tiffOffset, dirOffset + 2 + 12 * i, littleEndian, data);
      }
      // Return the offset to the next directory:
      return dataView.getUint32(dirEndOffset, littleEndian);
    };
    // EXIF.getExifThumbnail = function(dataView, offset, length) {
    //     var hexData,
    //         i,
    //         b;
    //     if (!length || offset + length > dataView.byteLength) {
    //         Base.log('Invalid Exif data: Invalid thumbnail data.');
    //         return;
    //     }
    //     hexData = [];
    //     for (i = 0; i < length; i += 1) {
    //         b = dataView.getUint8(offset + i);
    //         hexData.push((b < 16 ? '0' : '') + b.toString(16));
    //     }
    //     return 'data:image/jpeg,%' + hexData.join('%');
    // };
    EXIF.parseExifData = function (dataView, offset, length, data) {
      var tiffOffset = offset + 10, littleEndian, dirOffset;
      // Check for the ASCII code for "Exif" (0x45786966):
      if (dataView.getUint32(offset + 4) !== 1165519206) {
        // No Exif data, might be XMP data instead
        return;
      }
      if (tiffOffset + 8 > dataView.byteLength) {
        Base.log('Invalid Exif data: Invalid segment size.');
        return;
      }
      // Check for the two null bytes:
      if (dataView.getUint16(offset + 8) !== 0) {
        Base.log('Invalid Exif data: Missing byte alignment offset.');
        return;
      }
      // Check the byte alignment:
      switch (dataView.getUint16(tiffOffset)) {
      case 18761:
        littleEndian = true;
        break;
      case 19789:
        littleEndian = false;
        break;
      default:
        Base.log('Invalid Exif data: Invalid byte alignment marker.');
        return;
      }
      // Check for the TIFF tag marker (0x002A):
      if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 42) {
        Base.log('Invalid Exif data: Missing TIFF marker.');
        return;
      }
      // Retrieve the directory offset bytes, usually 0x00000008 or 8 decimal:
      dirOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
      // Create the exif object to store the tags:
      data.exif = new EXIF.ExifMap();
      // Parse the tags of the main image directory and retrieve the
      // offset to the next directory, usually the thumbnail directory:
      dirOffset = EXIF.parseExifTags(dataView, tiffOffset, tiffOffset + dirOffset, littleEndian, data);  // 尝试读取缩略图
                                                                                                         // if ( dirOffset ) {
                                                                                                         //     thumbnailData = {exif: {}};
                                                                                                         //     dirOffset = EXIF.parseExifTags(
                                                                                                         //         dataView,
                                                                                                         //         tiffOffset,
                                                                                                         //         tiffOffset + dirOffset,
                                                                                                         //         littleEndian,
                                                                                                         //         thumbnailData
                                                                                                         //     );
                                                                                                         //     // Check for JPEG Thumbnail offset:
                                                                                                         //     if (thumbnailData.exif[0x0201]) {
                                                                                                         //         data.exif.Thumbnail = EXIF.getExifThumbnail(
                                                                                                         //             dataView,
                                                                                                         //             tiffOffset + thumbnailData.exif[0x0201],
                                                                                                         //             thumbnailData.exif[0x0202] // Thumbnail data length
                                                                                                         //         );
                                                                                                         //     }
                                                                                                         // }
    };
    ImageMeta.parsers[65505].push(EXIF.parseExifData);
    return EXIF;
  });
  /**
     * 这个方式性能不行，但是可以解决android里面的toDataUrl的bug
     * android里面toDataUrl('image/jpege')得到的结果却是png.
     *
     * 所以这里没辙，只能借助这个工具
     * @fileOverview jpeg encoder
     */
  define('runtime/html5/jpegencoder', [], function (require, exports, module) {
    /*
          Copyright (c) 2008, Adobe Systems Incorporated
          All rights reserved.
    
          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are
          met:
    
          * Redistributions of source code must retain the above copyright notice,
            this list of conditions and the following disclaimer.
    
          * Redistributions in binary form must reproduce the above copyright
            notice, this list of conditions and the following disclaimer in the
            documentation and/or other materials provided with the distribution.
    
          * Neither the name of Adobe Systems Incorporated nor the names of its
            contributors may be used to endorse or promote products derived from
            this software without specific prior written permission.
    
          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
          IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
          THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
          PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
          CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
          EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
          PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
          PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
          LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
          NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
          SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */
    /*
        JPEG encoder ported to JavaScript and optimized by Andreas Ritter, www.bytestrom.eu, 11/2009
    
        Basic GUI blocking jpeg encoder
        */
    function JPEGEncoder(quality) {
      var self = this;
      var fround = Math.round;
      var ffloor = Math.floor;
      var YTable = new Array(64);
      var UVTable = new Array(64);
      var fdtbl_Y = new Array(64);
      var fdtbl_UV = new Array(64);
      var YDC_HT;
      var UVDC_HT;
      var YAC_HT;
      var UVAC_HT;
      var bitcode = new Array(65535);
      var category = new Array(65535);
      var outputfDCTQuant = new Array(64);
      var DU = new Array(64);
      var byteout = [];
      var bytenew = 0;
      var bytepos = 7;
      var YDU = new Array(64);
      var UDU = new Array(64);
      var VDU = new Array(64);
      var clt = new Array(256);
      var RGB_YUV_TABLE = new Array(2048);
      var currentQuality;
      var ZigZag = [
          0,
          1,
          5,
          6,
          14,
          15,
          27,
          28,
          2,
          4,
          7,
          13,
          16,
          26,
          29,
          42,
          3,
          8,
          12,
          17,
          25,
          30,
          41,
          43,
          9,
          11,
          18,
          24,
          31,
          40,
          44,
          53,
          10,
          19,
          23,
          32,
          39,
          45,
          52,
          54,
          20,
          22,
          33,
          38,
          46,
          51,
          55,
          60,
          21,
          34,
          37,
          47,
          50,
          56,
          59,
          61,
          35,
          36,
          48,
          49,
          57,
          58,
          62,
          63
        ];
      var std_dc_luminance_nrcodes = [
          0,
          0,
          1,
          5,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ];
      var std_dc_luminance_values = [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11
        ];
      var std_ac_luminance_nrcodes = [
          0,
          0,
          2,
          1,
          3,
          3,
          2,
          4,
          3,
          5,
          5,
          4,
          4,
          0,
          0,
          1,
          125
        ];
      var std_ac_luminance_values = [
          1,
          2,
          3,
          0,
          4,
          17,
          5,
          18,
          33,
          49,
          65,
          6,
          19,
          81,
          97,
          7,
          34,
          113,
          20,
          50,
          129,
          145,
          161,
          8,
          35,
          66,
          177,
          193,
          21,
          82,
          209,
          240,
          36,
          51,
          98,
          114,
          130,
          9,
          10,
          22,
          23,
          24,
          25,
          26,
          37,
          38,
          39,
          40,
          41,
          42,
          52,
          53,
          54,
          55,
          56,
          57,
          58,
          67,
          68,
          69,
          70,
          71,
          72,
          73,
          74,
          83,
          84,
          85,
          86,
          87,
          88,
          89,
          90,
          99,
          100,
          101,
          102,
          103,
          104,
          105,
          106,
          115,
          116,
          117,
          118,
          119,
          120,
          121,
          122,
          131,
          132,
          133,
          134,
          135,
          136,
          137,
          138,
          146,
          147,
          148,
          149,
          150,
          151,
          152,
          153,
          154,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          178,
          179,
          180,
          181,
          182,
          183,
          184,
          185,
          186,
          194,
          195,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          210,
          211,
          212,
          213,
          214,
          215,
          216,
          217,
          218,
          225,
          226,
          227,
          228,
          229,
          230,
          231,
          232,
          233,
          234,
          241,
          242,
          243,
          244,
          245,
          246,
          247,
          248,
          249,
          250
        ];
      var std_dc_chrominance_nrcodes = [
          0,
          0,
          3,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0,
          0,
          0,
          0
        ];
      var std_dc_chrominance_values = [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11
        ];
      var std_ac_chrominance_nrcodes = [
          0,
          0,
          2,
          1,
          2,
          4,
          4,
          3,
          4,
          7,
          5,
          4,
          4,
          0,
          1,
          2,
          119
        ];
      var std_ac_chrominance_values = [
          0,
          1,
          2,
          3,
          17,
          4,
          5,
          33,
          49,
          6,
          18,
          65,
          81,
          7,
          97,
          113,
          19,
          34,
          50,
          129,
          8,
          20,
          66,
          145,
          161,
          177,
          193,
          9,
          35,
          51,
          82,
          240,
          21,
          98,
          114,
          209,
          10,
          22,
          36,
          52,
          225,
          37,
          241,
          23,
          24,
          25,
          26,
          38,
          39,
          40,
          41,
          42,
          53,
          54,
          55,
          56,
          57,
          58,
          67,
          68,
          69,
          70,
          71,
          72,
          73,
          74,
          83,
          84,
          85,
          86,
          87,
          88,
          89,
          90,
          99,
          100,
          101,
          102,
          103,
          104,
          105,
          106,
          115,
          116,
          117,
          118,
          119,
          120,
          121,
          122,
          130,
          131,
          132,
          133,
          134,
          135,
          136,
          137,
          138,
          146,
          147,
          148,
          149,
          150,
          151,
          152,
          153,
          154,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          178,
          179,
          180,
          181,
          182,
          183,
          184,
          185,
          186,
          194,
          195,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          210,
          211,
          212,
          213,
          214,
          215,
          216,
          217,
          218,
          226,
          227,
          228,
          229,
          230,
          231,
          232,
          233,
          234,
          242,
          243,
          244,
          245,
          246,
          247,
          248,
          249,
          250
        ];
      function initQuantTables(sf) {
        var YQT = [
            16,
            11,
            10,
            16,
            24,
            40,
            51,
            61,
            12,
            12,
            14,
            19,
            26,
            58,
            60,
            55,
            14,
            13,
            16,
            24,
            40,
            57,
            69,
            56,
            14,
            17,
            22,
            29,
            51,
            87,
            80,
            62,
            18,
            22,
            37,
            56,
            68,
            109,
            103,
            77,
            24,
            35,
            55,
            64,
            81,
            104,
            113,
            92,
            49,
            64,
            78,
            87,
            103,
            121,
            120,
            101,
            72,
            92,
            95,
            98,
            112,
            100,
            103,
            99
          ];
        for (var i = 0; i < 64; i++) {
          var t = ffloor((YQT[i] * sf + 50) / 100);
          if (t < 1) {
            t = 1;
          } else if (t > 255) {
            t = 255;
          }
          YTable[ZigZag[i]] = t;
        }
        var UVQT = [
            17,
            18,
            24,
            47,
            99,
            99,
            99,
            99,
            18,
            21,
            26,
            66,
            99,
            99,
            99,
            99,
            24,
            26,
            56,
            99,
            99,
            99,
            99,
            99,
            47,
            66,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99,
            99
          ];
        for (var j = 0; j < 64; j++) {
          var u = ffloor((UVQT[j] * sf + 50) / 100);
          if (u < 1) {
            u = 1;
          } else if (u > 255) {
            u = 255;
          }
          UVTable[ZigZag[j]] = u;
        }
        var aasf = [
            1,
            1.387039845,
            1.306562965,
            1.175875602,
            1,
            0.785694958,
            0.5411961,
            0.275899379
          ];
        var k = 0;
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 8; col++) {
            fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            k++;
          }
        }
      }
      function computeHuffmanTbl(nrcodes, std_table) {
        var codevalue = 0;
        var pos_in_table = 0;
        var HT = new Array();
        for (var k = 1; k <= 16; k++) {
          for (var j = 1; j <= nrcodes[k]; j++) {
            HT[std_table[pos_in_table]] = [];
            HT[std_table[pos_in_table]][0] = codevalue;
            HT[std_table[pos_in_table]][1] = k;
            pos_in_table++;
            codevalue++;
          }
          codevalue *= 2;
        }
        return HT;
      }
      function initHuffmanTbl() {
        YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
        UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
        YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
        UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
      }
      function initCategoryNumber() {
        var nrlower = 1;
        var nrupper = 2;
        for (var cat = 1; cat <= 15; cat++) {
          //Positive numbers
          for (var nr = nrlower; nr < nrupper; nr++) {
            category[32767 + nr] = cat;
            bitcode[32767 + nr] = [];
            bitcode[32767 + nr][1] = cat;
            bitcode[32767 + nr][0] = nr;
          }
          //Negative numbers
          for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
            category[32767 + nrneg] = cat;
            bitcode[32767 + nrneg] = [];
            bitcode[32767 + nrneg][1] = cat;
            bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
          }
          nrlower <<= 1;
          nrupper <<= 1;
        }
      }
      function initRGBYUVTable() {
        for (var i = 0; i < 256; i++) {
          RGB_YUV_TABLE[i] = 19595 * i;
          RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
          RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
          RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
          RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
          RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
          RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
          RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
        }
      }
      // IO functions
      function writeBits(bs) {
        var value = bs[0];
        var posval = bs[1] - 1;
        while (posval >= 0) {
          if (value & 1 << posval) {
            bytenew |= 1 << bytepos;
          }
          posval--;
          bytepos--;
          if (bytepos < 0) {
            if (bytenew == 255) {
              writeByte(255);
              writeByte(0);
            } else {
              writeByte(bytenew);
            }
            bytepos = 7;
            bytenew = 0;
          }
        }
      }
      function writeByte(value) {
        byteout.push(clt[value]);  // write char directly instead of converting later
      }
      function writeWord(value) {
        writeByte(value >> 8 & 255);
        writeByte(value & 255);
      }
      // DCT & quantization core
      function fDCTQuant(data, fdtbl) {
        var d0, d1, d2, d3, d4, d5, d6, d7;
        /* Pass 1: process rows. */
        var dataOff = 0;
        var i;
        var I8 = 8;
        var I64 = 64;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 1];
          d2 = data[dataOff + 2];
          d3 = data[dataOff + 3];
          d4 = data[dataOff + 4];
          d5 = data[dataOff + 5];
          d6 = data[dataOff + 6];
          d7 = data[dataOff + 7];
          var tmp0 = d0 + d7;
          var tmp7 = d0 - d7;
          var tmp1 = d1 + d6;
          var tmp6 = d1 - d6;
          var tmp2 = d2 + d5;
          var tmp5 = d2 - d5;
          var tmp3 = d3 + d4;
          var tmp4 = d3 - d4;
          /* Even part */
          var tmp10 = tmp0 + tmp3;
          /* phase 2 */
          var tmp13 = tmp0 - tmp3;
          var tmp11 = tmp1 + tmp2;
          var tmp12 = tmp1 - tmp2;
          data[dataOff] = tmp10 + tmp11;
          /* phase 3 */
          data[dataOff + 4] = tmp10 - tmp11;
          var z1 = (tmp12 + tmp13) * 0.707106781;
          /* c4 */
          data[dataOff + 2] = tmp13 + z1;
          /* phase 5 */
          data[dataOff + 6] = tmp13 - z1;
          /* Odd part */
          tmp10 = tmp4 + tmp5;
          /* phase 2 */
          tmp11 = tmp5 + tmp6;
          tmp12 = tmp6 + tmp7;
          /* The rotator is modified from fig 4-8 to avoid extra negations. */
          var z5 = (tmp10 - tmp12) * 0.382683433;
          /* c6 */
          var z2 = 0.5411961 * tmp10 + z5;
          /* c2-c6 */
          var z4 = 1.306562965 * tmp12 + z5;
          /* c2+c6 */
          var z3 = tmp11 * 0.707106781;
          /* c4 */
          var z11 = tmp7 + z3;
          /* phase 5 */
          var z13 = tmp7 - z3;
          data[dataOff + 5] = z13 + z2;
          /* phase 6 */
          data[dataOff + 3] = z13 - z2;
          data[dataOff + 1] = z11 + z4;
          data[dataOff + 7] = z11 - z4;
          dataOff += 8;  /* advance pointer to next row */
        }
        /* Pass 2: process columns. */
        dataOff = 0;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 8];
          d2 = data[dataOff + 16];
          d3 = data[dataOff + 24];
          d4 = data[dataOff + 32];
          d5 = data[dataOff + 40];
          d6 = data[dataOff + 48];
          d7 = data[dataOff + 56];
          var tmp0p2 = d0 + d7;
          var tmp7p2 = d0 - d7;
          var tmp1p2 = d1 + d6;
          var tmp6p2 = d1 - d6;
          var tmp2p2 = d2 + d5;
          var tmp5p2 = d2 - d5;
          var tmp3p2 = d3 + d4;
          var tmp4p2 = d3 - d4;
          /* Even part */
          var tmp10p2 = tmp0p2 + tmp3p2;
          /* phase 2 */
          var tmp13p2 = tmp0p2 - tmp3p2;
          var tmp11p2 = tmp1p2 + tmp2p2;
          var tmp12p2 = tmp1p2 - tmp2p2;
          data[dataOff] = tmp10p2 + tmp11p2;
          /* phase 3 */
          data[dataOff + 32] = tmp10p2 - tmp11p2;
          var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781;
          /* c4 */
          data[dataOff + 16] = tmp13p2 + z1p2;
          /* phase 5 */
          data[dataOff + 48] = tmp13p2 - z1p2;
          /* Odd part */
          tmp10p2 = tmp4p2 + tmp5p2;
          /* phase 2 */
          tmp11p2 = tmp5p2 + tmp6p2;
          tmp12p2 = tmp6p2 + tmp7p2;
          /* The rotator is modified from fig 4-8 to avoid extra negations. */
          var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433;
          /* c6 */
          var z2p2 = 0.5411961 * tmp10p2 + z5p2;
          /* c2-c6 */
          var z4p2 = 1.306562965 * tmp12p2 + z5p2;
          /* c2+c6 */
          var z3p2 = tmp11p2 * 0.707106781;
          /* c4 */
          var z11p2 = tmp7p2 + z3p2;
          /* phase 5 */
          var z13p2 = tmp7p2 - z3p2;
          data[dataOff + 40] = z13p2 + z2p2;
          /* phase 6 */
          data[dataOff + 24] = z13p2 - z2p2;
          data[dataOff + 8] = z11p2 + z4p2;
          data[dataOff + 56] = z11p2 - z4p2;
          dataOff++;  /* advance pointer to next column */
        }
        // Quantize/descale the coefficients
        var fDCTQuant;
        for (i = 0; i < I64; ++i) {
          // Apply the quantization and scaling factor & Round to nearest integer
          fDCTQuant = data[i] * fdtbl[i];
          outputfDCTQuant[i] = fDCTQuant > 0 ? fDCTQuant + 0.5 | 0 : fDCTQuant - 0.5 | 0;  //outputfDCTQuant[i] = fround(fDCTQuant);
        }
        return outputfDCTQuant;
      }
      function writeAPP0() {
        writeWord(65504);
        // marker
        writeWord(16);
        // length
        writeByte(74);
        // J
        writeByte(70);
        // F
        writeByte(73);
        // I
        writeByte(70);
        // F
        writeByte(0);
        // = "JFIF",'\0'
        writeByte(1);
        // versionhi
        writeByte(1);
        // versionlo
        writeByte(0);
        // xyunits
        writeWord(1);
        // xdensity
        writeWord(1);
        // ydensity
        writeByte(0);
        // thumbnwidth
        writeByte(0);  // thumbnheight
      }
      function writeSOF0(width, height) {
        writeWord(65472);
        // marker
        writeWord(17);
        // length, truecolor YUV JPG
        writeByte(8);
        // precision
        writeWord(height);
        writeWord(width);
        writeByte(3);
        // nrofcomponents
        writeByte(1);
        // IdY
        writeByte(17);
        // HVY
        writeByte(0);
        // QTY
        writeByte(2);
        // IdU
        writeByte(17);
        // HVU
        writeByte(1);
        // QTU
        writeByte(3);
        // IdV
        writeByte(17);
        // HVV
        writeByte(1);  // QTV
      }
      function writeDQT() {
        writeWord(65499);
        // marker
        writeWord(132);
        // length
        writeByte(0);
        for (var i = 0; i < 64; i++) {
          writeByte(YTable[i]);
        }
        writeByte(1);
        for (var j = 0; j < 64; j++) {
          writeByte(UVTable[j]);
        }
      }
      function writeDHT() {
        writeWord(65476);
        // marker
        writeWord(418);
        // length
        writeByte(0);
        // HTYDCinfo
        for (var i = 0; i < 16; i++) {
          writeByte(std_dc_luminance_nrcodes[i + 1]);
        }
        for (var j = 0; j <= 11; j++) {
          writeByte(std_dc_luminance_values[j]);
        }
        writeByte(16);
        // HTYACinfo
        for (var k = 0; k < 16; k++) {
          writeByte(std_ac_luminance_nrcodes[k + 1]);
        }
        for (var l = 0; l <= 161; l++) {
          writeByte(std_ac_luminance_values[l]);
        }
        writeByte(1);
        // HTUDCinfo
        for (var m = 0; m < 16; m++) {
          writeByte(std_dc_chrominance_nrcodes[m + 1]);
        }
        for (var n = 0; n <= 11; n++) {
          writeByte(std_dc_chrominance_values[n]);
        }
        writeByte(17);
        // HTUACinfo
        for (var o = 0; o < 16; o++) {
          writeByte(std_ac_chrominance_nrcodes[o + 1]);
        }
        for (var p = 0; p <= 161; p++) {
          writeByte(std_ac_chrominance_values[p]);
        }
      }
      function writeSOS() {
        writeWord(65498);
        // marker
        writeWord(12);
        // length
        writeByte(3);
        // nrofcomponents
        writeByte(1);
        // IdY
        writeByte(0);
        // HTY
        writeByte(2);
        // IdU
        writeByte(17);
        // HTU
        writeByte(3);
        // IdV
        writeByte(17);
        // HTV
        writeByte(0);
        // Ss
        writeByte(63);
        // Se
        writeByte(0);  // Bf
      }
      function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
        var EOB = HTAC[0];
        var M16zeroes = HTAC[240];
        var pos;
        var I16 = 16;
        var I63 = 63;
        var I64 = 64;
        var DU_DCT = fDCTQuant(CDU, fdtbl);
        //ZigZag reorder
        for (var j = 0; j < I64; ++j) {
          DU[ZigZag[j]] = DU_DCT[j];
        }
        var Diff = DU[0] - DC;
        DC = DU[0];
        //Encode DC
        if (Diff == 0) {
          writeBits(HTDC[0]);  // Diff might be 0
        } else {
          pos = 32767 + Diff;
          writeBits(HTDC[category[pos]]);
          writeBits(bitcode[pos]);
        }
        //Encode ACs
        var end0pos = 63;
        // was const... which is crazy
        for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {
        }
        ;
        //end0pos = first element in reverse order !=0
        if (end0pos == 0) {
          writeBits(EOB);
          return DC;
        }
        var i = 1;
        var lng;
        while (i <= end0pos) {
          var startpos = i;
          for (; DU[i] == 0 && i <= end0pos; ++i) {
          }
          var nrzeroes = i - startpos;
          if (nrzeroes >= I16) {
            lng = nrzeroes >> 4;
            for (var nrmarker = 1; nrmarker <= lng; ++nrmarker)
              writeBits(M16zeroes);
            nrzeroes = nrzeroes & 15;
          }
          pos = 32767 + DU[i];
          writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
          writeBits(bitcode[pos]);
          i++;
        }
        if (end0pos != I63) {
          writeBits(EOB);
        }
        return DC;
      }
      function initCharLookupTable() {
        var sfcc = String.fromCharCode;
        for (var i = 0; i < 256; i++) {
          ///// ACHTUNG // 255
          clt[i] = sfcc(i);
        }
      }
      this.encode = function (image, quality)
        // image data object
        {
          // var time_start = new Date().getTime();
          if (quality)
            setQuality(quality);
          // Initialize bit writer
          byteout = new Array();
          bytenew = 0;
          bytepos = 7;
          // Add JPEG headers
          writeWord(65496);
          // SOI
          writeAPP0();
          writeDQT();
          writeSOF0(image.width, image.height);
          writeDHT();
          writeSOS();
          // Encode 8x8 macroblocks
          var DCY = 0;
          var DCU = 0;
          var DCV = 0;
          bytenew = 0;
          bytepos = 7;
          this.encode.displayName = '_encode_';
          var imageData = image.data;
          var width = image.width;
          var height = image.height;
          var quadWidth = width * 4;
          var tripleWidth = width * 3;
          var x, y = 0;
          var r, g, b;
          var start, p, col, row, pos;
          while (y < height) {
            x = 0;
            while (x < quadWidth) {
              start = quadWidth * y + x;
              p = start;
              col = -1;
              row = 0;
              for (pos = 0; pos < 64; pos++) {
                row = pos >> 3;
                // /8
                col = (pos & 7) * 4;
                // %8
                p = start + row * quadWidth + col;
                if (y + row >= height) {
                  // padding bottom
                  p -= quadWidth * (y + 1 + row - height);
                }
                if (x + col >= quadWidth) {
                  // padding right
                  p -= x + col - quadWidth + 4;
                }
                r = imageData[p++];
                g = imageData[p++];
                b = imageData[p++];
                /* // calculate YUV values dynamically
                            YDU[pos]=((( 0.29900)*r+( 0.58700)*g+( 0.11400)*b))-128; //-0x80
                            UDU[pos]=(((-0.16874)*r+(-0.33126)*g+( 0.50000)*b));
                            VDU[pos]=((( 0.50000)*r+(-0.41869)*g+(-0.08131)*b));
                            */
                // use lookup table (slightly faster)
                YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
                UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
                VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
              }
              DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
              DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
              DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
              x += 32;
            }
            y += 8;
          }
          ////////////////////////////////////////////////////////////////
          // Do the bit alignment of the EOI marker
          if (bytepos >= 0) {
            var fillbits = [];
            fillbits[1] = bytepos + 1;
            fillbits[0] = (1 << bytepos + 1) - 1;
            writeBits(fillbits);
          }
          writeWord(65497);
          //EOI
          var jpegDataUri = 'data:image/jpeg;base64,' + btoa(byteout.join(''));
          byteout = [];
          // benchmarking
          // var duration = new Date().getTime() - time_start;
          // console.log('Encoding time: '+ currentQuality + 'ms');
          //
          return jpegDataUri;
        };
      function setQuality(quality) {
        if (quality <= 0) {
          quality = 1;
        }
        if (quality > 100) {
          quality = 100;
        }
        if (currentQuality == quality)
          return;
        // don't recalc if unchanged
        var sf = 0;
        if (quality < 50) {
          sf = Math.floor(5000 / quality);
        } else {
          sf = Math.floor(200 - quality * 2);
        }
        initQuantTables(sf);
        currentQuality = quality;  // console.log('Quality set to: '+quality +'%');
      }
      function init() {
        // var time_start = new Date().getTime();
        if (!quality)
          quality = 50;
        // Create tables
        initCharLookupTable();
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();
        setQuality(quality);  // var duration = new Date().getTime() - time_start;
                              // console.log('Initialization '+ duration + 'ms');
      }
      init();
    }
    ;
    JPEGEncoder.encode = function (data, quality) {
      var encoder = new JPEGEncoder(quality);
      return encoder.encode(data);
    };
    return JPEGEncoder;
  });
  /**
     * @fileOverview Fix android canvas.toDataUrl bug.
     */
  define('runtime/html5/androidpatch', [
    'runtime/html5/util',
    'runtime/html5/jpegencoder',
    'base'
  ], function (Util, encoder, Base) {
    var origin = Util.canvasToDataUrl, supportJpeg;
    Util.canvasToDataUrl = function (canvas, type, quality) {
      var ctx, w, h, fragement, parts;
      // 非android手机直接跳过。
      if (!Base.os.android) {
        return origin.apply(null, arguments);
      }
      // 检测是否canvas支持jpeg导出，根据数据格式来判断。
      // JPEG 前两位分别是：255, 216
      if (type === 'image/jpeg' && typeof supportJpeg === 'undefined') {
        fragement = origin.apply(null, arguments);
        parts = fragement.split(',');
        if (~parts[0].indexOf('base64')) {
          fragement = atob(parts[1]);
        } else {
          fragement = decodeURIComponent(parts[1]);
        }
        fragement = fragement.substring(0, 2);
        supportJpeg = fragement.charCodeAt(0) === 255 && fragement.charCodeAt(1) === 216;
      }
      // 只有在android环境下才修复
      if (type === 'image/jpeg' && !supportJpeg) {
        w = canvas.width;
        h = canvas.height;
        ctx = canvas.getContext('2d');
        return encoder.encode(ctx.getImageData(0, 0, w, h), quality);
      }
      return origin.apply(null, arguments);
    };
  });
  /**
     * @fileOverview Image
     */
  define('runtime/html5/image', [
    'base',
    'runtime/html5/runtime',
    'runtime/html5/util'
  ], function (Base, Html5Runtime, Util) {
    var BLANK = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D';
    return Html5Runtime.register('Image', {
      modified: false,
      init: function () {
        var me = this, img = new Image();
        img.onload = function () {
          me._info = {
            type: me.type,
            width: this.width,
            height: this.height
          };
          // 读取meta信息。
          if (!me._metas && 'image/jpeg' === me.type) {
            Util.parseMeta(me._blob, function (error, ret) {
              me._metas = ret;
              me.owner.trigger('load');
            });
          } else {
            me.owner.trigger('load');
          }
        };
        img.onerror = function () {
          me.owner.trigger('error');
        };
        me._img = img;
      },
      loadFromBlob: function (blob) {
        var me = this, img = me._img;
        me._blob = blob;
        me.type = blob.type;
        img.src = Util.createObjectURL(blob.getSource());
        me.owner.once('load', function () {
          Util.revokeObjectURL(img.src);
        });
      },
      resize: function (width, height) {
        var canvas = this._canvas || (this._canvas = document.createElement('canvas'));
        this._resize(this._img, canvas, width, height);
        this._blob = null;
        // 没用了，可以删掉了。
        this.modified = true;
        this.owner.trigger('complete', 'resize');
      },
      crop: function (x, y, w, h, s) {
        var cvs = this._canvas || (this._canvas = document.createElement('canvas')), opts = this.options, img = this._img, iw = img.naturalWidth, ih = img.naturalHeight, orientation = this.getOrientation();
        s = s || 1;
        // todo 解决 orientation 的问题。
        // values that require 90 degree rotation
        // if ( ~[ 5, 6, 7, 8 ].indexOf( orientation ) ) {
        //     switch ( orientation ) {
        //         case 6:
        //             tmp = x;
        //             x = y;
        //             y = iw * s - tmp - w;
        //             console.log(ih * s, tmp, w)
        //             break;
        //     }
        //     (w ^= h, h ^= w, w ^= h);
        // }
        cvs.width = w;
        cvs.height = h;
        opts.preserveHeaders || this._rotate2Orientaion(cvs, orientation);
        this._renderImageToCanvas(cvs, img, -x, -y, iw * s, ih * s);
        this._blob = null;
        // 没用了，可以删掉了。
        this.modified = true;
        this.owner.trigger('complete', 'crop');
      },
      getAsBlob: function (type) {
        var blob = this._blob, opts = this.options, canvas;
        type = type || this.type;
        // blob需要重新生成。
        if (this.modified || this.type !== type) {
          canvas = this._canvas;
          if (type === 'image/jpeg') {
            blob = Util.canvasToDataUrl(canvas, type, opts.quality);
            if (opts.preserveHeaders && this._metas && this._metas.imageHead) {
              blob = Util.dataURL2ArrayBuffer(blob);
              blob = Util.updateImageHead(blob, this._metas.imageHead);
              blob = Util.arrayBufferToBlob(blob, type);
              return blob;
            }
          } else {
            blob = Util.canvasToDataUrl(canvas, type);
          }
          blob = Util.dataURL2Blob(blob);
        }
        return blob;
      },
      getAsDataUrl: function (type) {
        var opts = this.options;
        type = type || this.type;
        if (type === 'image/jpeg') {
          return Util.canvasToDataUrl(this._canvas, type, opts.quality);
        } else {
          return this._canvas.toDataURL(type);
        }
      },
      getOrientation: function () {
        return this._metas && this._metas.exif && this._metas.exif.get('Orientation') || 1;
      },
      info: function (val) {
        // setter
        if (val) {
          this._info = val;
          return this;
        }
        // getter
        return this._info;
      },
      meta: function (val) {
        // setter
        if (val) {
          this._meta = val;
          return this;
        }
        // getter
        return this._meta;
      },
      destroy: function () {
        var canvas = this._canvas;
        this._img.onload = null;
        if (canvas) {
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = canvas.height = 0;
          this._canvas = null;
        }
        // 释放内存。非常重要，否则释放不了image的内存。
        this._img.src = BLANK;
        this._img = this._blob = null;
      },
      _resize: function (img, cvs, width, height) {
        var opts = this.options, naturalWidth = img.width, naturalHeight = img.height, orientation = this.getOrientation(), scale, w, h, x, y;
        // values that require 90 degree rotation
        if (~[
            5,
            6,
            7,
            8
          ].indexOf(orientation)) {
          // 交换width, height的值。
          width ^= height;
          height ^= width;
          width ^= height;
        }
        scale = Math[opts.crop ? 'max' : 'min'](width / naturalWidth, height / naturalHeight);
        // 不允许放大。
        opts.allowMagnify || (scale = Math.min(1, scale));
        w = naturalWidth * scale;
        h = naturalHeight * scale;
        if (opts.crop) {
          cvs.width = width;
          cvs.height = height;
        } else {
          cvs.width = w;
          cvs.height = h;
        }
        x = (cvs.width - w) / 2;
        y = (cvs.height - h) / 2;
        opts.preserveHeaders || this._rotate2Orientaion(cvs, orientation);
        this._renderImageToCanvas(cvs, img, x, y, w, h);
      },
      _rotate2Orientaion: function (canvas, orientation) {
        var width = canvas.width, height = canvas.height, ctx = canvas.getContext('2d');
        switch (orientation) {
        case 5:
        case 6:
        case 7:
        case 8:
          canvas.width = height;
          canvas.height = width;
          break;
        }
        switch (orientation) {
        case 2:
          // horizontal flip
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          break;
        case 3:
          // 180 rotate left
          ctx.translate(width, height);
          ctx.rotate(Math.PI);
          break;
        case 4:
          // vertical flip
          ctx.translate(0, height);
          ctx.scale(1, -1);
          break;
        case 5:
          // vertical flip + 90 rotate right
          ctx.rotate(0.5 * Math.PI);
          ctx.scale(1, -1);
          break;
        case 6:
          // 90 rotate right
          ctx.rotate(0.5 * Math.PI);
          ctx.translate(0, -height);
          break;
        case 7:
          // horizontal flip + 90 rotate right
          ctx.rotate(0.5 * Math.PI);
          ctx.translate(width, -height);
          ctx.scale(-1, 1);
          break;
        case 8:
          // 90 rotate left
          ctx.rotate(-0.5 * Math.PI);
          ctx.translate(-width, 0);
          break;
        }
      },
      _renderImageToCanvas: function () {
        // 如果不是ios, 不需要这么复杂！
        if (!Base.os.ios) {
          return function (canvas) {
            var args = Base.slice(arguments, 1), ctx = canvas.getContext('2d');
            ctx.drawImage.apply(ctx, args);
          };
        }
        /**
                 * Detecting vertical squash in loaded image.
                 * Fixes a bug which squash image vertically while drawing into
                 * canvas for some images.
                 */
        function detectVerticalSquash(img, iw, ih) {
          var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), sy = 0, ey = ih, py = ih, data, alpha, ratio;
          canvas.width = 1;
          canvas.height = ih;
          ctx.drawImage(img, 0, 0);
          data = ctx.getImageData(0, 0, 1, ih).data;
          // search image edge pixel position in case
          // it is squashed vertically.
          while (py > sy) {
            alpha = data[(py - 1) * 4 + 3];
            if (alpha === 0) {
              ey = py;
            } else {
              sy = py;
            }
            py = ey + sy >> 1;
          }
          ratio = py / ih;
          return ratio === 0 ? 1 : ratio;
        }
        // fix ie7 bug
        // http://stackoverflow.com/questions/11929099/
        // html5-canvas-drawimage-ratio-bug-ios
        if (Base.os.ios >= 7) {
          return function (canvas, img, x, y, w, h) {
            var iw = img.naturalWidth, ih = img.naturalHeight, vertSquashRatio = detectVerticalSquash(img, iw, ih);
            return canvas.getContext('2d').drawImage(img, 0, 0, iw * vertSquashRatio, ih * vertSquashRatio, x, y, w, h);
          };
        }
        /**
                 * Detect subsampling in loaded image.
                 * In iOS, larger images than 2M pixels may be
                 * subsampled in rendering.
                 */
        function detectSubsampling(img) {
          var iw = img.naturalWidth, ih = img.naturalHeight, canvas, ctx;
          // subsampling may happen overmegapixel image
          if (iw * ih > 1024 * 1024) {
            canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, -iw + 1, 0);
            // subsampled image becomes half smaller in rendering size.
            // check alpha channel value to confirm image is covering
            // edge pixel or not. if alpha value is 0
            // image is not covering, hence subsampled.
            return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
          } else {
            return false;
          }
        }
        return function (canvas, img, x, y, width, height) {
          var iw = img.naturalWidth, ih = img.naturalHeight, ctx = canvas.getContext('2d'), subsampled = detectSubsampling(img), doSquash = this.type === 'image/jpeg', d = 1024, sy = 0, dy = 0, tmpCanvas, tmpCtx, vertSquashRatio, dw, dh, sx, dx;
          if (subsampled) {
            iw /= 2;
            ih /= 2;
          }
          ctx.save();
          tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = tmpCanvas.height = d;
          tmpCtx = tmpCanvas.getContext('2d');
          vertSquashRatio = doSquash ? detectVerticalSquash(img, iw, ih) : 1;
          dw = Math.ceil(d * width / iw);
          dh = Math.ceil(d * height / ih / vertSquashRatio);
          while (sy < ih) {
            sx = 0;
            dx = 0;
            while (sx < iw) {
              tmpCtx.clearRect(0, 0, d, d);
              tmpCtx.drawImage(img, -sx, -sy);
              ctx.drawImage(tmpCanvas, 0, 0, d, d, x + dx, y + dy, dw, dh);
              sx += d;
              dx += dw;
            }
            sy += d;
            dy += dh;
          }
          ctx.restore();
          tmpCanvas = tmpCtx = null;
        };
      }()
    });
  });
  /**
     * @fileOverview Transport
     * @todo 支持chunked传输，优势：
     * 可以将大文件分成小块，挨个传输，可以提高大文件成功率，当失败的时候，也只需要重传那小部分，
     * 而不需要重头再传一次。另外断点续传也需要用chunked方式。
     */
  define('runtime/html5/transport', [
    'base',
    'runtime/html5/runtime'
  ], function (Base, Html5Runtime) {
    var noop = Base.noop, $ = Base.$;
    return Html5Runtime.register('Transport', {
      init: function () {
        this._status = 0;
        this._response = null;
      },
      send: function () {
        var owner = this.owner, opts = this.options, xhr = this._initAjax(), blob = owner._blob, server = opts.server, formData, binary, fr;
        if (opts.sendAsBinary) {
          server += (/\?/.test(server) ? '&' : '?') + $.param(owner._formData);
          binary = blob.getSource();
        } else {
          formData = new FormData();
          $.each(owner._formData, function (k, v) {
            formData.append(k, v);
          });
          formData.append(opts.fileVal, blob.getSource(), opts.filename || owner._formData.name || '');
        }
        if (opts.withCredentials && 'withCredentials' in xhr) {
          xhr.open(opts.method, server, true);
          xhr.withCredentials = true;
        } else {
          xhr.open(opts.method, server);
        }
        this._setRequestHeader(xhr, opts.headers);
        if (binary) {
          // 强制设置成 content-type 为文件流。
          xhr.overrideMimeType && xhr.overrideMimeType('application/octet-stream');
          // android直接发送blob会导致服务端接收到的是空文件。
          // bug详情。
          // https://code.google.com/p/android/issues/detail?id=39882
          // 所以先用fileReader读取出来再通过arraybuffer的方式发送。
          if (Base.os.android) {
            fr = new FileReader();
            fr.onload = function () {
              xhr.send(this.result);
              fr = fr.onload = null;
            };
            fr.readAsArrayBuffer(binary);
          } else {
            xhr.send(binary);
          }
        } else {
          xhr.send(formData);
        }
      },
      getResponse: function () {
        return this._response;
      },
      getResponseAsJson: function () {
        return this._parseJson(this._response);
      },
      getStatus: function () {
        return this._status;
      },
      abort: function () {
        var xhr = this._xhr;
        if (xhr) {
          xhr.upload.onprogress = noop;
          xhr.onreadystatechange = noop;
          xhr.abort();
          this._xhr = xhr = null;
        }
      },
      destroy: function () {
        this.abort();
      },
      _initAjax: function () {
        var me = this, xhr = new XMLHttpRequest(), opts = this.options;
        if (opts.withCredentials && !('withCredentials' in xhr) && typeof XDomainRequest !== 'undefined') {
          xhr = new XDomainRequest();
        }
        xhr.upload.onprogress = function (e) {
          var percentage = 0;
          if (e.lengthComputable) {
            percentage = e.loaded / e.total;
          }
          return me.trigger('progress', percentage);
        };
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4) {
            return;
          }
          xhr.upload.onprogress = noop;
          xhr.onreadystatechange = noop;
          me._xhr = null;
          me._status = xhr.status;
          if (xhr.status >= 200 && xhr.status < 300) {
            me._response = xhr.responseText;
            return me.trigger('load');
          } else if (xhr.status >= 500 && xhr.status < 600) {
            me._response = xhr.responseText;
            return me.trigger('error', 'server');
          }
          return me.trigger('error', me._status ? 'http' : 'abort');
        };
        me._xhr = xhr;
        return xhr;
      },
      _setRequestHeader: function (xhr, headers) {
        $.each(headers, function (key, val) {
          xhr.setRequestHeader(key, val);
        });
      },
      _parseJson: function (str) {
        var json;
        try {
          json = JSON.parse(str);
        } catch (ex) {
          json = {};
        }
        return json;
      }
    });
  });
  /**
     * @fileOverview  Transport flash实现
     */
  define('runtime/html5/md5', ['runtime/html5/runtime'], function (FlashRuntime) {
    /*
         * Fastest md5 implementation around (JKM md5)
         * Credits: Joseph Myers
         *
         * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
         * @see http://jsperf.com/md5-shootout/7
         */
    /* this function is much faster,
          so if possible we use it. Some IEs
          are the only ones I know of that
          need the idiotic second function,
          generated by an if clause.  */
    var add32 = function (a, b) {
        return a + b & 4294967295;
      }, cmn = function (q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32(a << s | a >>> 32 - s, b);
      }, ff = function (a, b, c, d, x, s, t) {
        return cmn(b & c | ~b & d, a, b, x, s, t);
      }, gg = function (a, b, c, d, x, s, t) {
        return cmn(b & d | c & ~d, a, b, x, s, t);
      }, hh = function (a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
      }, ii = function (a, b, c, d, x, s, t) {
        return cmn(c ^ (b | ~d), a, b, x, s, t);
      }, md5cycle = function (x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
      },
      /* there needs to be support for Unicode here,
           * unless we pretend that we can redefine the MD-5
           * algorithm for multi-byte characters (perhaps
           * by adding every four 16-bit characters and
           * shortening the sum to 32 bits). Otherwise
           * I suggest performing MD-5 as if every character
           * was two bytes--e.g., 0040 0025 = @%--but then
           * how will an ordinary MD-5 sum be matched?
           * There is no way to standardize text to something
           * like UTF-8 before transformation; speed cost is
           * utterly prohibitive. The JavaScript standard
           * itself needs to look at this: it should start
           * providing access to strings as preformed UTF-8
           * 8-bit unsigned value arrays.
           */
      md5blk = function (s) {
        var md5blks = [], i;
        /* Andy King said do it this way. */
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
      }, md5blk_array = function (a) {
        var md5blks = [], i;
        /* Andy King said do it this way. */
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
      }, md51 = function (s) {
        var n = s.length, state = [
            1732584193,
            -271733879,
            -1732584194,
            271733878
          ], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }, md51_array = function (a) {
        var n = a.length, state = [
            1732584193,
            -271733879,
            -1732584194,
            271733878
          ], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }
        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
        length = a.length;
        tail = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= a[i] << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }, hex_chr = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f'
      ], rhex = function (n) {
        var s = '', j;
        for (j = 0; j < 4; j += 1) {
          s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
        }
        return s;
      }, hex = function (x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
          x[i] = rhex(x[i]);
        }
        return x.join('');
      }, md5 = function (s) {
        return hex(md51(s));
      },
      ////////////////////////////////////////////////////////////////////////////
      /**
         * SparkMD5 OOP implementation.
         *
         * Use this class to perform an incremental md5, otherwise use the
         * static methods instead.
         */
      SparkMD5 = function () {
        // call reset to init the instance
        this.reset();
      };
    // In some cases the fast add32 function cannot be used..
    if (md5('hello') !== '5d41402abc4b2a76b9719d911017c592') {
      add32 = function (x, y) {
        var lsw = (x & 65535) + (y & 65535), msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return msw << 16 | lsw & 65535;
      };
    }
    /**
         * Appends a string.
         * A conversion will be applied if an utf8 string is detected.
         *
         * @param {String} str The string to be appended
         *
         * @return {SparkMD5} The instance itself
         */
    SparkMD5.prototype.append = function (str) {
      // converts the string to utf8 bytes if necessary
      if (/[\u0080-\uFFFF]/.test(str)) {
        str = unescape(encodeURIComponent(str));
      }
      // then append as binary
      this.appendBinary(str);
      return this;
    };
    /**
         * Appends a binary string.
         *
         * @param {String} contents The binary string to be appended
         *
         * @return {SparkMD5} The instance itself
         */
    SparkMD5.prototype.appendBinary = function (contents) {
      this._buff += contents;
      this._length += contents.length;
      var length = this._buff.length, i;
      for (i = 64; i <= length; i += 64) {
        md5cycle(this._state, md5blk(this._buff.substring(i - 64, i)));
      }
      this._buff = this._buff.substr(i - 64);
      return this;
    };
    /**
         * Finishes the incremental computation, reseting the internal state and
         * returning the result.
         * Use the raw parameter to obtain the raw result instead of the hex one.
         *
         * @param {Boolean} raw True to get the raw result, false to get the hex result
         *
         * @return {String|Array} The result
         */
    SparkMD5.prototype.end = function (raw) {
      var buff = this._buff, length = buff.length, i, tail = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ], ret;
      for (i = 0; i < length; i += 1) {
        tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
      }
      this._finish(tail, length);
      ret = !!raw ? this._state : hex(this._state);
      this.reset();
      return ret;
    };
    /**
         * Finish the final calculation based on the tail.
         *
         * @param {Array}  tail   The tail (will be modified)
         * @param {Number} length The length of the remaining buffer
         */
    SparkMD5.prototype._finish = function (tail, length) {
      var i = length, tmp, lo, hi;
      tail[i >> 2] |= 128 << (i % 4 << 3);
      if (i > 55) {
        md5cycle(this._state, tail);
        for (i = 0; i < 16; i += 1) {
          tail[i] = 0;
        }
      }
      // Do the final computation based on the tail and length
      // Beware that the final length may not fit in 32 bits so we take care of that
      tmp = this._length * 8;
      tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
      lo = parseInt(tmp[2], 16);
      hi = parseInt(tmp[1], 16) || 0;
      tail[14] = lo;
      tail[15] = hi;
      md5cycle(this._state, tail);
    };
    /**
         * Resets the internal state of the computation.
         *
         * @return {SparkMD5} The instance itself
         */
    SparkMD5.prototype.reset = function () {
      this._buff = '';
      this._length = 0;
      this._state = [
        1732584193,
        -271733879,
        -1732584194,
        271733878
      ];
      return this;
    };
    /**
         * Releases memory used by the incremental buffer and other aditional
         * resources. If you plan to use the instance again, use reset instead.
         */
    SparkMD5.prototype.destroy = function () {
      delete this._state;
      delete this._buff;
      delete this._length;
    };
    /**
         * Performs the md5 hash on a string.
         * A conversion will be applied if utf8 string is detected.
         *
         * @param {String}  str The string
         * @param {Boolean} raw True to get the raw result, false to get the hex result
         *
         * @return {String|Array} The result
         */
    SparkMD5.hash = function (str, raw) {
      // converts the string to utf8 bytes if necessary
      if (/[\u0080-\uFFFF]/.test(str)) {
        str = unescape(encodeURIComponent(str));
      }
      var hash = md51(str);
      return !!raw ? hash : hex(hash);
    };
    /**
         * Performs the md5 hash on a binary string.
         *
         * @param {String}  content The binary string
         * @param {Boolean} raw     True to get the raw result, false to get the hex result
         *
         * @return {String|Array} The result
         */
    SparkMD5.hashBinary = function (content, raw) {
      var hash = md51(content);
      return !!raw ? hash : hex(hash);
    };
    /**
         * SparkMD5 OOP implementation for array buffers.
         *
         * Use this class to perform an incremental md5 ONLY for array buffers.
         */
    SparkMD5.ArrayBuffer = function () {
      // call reset to init the instance
      this.reset();
    };
    ////////////////////////////////////////////////////////////////////////////
    /**
         * Appends an array buffer.
         *
         * @param {ArrayBuffer} arr The array to be appended
         *
         * @return {SparkMD5.ArrayBuffer} The instance itself
         */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
      // TODO: we could avoid the concatenation here but the algorithm would be more complex
      //       if you find yourself needing extra performance, please make a PR.
      var buff = this._concatArrayBuffer(this._buff, arr), length = buff.length, i;
      this._length += arr.byteLength;
      for (i = 64; i <= length; i += 64) {
        md5cycle(this._state, md5blk_array(buff.subarray(i - 64, i)));
      }
      // Avoids IE10 weirdness (documented above)
      this._buff = i - 64 < length ? buff.subarray(i - 64) : new Uint8Array(0);
      return this;
    };
    /**
         * Finishes the incremental computation, reseting the internal state and
         * returning the result.
         * Use the raw parameter to obtain the raw result instead of the hex one.
         *
         * @param {Boolean} raw True to get the raw result, false to get the hex result
         *
         * @return {String|Array} The result
         */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
      var buff = this._buff, length = buff.length, tail = [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ], i, ret;
      for (i = 0; i < length; i += 1) {
        tail[i >> 2] |= buff[i] << (i % 4 << 3);
      }
      this._finish(tail, length);
      ret = !!raw ? this._state : hex(this._state);
      this.reset();
      return ret;
    };
    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;
    /**
         * Resets the internal state of the computation.
         *
         * @return {SparkMD5.ArrayBuffer} The instance itself
         */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
      this._buff = new Uint8Array(0);
      this._length = 0;
      this._state = [
        1732584193,
        -271733879,
        -1732584194,
        271733878
      ];
      return this;
    };
    /**
         * Releases memory used by the incremental buffer and other aditional
         * resources. If you plan to use the instance again, use reset instead.
         */
    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;
    /**
         * Concats two array buffers, returning a new one.
         *
         * @param  {ArrayBuffer} first  The first array buffer
         * @param  {ArrayBuffer} second The second array buffer
         *
         * @return {ArrayBuffer} The new array buffer
         */
    SparkMD5.ArrayBuffer.prototype._concatArrayBuffer = function (first, second) {
      var firstLength = first.length, result = new Uint8Array(firstLength + second.byteLength);
      result.set(first);
      result.set(new Uint8Array(second), firstLength);
      return result;
    };
    /**
         * Performs the md5 hash on an array buffer.
         *
         * @param {ArrayBuffer} arr The array buffer
         * @param {Boolean}     raw True to get the raw result, false to get the hex result
         *
         * @return {String|Array} The result
         */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
      var hash = md51_array(new Uint8Array(arr));
      return !!raw ? hash : hex(hash);
    };
    return FlashRuntime.register('Md5', {
      init: function () {
      },
      loadFromBlob: function (file) {
        var blob = file.getSource(), chunkSize = 2 * 1024 * 1024, chunks = Math.ceil(blob.size / chunkSize), chunk = 0, owner = this.owner, spark = new SparkMD5.ArrayBuffer(), me = this, blobSlice = blob.mozSlice || blob.webkitSlice || blob.slice, loadNext, fr;
        fr = new FileReader();
        loadNext = function () {
          var start, end;
          start = chunk * chunkSize;
          end = Math.min(start + chunkSize, blob.size);
          fr.onload = function (e) {
            spark.append(e.target.result);
            owner.trigger('progress', {
              total: file.size,
              loaded: end
            });
          };
          fr.onloadend = function () {
            fr.onloadend = fr.onload = null;
            if (++chunk < chunks) {
              setTimeout(loadNext, 1);
            } else {
              setTimeout(function () {
                owner.trigger('load');
                me.result = spark.end();
                loadNext = file = blob = spark = null;
                owner.trigger('complete');
              }, 50);
            }
          };
          fr.readAsArrayBuffer(blobSlice.call(blob, start, end));
        };
        loadNext();
      },
      getResult: function () {
        return this.result;
      }
    });
  });
  /**
     * @fileOverview FlashRuntime
     */
  define('runtime/flash/runtime', [
    'base',
    'runtime/runtime',
    'runtime/compbase'
  ], function (Base, Runtime, CompBase) {
    var $ = Base.$, type = 'flash', components = {};
    function getFlashVersion() {
      var version;
      try {
        version = navigator.plugins['Shockwave Flash'];
        version = version.description;
      } catch (ex) {
        try {
          version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
        } catch (ex2) {
          version = '0.0';
        }
      }
      version = version.match(/\d+/g);
      return parseFloat(version[0] + '.' + version[1], 10);
    }
    function FlashRuntime() {
      var pool = {}, clients = {}, destroy = this.destroy, me = this, jsreciver = Base.guid('webuploader_');
      Runtime.apply(me, arguments);
      me.type = type;
      // 这个方法的调用者，实际上是RuntimeClient
      me.exec = function (comp, fn) {
        var client = this, uid = client.uid, args = Base.slice(arguments, 2), instance;
        clients[uid] = client;
        if (components[comp]) {
          if (!pool[uid]) {
            pool[uid] = new components[comp](client, me);
          }
          instance = pool[uid];
          if (instance[fn]) {
            return instance[fn].apply(instance, args);
          }
        }
        return me.flashExec.apply(client, arguments);
      };
      function handler(evt, obj) {
        var type = evt.type || evt, parts, uid;
        parts = type.split('::');
        uid = parts[0];
        type = parts[1];
        // console.log.apply( console, arguments );
        if (type === 'Ready' && uid === me.uid) {
          me.trigger('ready');
        } else if (clients[uid]) {
          clients[uid].trigger(type.toLowerCase(), evt, obj);
        }  // Base.log( evt, obj );
      }
      // flash的接受器。
      window[jsreciver] = function () {
        var args = arguments;
        // 为了能捕获得到。
        setTimeout(function () {
          handler.apply(null, args);
        }, 1);
      };
      this.jsreciver = jsreciver;
      this.destroy = function () {
        // @todo 删除池子中的所有实例
        return destroy && destroy.apply(this, arguments);
      };
      this.flashExec = function (comp, fn) {
        var flash = me.getFlash(), args = Base.slice(arguments, 2);
        return flash.exec(this.uid, comp, fn, args);
      };  // @todo
    }
    Base.inherits(Runtime, {
      constructor: FlashRuntime,
      init: function () {
        var container = this.getContainer(), opts = this.options, html;
        // if not the minimal height, shims are not initialized
        // in older browsers (e.g FF3.6, IE6,7,8, Safari 4.0,5.0, etc)
        container.css({
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '9px',
          height: '9px',
          overflow: 'hidden'
        });
        // insert flash object
        html = '<object id="' + this.uid + '" type="application/' + 'x-shockwave-flash" data="' + opts.swf + '" ';
        if (Base.browser.ie) {
          html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
        }
        html += 'width="100%" height="100%" style="outline:0">' + '<param name="movie" value="' + opts.swf + '" />' + '<param name="flashvars" value="uid=' + this.uid + '&jsreciver=' + this.jsreciver + '" />' + '<param name="wmode" value="transparent" />' + '<param name="allowscriptaccess" value="always" />' + '</object>';
        container.html(html);
      },
      getFlash: function () {
        if (this._flash) {
          return this._flash;
        }
        this._flash = $('#' + this.uid).get(0);
        return this._flash;
      }
    });
    FlashRuntime.register = function (name, component) {
      component = components[name] = Base.inherits(CompBase, $.extend({
        flashExec: function () {
          var owner = this.owner, runtime = this.getRuntime();
          return runtime.flashExec.apply(owner, arguments);
        }
      }, component));
      return component;
    };
    if (getFlashVersion() >= 11.4) {
      Runtime.addRuntime(type, FlashRuntime);
    }
    return FlashRuntime;
  });
  /**
     * @fileOverview FilePicker
     */
  define('runtime/flash/filepicker', [
    'base',
    'runtime/flash/runtime'
  ], function (Base, FlashRuntime) {
    var $ = Base.$;
    return FlashRuntime.register('FilePicker', {
      init: function (opts) {
        var copy = $.extend({}, opts), len, i;
        // 修复Flash再没有设置title的情况下无法弹出flash文件选择框的bug.
        len = copy.accept && copy.accept.length;
        for (i = 0; i < len; i++) {
          if (!copy.accept[i].title) {
            copy.accept[i].title = 'Files';
          }
        }
        delete copy.button;
        delete copy.id;
        delete copy.container;
        this.flashExec('FilePicker', 'init', copy);
      },
      destroy: function () {
        this.flashExec('FilePicker', 'destroy');
      }
    });
  });
  /**
     * @fileOverview 图片压缩
     */
  define('runtime/flash/image', ['runtime/flash/runtime'], function (FlashRuntime) {
    return FlashRuntime.register('Image', {
      loadFromBlob: function (blob) {
        var owner = this.owner;
        owner.info() && this.flashExec('Image', 'info', owner.info());
        owner.meta() && this.flashExec('Image', 'meta', owner.meta());
        this.flashExec('Image', 'loadFromBlob', blob.uid);
      }
    });
  });
  /**
     * @fileOverview  Transport flash实现
     */
  define('runtime/flash/transport', [
    'base',
    'runtime/flash/runtime',
    'runtime/client'
  ], function (Base, FlashRuntime, RuntimeClient) {
    var $ = Base.$;
    return FlashRuntime.register('Transport', {
      init: function () {
        this._status = 0;
        this._response = null;
        this._responseJson = null;
      },
      send: function () {
        var owner = this.owner, opts = this.options, xhr = this._initAjax(), blob = owner._blob, server = opts.server, binary;
        xhr.connectRuntime(blob.ruid);
        if (opts.sendAsBinary) {
          server += (/\?/.test(server) ? '&' : '?') + $.param(owner._formData);
          binary = blob.uid;
        } else {
          $.each(owner._formData, function (k, v) {
            xhr.exec('append', k, v);
          });
          xhr.exec('appendBlob', opts.fileVal, blob.uid, opts.filename || owner._formData.name || '');
        }
        this._setRequestHeader(xhr, opts.headers);
        xhr.exec('send', {
          method: opts.method,
          url: server,
          forceURLStream: opts.forceURLStream,
          mimeType: 'application/octet-stream'
        }, binary);
      },
      getStatus: function () {
        return this._status;
      },
      getResponse: function () {
        return this._response || '';
      },
      getResponseAsJson: function () {
        return this._responseJson;
      },
      abort: function () {
        var xhr = this._xhr;
        if (xhr) {
          xhr.exec('abort');
          xhr.destroy();
          this._xhr = xhr = null;
        }
      },
      destroy: function () {
        this.abort();
      },
      _initAjax: function () {
        var me = this, xhr = new RuntimeClient('XMLHttpRequest');
        xhr.on('uploadprogress progress', function (e) {
          var percent = e.loaded / e.total;
          percent = Math.min(1, Math.max(0, percent));
          return me.trigger('progress', percent);
        });
        xhr.on('load', function () {
          var status = xhr.exec('getStatus'), readBody = false, err = '', p;
          xhr.off();
          me._xhr = null;
          if (status >= 200 && status < 300) {
            readBody = true;
          } else if (status >= 500 && status < 600) {
            readBody = true;
            err = 'server';
          } else {
            err = 'http';
          }
          if (readBody) {
            me._response = xhr.exec('getResponse');
            me._response = decodeURIComponent(me._response);
            // flash 处理可能存在 bug, 没辙只能靠 js 了
            // try {
            //     me._responseJson = xhr.exec('getResponseAsJson');
            // } catch ( error ) {
            p = window.JSON && window.JSON.parse || function (s) {
              try {
                return new Function('return ' + s).call();
              } catch (err) {
                return {};
              }
            };
            me._responseJson = me._response ? p(me._response) : {};  // }
          }
          xhr.destroy();
          xhr = null;
          return err ? me.trigger('error', err) : me.trigger('load');
        });
        xhr.on('error', function () {
          xhr.off();
          me._xhr = null;
          me.trigger('error', 'http');
        });
        me._xhr = xhr;
        return xhr;
      },
      _setRequestHeader: function (xhr, headers) {
        $.each(headers, function (key, val) {
          xhr.exec('setRequestHeader', key, val);
        });
      }
    });
  });
  /**
     * @fileOverview Blob Html实现
     */
  define('runtime/flash/blob', [
    'runtime/flash/runtime',
    'lib/blob'
  ], function (FlashRuntime, Blob) {
    return FlashRuntime.register('Blob', {
      slice: function (start, end) {
        var blob = this.flashExec('Blob', 'slice', start, end);
        return new Blob(blob.uid, blob);
      }
    });
  });
  /**
     * @fileOverview  Md5 flash实现
     */
  define('runtime/flash/md5', ['runtime/flash/runtime'], function (FlashRuntime) {
    return FlashRuntime.register('Md5', {
      init: function () {
      },
      loadFromBlob: function (blob) {
        return this.flashExec('Md5', 'loadFromBlob', blob.uid);
      }
    });
  });
  /**
     * @fileOverview 完全版本。
     */
  define('preset/all', [
    'base',
    'widgets/filednd',
    'widgets/filepaste',
    'widgets/filepicker',
    'widgets/image',
    'widgets/queue',
    'widgets/runtime',
    'widgets/upload',
    'widgets/validator',
    'widgets/md5',
    'runtime/html5/blob',
    'runtime/html5/dnd',
    'runtime/html5/filepaste',
    'runtime/html5/filepicker',
    'runtime/html5/imagemeta/exif',
    'runtime/html5/androidpatch',
    'runtime/html5/image',
    'runtime/html5/transport',
    'runtime/html5/md5',
    'runtime/flash/filepicker',
    'runtime/flash/image',
    'runtime/flash/transport',
    'runtime/flash/blob',
    'runtime/flash/md5'
  ], function (Base) {
    return Base;
  });
  /**
     * @fileOverview 日志组件，主要用来收集错误信息，可以帮助 webuploader 更好的定位问题和发展。
     *
     * 如果您不想要启用此功能，请在打包的时候去掉 log 模块。
     *
     * 或者可以在初始化的时候通过 options.disableWidgets 属性禁用。
     *
     * 如：
     * WebUploader.create({
     *     ...
     *
     *     disableWidgets: 'log',
     *
     *     ...
     * })
     */
  define('widgets/log', [
    'base',
    'uploader',
    'widgets/widget'
  ], function (Base, Uploader) {
    var $ = Base.$, logUrl = ' http://static.tieba.baidu.com/tb/pms/img/st.gif??', product = (location.hostname || location.host || 'protected').toLowerCase(),
      // 只针对 baidu 内部产品用户做统计功能。
      enable = product && /baidu/i.exec(product), base;
    if (!enable) {
      return;
    }
    base = {
      dv: 3,
      master: 'webuploader',
      online: /test/.exec(product) ? 0 : 1,
      module: '',
      product: product,
      type: 0
    };
    function send(data) {
      var obj = $.extend({}, base, data), url = logUrl.replace(/^(.*)\?/, '$1' + $.param(obj)), image = new Image();
      image.src = url;
    }
    return Uploader.register({
      name: 'log',
      init: function () {
        var owner = this.owner, count = 0, size = 0;
        owner.on('error', function (code) {
          send({
            type: 2,
            c_error_code: code
          });
        }).on('uploadError', function (file, reason) {
          send({
            type: 2,
            c_error_code: 'UPLOAD_ERROR',
            c_reason: '' + reason
          });
        }).on('uploadComplete', function (file) {
          count++;
          size += file.size;
        }).on('uploadFinished', function () {
          send({
            c_count: count,
            c_size: size
          });
          count = size = 0;
        });
        send({ c_usage: 1 });
      }
    });
  });
  /**
     * @fileOverview Uploader上传类
     */
  define('webuploader', [
    'preset/all',
    'widgets/log'
  ], function (preset) {
    return preset;
  });
  return require('webuploader');
}));
'use strict';
/**
 * @ngdoc overview
 * @name tigerwitApp
 * @description
 * # tigerwitApp
 *
 * Main module of the application.
 */
var routerApp = angular.module('tigerwitApp', [
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ui.router'
  ]);
routerApp.config([
  '$stateProvider',
  '$urlRouterProvider',
  '$httpProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider) {
    // 全局 $http 请求配置。
    $httpProvider.interceptors.push([
      'wdConfig',
      '$location',
      function (wdConfig, $location) {
        return {
          'request': function (config) {
            config.timeout = wdConfig.httpTimeout;
            if (!/^[http|https]/.test(config.url) && !/\.html$/.test(config.url)) {
              config.url = wdConfig.apiUrl + config.url;
            }
            return config;
          },
          'response': function (response) {
            if (/\.html/.test(response.config.url)) {
              return response;
            } else {
              return response.data;
            }
          }
        };
      }
    ]);
    $urlRouterProvider.otherwise('/index');
    // 下面为 page 的配置
    $stateProvider.state('index', {
      url: '/index',
      views: {
        '': {
          templateUrl: 'views/layout/doc1.html',
          controller: function ($scope) {
            $scope.moduleId = 'tigerwit-index';
          }
        },
        'hd@index': {
          templateUrl: 'views/navs/navbar1.html',
          controller: ''
        },
        'bd@index': {
          templateUrl: 'views/web/index.html',
          controller: 'wdWebMarketingController'
        },
        'ft@index': { templateUrl: 'views/layout/footer.html' }
      }
    }).state('regist', {
      url: '/regist',
      views: {
        '': {
          templateUrl: 'views/layout/doc1.html',
          controller: function ($scope) {
            $scope.moduleId = 'tigerwit-regist';
          }
        },
        'hd@regist': {
          templateUrl: 'views/navs/navbar1.html',
          controller: ''
        },
        'bd@regist': {
          templateUrl: 'views/account/register.html',
          controller: 'registerCtrl'
        },
        'ft@regist': { templateUrl: 'views/layout/footer.html' }
      }
    }).state('login', {
      url: '/login',
      views: {
        '': {
          templateUrl: 'views/layout/doc1.html',
          controller: function ($scope) {
            $scope.moduleId = 'tigerwit-login';
          }
        },
        'hd@login': {
          templateUrl: 'views/navs/navbar1.html',
          controller: ''
        },
        'bd@login': {
          templateUrl: 'views/account/login.html',
          controller: 'loginCtrl'
        },
        'ft@login': { templateUrl: 'views/layout/footer.html' }
      }
    }).state('reset', {
      url: '/reset',
      views: {
        '': {
          templateUrl: 'views/layout/doc1.html',
          controller: function ($scope) {
            $scope.moduleId = 'tigerwit-index';
          }
        },
        'hd@reset': {
          templateUrl: 'views/navs/navbar1.html',
          controller: ''
        },
        'bd@reset': {
          templateUrl: 'views/account/reset_password.html',
          controller: 'registerCtrl'
        },
        'ft@reset': { templateUrl: 'views/layout/footer.html' }
      }
    }).state('regist_succ', {
      url: '/regist_succ',
      views: {
        '': {
          templateUrl: 'views/layout/doc1.html',
          controller: function ($scope) {
            $scope.moduleId = 'tigerwit-regist-succ';
          }
        },
        'hd@regist_succ': {
          templateUrl: 'views/navs/navbar1.html',
          controller: ''
        },
        'bd@regist_succ': { templateUrl: 'views/account/register_succ.html' },
        'ft@regist_succ': { templateUrl: 'views/layout/footer.html' }
      }
    }).state('personal', {
      url: '/personal',
      views: {
        '': { templateUrl: 'views/layout/doc2.html' },
        'hd@personal': { templateUrl: 'views/navs/navbar_personal.html' },
        'sidebar@personal': {
          templateUrl: 'views/personal/personal_info_side.html',
          controller: ''
        },
        'content@personal': {
          templateUrl: 'views/personal/personal_history.html',
          controller: ''
        },
        'sidebar-ad@personal': {
          templateUrl: 'views/personal/personal_deposit_side.html',
          controller: ''
        },
        'ft@personal': { templateUrl: 'views/layout/footer.html' }
      }
    });
  }
]);
'use strict';
angular.module('tigerwitApp').factory('wdConfig', [
  '$rootScope',
  '$location',
  function ($rootScope, $location) {
    return {
      apiUrl: '/api/v1',
      webSocketUrl: 'ws://' + $location.host() + '/api/v1',
      httpTimeout: 10000
    };  // 结束
  }
]);
'use strict';
angular.module('tigerwitApp').factory('wdStorage', [
  '$window',
  function ($window) {
    function get(name) {
      return $window.localStorage.getItem(name);
    }
    function set(name, value) {
      return $window.localStorage.setItem(name, value);
    }
    function remove(name) {
      $window.localStorage.removeItem(name);
    }
    return {
      item: function (name, value) {
        switch (arguments.length) {
        case 1:
          return get(name);
        case 2:
          return set(name, value);
        }
      },
      remove: function (name) {
        remove(name);
      },
      removeAll: function () {
        var list = [
            'phone',
            'password',
            'register-step',
            'is_set_info',
            'is_set_id_pic'
          ];
        $.each(list, function (i, v) {
          remove(v);
        });
      }
    };  // 结束 
  }
]);
angular.module('tigerwitApp').factory('$transition', [
  '$q',
  '$timeout',
  '$rootScope',
  function ($q, $timeout, $rootScope) {
    var $transition = function (element, trigger, options) {
      options = options || {};
      var deferred = $q.defer();
      var endEventName = $transition[options.animation ? 'animationEndEventName' : 'transitionEndEventName'];
      var transitionEndHandler = function (event) {
        $rootScope.$apply(function () {
          element.unbind(endEventName, transitionEndHandler);
          deferred.resolve(element);
        });
      };
      if (endEventName) {
        element.bind(endEventName, transitionEndHandler);
      }
      // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
      $timeout(function () {
        if (angular.isString(trigger)) {
          element.addClass(trigger);
        } else if (angular.isFunction(trigger)) {
          trigger(element);
        } else if (angular.isObject(trigger)) {
          element.css(trigger);
        }
        //If browser does not support transitions, instantly resolve
        if (!endEventName) {
          deferred.resolve(element);
        }
      });
      // Add our custom cancel function to the promise that is returned
      // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
      // i.e. it will therefore never raise a transitionEnd event for that transition
      deferred.promise.cancel = function () {
        if (endEventName) {
          element.unbind(endEventName, transitionEndHandler);
        }
        deferred.reject('Transition cancelled');
      };
      return deferred.promise;
    };
    // Work out the name of the transitionEnd event
    var transElement = document.createElement('trans');
    var transitionEndEventNames = {
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'oTransitionEnd',
        'transition': 'transitionend'
      };
    var animationEndEventNames = {
        'WebkitTransition': 'webkitAnimationEnd',
        'MozTransition': 'animationend',
        'OTransition': 'oAnimationEnd',
        'transition': 'animationend'
      };
    function findEndEventName(endEventNames) {
      for (var name in endEventNames) {
        if (transElement.style[name] !== undefined) {
          return endEventNames[name];
        }
      }
    }
    $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
    $transition.animationEndEventName = findEndEventName(animationEndEventNames);
    return $transition;
  }
]);
'use strict';
angular.module('tigerwitApp').factory('wdValidator', [
  '$window',
  function ($window) {
    var validateFuns = {
        regTypes: {
          'phone': '1[0-9]{10}$',
          'email': '\\S+@\\S+\\.\\S+',
          'num': '[0-9]',
          'zh': '[^u4e00-u9fa5]',
          'en': '[a-zA-Z]',
          'sym': '[!@#$%^&*()_+]'
        },
        number: function (str, type) {
          var validateResult = !/\D/.test(str);
          var validateReason = '';
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u9879\u5fc5\u987b\u4e3a\u6570\u5b57\uff01';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        id: function (str) {
          var validateResult = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(str);
          var validateReason = '';
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u7684\u8eab\u4efd\u8bc1\u53f7\u683c\u5f0f\u4e0d\u6b63\u786e';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        text: function (str, type) {
          var textTypes = type.split(':')[1];
          var textTypeList = textTypes.split('-');
          var textRegStr = '';
          textTypeList.forEach(function (item) {
            textRegStr += '' + (validateFuns.regTypes[item] || '') + '|';
          });
          console.log('textRegStr:', textRegStr);
          var textReg = new RegExp(textRegStr);
          var validateResult = textReg.test(str);
          var validateReason = '';
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u9879\u4e0d\u7b26\u5408\u89c4\u8303\uff01';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        password: function (str) {
          var typeCounter = 0;
          if (str.search(/\d/) != -1) {
            typeCounter += 1;
          }
          if (str.search(/[a-z]/) != -1) {
            typeCounter += 1;
          }
          if (str.search(/[A-Z]/) != -1) {
            typeCounter += 1;
          }
          if (str.search(/\!\@\#\$\%\^\&\*\(\)\_\+/) != -1) {
            typeCounter += 1;
          }
          var hasBadChar = false;
          if (str.search(/^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+/) != -1) {
            hasBadChar = true;
          }
          var validateReason = '';
          var validateResult = true;
          if (typeCounter < 2) {
            validateReason = '\u5bc6\u7801\u5fc5\u987b\u5305\u542b\u5927\u5199\u5b57\u6bcd\uff0c\u5c0f\u5199\u5b57\u6bcd\uff0c\u6570\u5b57\u548c\u7b26\u53f7\u5176\u4e2d\u4e24\u9879';
            validateResult = false;
          }
          if (hasBadChar) {
            validateReason = '\u5305\u542b\u975e\u6cd5\u8f93\u5165\u9879';
            validateResult = false;
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        length: function (str, type) {
          var lengthContent = type.split(':')[1];
          var lengthStart = lengthContent.split('-')[0];
          var lengthEnd = lengthContent.split('-')[1];
          var validateResult = lengthStart <= str.length && str.length <= lengthEnd;
          console.log(str.length);
          console.log('validateResult', validateResult);
          console.log(lengthStart <= str.length <= lengthEnd);
          var validateReason = '';
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u9879\u957f\u5ea6\u5e94\u4ecb\u4e8e ' + lengthStart + ' \u4f4d\u548c ' + lengthEnd + ' \u4f4d\u4e4b\u95f4';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        option: function (str) {
          return {
            validate_reason: '',
            validate_result: true
          };
        },
        required: function (str) {
          var validateResult = false;
          var validateReason = '';
          if (str) {
            validateResult = true;
          } else {
            validateReason = '\u6b64\u9879\u4e3a\u5fc5\u586b\u9879';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        phone: function (str) {
          var phoneReg = new RegExp(this.regTypes.phone);
          var validateReason = '';
          var validateResult = phoneReg.test(str);
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u7684\u624b\u673a\u53f7\u4e0d\u7b26\u5408\u89c4\u8303\uff01';
          }
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        },
        email: function (str) {
          var emailReg = new RegExp(this.regTypes.email);
          var validateReason = '';
          var validateResult = emailReg.test(str);
          if (!validateResult) {
            validateReason = '\u8f93\u5165\u7684\u90ae\u7bb1\u4e0d\u7b26\u5408\u89c4\u8303\uff01';
          }
          console.log('email validateResult', validateResult);
          return {
            validate_reason: validateReason,
            validate_result: validateResult
          };
        }
      };
    return {
      validate: function (type, str) {
        var typeList = type.split(' ');
        var validateResult = {
            validate_result: true,
            validate_reason: ''
          };
        if (typeList.indexOf('option') >= 0 && str === '') {
          console.log(222);
          return validateResult;
        }
        typeList.forEach(function (type) {
          var funcsType = type.split(':')[0];
          var temptResultObj = validateFuns[funcsType](str, type);
          if (!temptResultObj.validate_result) {
            validateResult = temptResultObj;
          }
        });
        return validateResult;
      }
    };  // 结束
  }
]);
'use strict';
angular.module('tigerwitApp').directive('wdUploadForm', [
  '$window',
  'wdConfig',
  function ($window, wdConfig) {
    return {
      restrict: 'A',
      scope: false,
      replace: false,
      controller: [
        '$scope',
        function ($scope) {
        }
      ],
      link: function ($scope, $element, $attrs, $controller) {
        // 初始化Web Uploader
        var uploader = $window.WebUploader.create({
            auto: true,
            server: wdConfig.apiUrl + '/upload',
            pick: $element[0],
            accept: {
              title: 'Images',
              extensions: 'gif,jpg,jpeg,bmp,png',
              mimeTypes: 'image/*'
            },
            formData: { face: $attrs.face }
          });
        uploader.on('startUpload', function () {
          $scope.$emit('wd-upload-form-start', { face: $attrs.face });
        });
        // 文件上传成功，给item添加成功class, 用样式标记上传成功。
        uploader.on('uploadSuccess', function () {
          $scope.$emit('wd-upload-form-success', { face: $attrs.face });
        });
        // 文件上传失败，显示上传出错。
        uploader.on('uploadError', function (error) {
          $scope.$emit('wd-upload-form-error', { face: $attrs.face });
        });
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').directive('wdLoading', function () {
  return {
    restrict: 'A',
    template: '<div>' + '<div></div>' + '<div></div>' + '<div></div>' + '<div></div>' + '<div></div>' + '<div></div>' + '<div></div>' + '<div></div>' + '</div>',
    replace: true,
    scope: true,
    link: function (scope, element, attributes) {
      element.addClass('wd-loading');
    }
  };
});
'use strict';
angular.module('tigerwitApp').directive('wdWidthEqualHeight', [
  '$window',
  function ($window) {
    var h = $($window).height();
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attributes) {
        var w = Math.min(element.width(), h);
        element.height(w);
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').directive('wdPlaceHolder', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, element, attr, ctrl) {
      var holder = attr.placeholder;
      // 标记一下是否是第一次进入
      var firstFlag = false;
      var placehold = function () {
        element.val(holder);
        element.addClass('wd-place-holder');
      };
      var unplacehold = function () {
        element.val('');
        element.removeClass('wd-place-holder');
      };
      scope.$watch(attr.ngModel, function (val) {
        if (!firstFlag && !val) {
          firstFlag = true;
          placehold();
        }
      });
      element.on('focus', function () {
        var v = element.val();
        if (v === holder) {
          unplacehold();
        }
      });
      element.on('blur', function () {
        var v = element.val();
        if (!v) {
          placehold();
        }
      });
    }
  };
});
/**
* @ngdoc overview
* @name ui.bootstrap.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('tigerwitApp').controller('wdCarouselController', [
  '$scope',
  '$timeout',
  '$transition',
  function ($scope, $timeout, $transition) {
    var self = this, slides = self.slides = $scope.slides = [], currentIndex = -1, currentTimeout, isPlaying;
    self.currentSlide = null;
    var destroyed = false;
    /* direction: "prev" or "next" */
    self.select = $scope.select = function (nextSlide, direction) {
      var nextIndex = slides.indexOf(nextSlide);
      //Decide direction if it's not given
      if (direction === undefined) {
        direction = nextIndex > currentIndex ? 'next' : 'prev';
      }
      if (nextSlide && nextSlide !== self.currentSlide) {
        if ($scope.$currentTransition) {
          $scope.$currentTransition.cancel();
          //Timeout so ng-class in template has time to fix classes for finished slide
          $timeout(goNext);
        } else {
          goNext();
        }
      }
      function goNext() {
        // Scope has been destroyed, stop here.
        if (destroyed) {
          return;
        }
        //If we have a slide to transition from and we have a transition type and we're allowed, go
        if (self.currentSlide && angular.isString(direction) && !$scope.noTransition && nextSlide.$element) {
          //We shouldn't do class manip in here, but it's the same weird thing bootstrap does. need to fix sometime
          nextSlide.$element.addClass(direction);
          var reflow = nextSlide.$element[0].offsetWidth;
          //force reflow
          //Set all other slides to stop doing their stuff for the new transition
          angular.forEach(slides, function (slide) {
            angular.extend(slide, {
              direction: '',
              entering: false,
              leaving: false,
              active: false
            });
          });
          angular.extend(nextSlide, {
            direction: direction,
            active: true,
            entering: true
          });
          angular.extend(self.currentSlide || {}, {
            direction: direction,
            leaving: true
          });
          $scope.$currentTransition = $transition(nextSlide.$element, {});
          //We have to create new pointers inside a closure since next & current will change
          (function (next, current) {
            $scope.$currentTransition.then(function () {
              transitionDone(next, current);
            }, function () {
              transitionDone(next, current);
            });
          }(nextSlide, self.currentSlide));
        } else {
          transitionDone(nextSlide, self.currentSlide);
        }
        self.currentSlide = nextSlide;
        currentIndex = nextIndex;
        //every time you change slides, reset the timer
        restartTimer();
      }
      function transitionDone(next, current) {
        angular.extend(next, {
          direction: '',
          active: true,
          leaving: false,
          entering: false
        });
        angular.extend(current || {}, {
          direction: '',
          active: false,
          leaving: false,
          entering: false
        });
        $scope.$currentTransition = null;
      }
    };
    $scope.$on('$destroy', function () {
      destroyed = true;
    });
    /* Allow outside people to call indexOf on slides array */
    self.indexOfSlide = function (slide) {
      return slides.indexOf(slide);
    };
    $scope.next = function () {
      var newIndex = (currentIndex + 1) % slides.length;
      //Prevent this user-triggered transition from occurring if there is already one in progress
      if (!$scope.$currentTransition) {
        return self.select(slides[newIndex], 'next');
      }
    };
    $scope.prev = function () {
      var newIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;
      //Prevent this user-triggered transition from occurring if there is already one in progress
      if (!$scope.$currentTransition) {
        return self.select(slides[newIndex], 'prev');
      }
    };
    $scope.isActive = function (slide) {
      return self.currentSlide === slide;
    };
    $scope.$watch('interval', restartTimer);
    $scope.$on('$destroy', resetTimer);
    function restartTimer() {
      resetTimer();
      var interval = +$scope.interval;
      if (!isNaN(interval) && interval >= 0) {
        currentTimeout = $timeout(timerFn, interval);
      }
    }
    function resetTimer() {
      if (currentTimeout) {
        $timeout.cancel(currentTimeout);
        currentTimeout = null;
      }
    }
    function timerFn() {
      if (isPlaying) {
        $scope.next();
        restartTimer();
      } else {
        $scope.pause();
      }
    }
    $scope.play = function () {
      if (!isPlaying) {
        isPlaying = true;
        restartTimer();
      }
    };
    $scope.pause = function () {
      if (!$scope.noPause) {
        isPlaying = false;
        resetTimer();
      }
    };
    self.addSlide = function (slide, element) {
      slide.$element = element;
      slides.push(slide);
      //if this is the first slide or the slide is set to active, select it
      if (slides.length === 1 || slide.active) {
        self.select(slides[slides.length - 1]);
        if (slides.length == 1) {
          $scope.play();
        }
      } else {
        slide.active = false;
      }
    };
    self.removeSlide = function (slide) {
      //get the index of the slide inside the carousel
      var index = slides.indexOf(slide);
      slides.splice(index, 1);
      if (slides.length > 0 && slide.active) {
        if (index >= slides.length) {
          self.select(slides[index - 1]);
        } else {
          self.select(slides[index]);
        }
      } else if (currentIndex > index) {
        currentIndex--;
      }
    };
  }
]).directive('wdCarousel', [function () {
    return {
      restrict: 'EA',
      transclude: true,
      replace: true,
      controller: 'wdCarouselController',
      require: 'wdCarousel',
      templateUrl: 'views/template/carousel.html',
      scope: {
        interval: '=',
        noTransition: '=',
        noPause: '='
      }
    };
  }]).directive('wdSlide', function () {
  return {
    require: '^wdCarousel',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: 'views/template/slide.html',
    scope: { active: '=?' },
    link: function (scope, element, attrs, carouselCtrl) {
      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function () {
        carouselCtrl.removeSlide(scope);
      });
      scope.$watch('active', function (active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
});
'use strict';
angular.module('tigerwitApp').directive('focusTip', [
  'wdValidator',
  function (wdValidator) {
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attributes) {
        var focusTip = attributes.focusTip;
        var $focusTip = $('[focus-tip-type="' + attributes.focusTip + '"]');
        var $focusTipTextWrpper = $('p', $focusTip);
        var focusTipText = $focusTipTextWrpper.attr('data-info');
        element.bind('focus', function () {
          $focusTipTextWrpper.text(focusTipText);
          $focusTipTextWrpper.show();
          $focusTip.parent().removeClass('has-error');
        });
        element.bind('blur', function () {
          var validatorType = attributes.validate;
          if (!!!validatorType) {
            $focusTipTextWrpper.hide();
            return;
          }
          // 验证输入的有效性
          var validateResObj = wdValidator.validate(validatorType, element.val());
          if (validateResObj.validate_result) {
            $focusTipTextWrpper.hide();
          } else {
            $focusTipTextWrpper.text(validateResObj.validate_reason);
            $focusTip.parent().addClass('has-error');
          }
        });
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').controller('wdWebMarketingController', [
  '$scope',
  'wdAccount',
  '$timeout',
  'wdConfig',
  'wdStorage',
  '$location',
  function ($scope, wdAccount, $timeout, wdConfig, wdStorage, $location) {
    var slides = $scope.slides = [];
    $scope.myInterval = 3000;
    $scope.addSlide = function () {
      var newWidth = 600 + slides.length;
      slides.push({ image: 'haha' });
    };
    for (var i = 0; i < 4; i++) {
      $scope.addSlide();
    }
    // 进入时的逻辑
    // 判断用户是否登录和用户的属性
    // 登录用户：去掉提醒用户开户的横条，去掉提醒用户登录注册的安妮
    // 登录的虚拟用户：增加虚拟用户转位真实账户的入口
    $scope.isLogin = false;
    wdAccount.check().then(function (data) {
      // 已经完成注册申请过程
      console.log(data);
      if (data.is_succ) {
        $scope.isLogin = true;
        wdAccount.getInfo().then(function (data) {
          $scope.verified = data.verified;
        });
      }
    }, function (data) {
    });
    $scope.submit_text = '\u5f00\u901a\u8d26\u53f7';
    $scope.error_msg = '';
    $scope.signIn = {};
    $scope.goToRegister = function () {
      $scope.submit_text = '\u53d1\u9001\u9a8c\u8bc1\u7801\u4e2d...';
      verifyPhone().then(function (data) {
        if (data.is_succ) {
          $location.path('/register').search('phone', $scope.signIn.phone);
        } else {
          $scope.error_msg = data.error_msg;
        }
      });
    };
    function verifyPhone() {
      return wdAccount.verifyPhone($scope.signIn.phone);
    }
  }
]);
'use strict';
angular.module('tigerwitApp').controller('wdWebPersonalController', [
  '$scope',
  'wdAccount',
  '$timeout',
  '$location',
  'wdAccountMoney',
  function ($scope, wdAccount, $timeout, $location, wdAccountMoney) {
    var equitySocket;
    $scope.user = {
      money: {
        available: '0.00',
        recharge: '1.00',
        uiRecharge: false
      }
    };
    $scope.logout = function () {
      wdAccount.logout().then(function (data) {
        if (data.is_succ) {
        }
      }, function () {
      });
    };
    equitySocket = wdAccountMoney.equitySocket();
    equitySocket.onmessage = function (e) {
      var data = JSON.parse(e.data);
      console.log(data);
    };
    function getInfo() {
      wdAccount.getInfo().then(function (data) {
        console.log(data);
        $scope.user.money.available = data.money.available;
      });
    }
    // 金额要增加两位小数
    $scope.pay = function () {
      var num = Number($scope.user.money.recharge);
      if (String(typeof num).toLocaleLowerCase() === 'number') {
        wdAccountMoney.pay(Number(num).toFixed(2));
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').controller('registerCtrl', [
  '$scope',
  'wdAccount',
  '$timeout',
  'wdConfig',
  'wdValidator',
  '$location',
  '$interval',
  '$rootScope',
  function ($scope, wdAccount, $timeout, wdConfig, wdValidator, $location, $interval, $rootScope) {
    // 通过 query 中的 type 字段来标示注册的类型，默认情况下为
    // 注册虚拟账户
    // type: virtual || "" 注册虚拟账户
    // type: real 注册真实账户，但还是先要注册虚拟账户
    // type: virtual2real 虚拟账户转变成真实账户
    var searchObj = $location.search();
    $scope.registType = searchObj.type || '';
    $rootScope.hideNav = true;
    // 设置真实信息的步骤表示
    $scope.realInfo = {};
    if ($scope.registType === 'virtual2real') {
      wdAccount.getRealInfoStep().then(function (msg) {
        $scope.realInfo.step = msg.progress + 1;
      }, function () {
      });
    }
    // 重置密码步骤
    $scope.resetInfo = { step: 1 };
    // 注册虚拟账户
    $scope.signIn = {
      notice: true,
      verify_code: '',
      phone: '',
      password: '',
      email: '',
      username: ''
    };
    // 如果从其他页面带有电话号码跳到注册页面
    // 那么自动填充到手机输入框，并且开始倒计时
    if (searchObj.phone) {
      $scope.signIn.phone = searchObj.phone;
      coutDown();
    } else {
      $scope.isDisable = '';
      $scope.countDownText = '\u83b7\u53d6\u9a8c\u8bc1\u7801';
    }
    // 进入时的逻辑
    wdAccount.check().then(function (data) {
      data.is_succ = false;
      if (data.is_succ) {
        wdAccount.getInfo().then(function (data) {
          $scope.verified = data.verified;
        });
        $scope.isLogin = true;
        // 已经完成注册申请过程
        $location.path('/personal');
      }
    }, function (data) {
    });
    // 注册虚拟账号
    $scope.registVirtual = function () {
      if (validateInput() && confirmPassword()) {
        register();
      }
    };
    // 将虚拟账户转变成真实账户
    $scope.uploadUrl = wdConfig.apiUrl + '/upload';
    $scope.person = {
      real_name: '',
      invite_code: '',
      uiFrontImageStatus: 0,
      uiBackImageStatus: 0,
      uiFrontImageError: '',
      uiBackImageError: ''
    };
    // 设置真实账号信息
    $scope.setRealInfo = function () {
      if (validateInput()) {
        setInfo().then(function (data) {
          if (data.is_succ) {
            $scope.realInfo.step = 2;
          } else {
            console.log('error');
          }
        });
      }
    };
    // 发送风险鉴定
    $scope.person.questionnaire = {};
    $scope.sendAssessment = function () {
      if (!checkQuestionaire()) {
        return;
      }
      wdAccount.submitQuestionnaire($scope.person.questionnaire).then(function (msg) {
        console.log(msg);
        $scope.realInfo.step = 3;
      }, function () {
      });
    };
    // 发送手机验证码, 如果是在找回密码的阶段
    // 发生验证码， isexistphone: true
    $scope.verifyPhone = function (isExistPhone) {
      verifyPhone(isExistPhone).then(function (msg) {
        if (!msg.is_succ) {
          $scope.countDownText = msg.error_msg;
        }
      }, function () {
      });
      coutDown();
    };
    // 验证手机验证码是否正确
    $scope.verifyCode = function () {
      wdAccount.verifyCode({
        phone: $scope.resetInfo.phone,
        verify_code: $scope.resetInfo.verifyCode
      }).then(function (msg) {
        if (msg.is_succ) {
          $scope.resetInfo.step = 2;
        } else {
          $scope.resetInfo.error_msg = msg.error_msg;
        }
      });
    };
    // 重置密码
    $scope.resetPassword = function () {
      wdAccount.resetPassword({
        code: $scope.resetInfo.verifyCode,
        new_pwd: $scope.resetInfo.password
      }).then(function (msg) {
        if (msg.is_succ) {
          $scope.resetInfo.step = 3;
        }
      });
    };
    $scope.keyDown = function (e) {
      if (e.keyCode !== 13) {
        return;
      }
      switch ($scope.registType) {
      case '/virtual':
        $scope.registVirtual();
        break;
      case '/real':
        $scope.registVirtual();
        break;
      case '/virtual2real':
        $scope.setRealInfo();
        break;
      default:
        $scope.registVirtual();
        break;
      }
    };
    function checkQuestionaire() {
      var questionnaire = $scope.person.questionnaire;
      console.log($scope.person.questionnaire);
      if (questionnaire.current_situation === undefined) {
        $scope.person.questionnaire.error_msg = '\u8bf7\u9009\u62e9\u4f60\u7684\u5c31\u4e1a\u72b6\u51b5';
        return false;
      }
      if (questionnaire.yearly_income === undefined) {
        $scope.person.questionnaire.error_msg = '\u8bf7\u9009\u62e9\u4f60\u7684\u5e74\u6536\u5165';
        return false;
      }
      if (questionnaire.investing_experience === undefined) {
        $scope.person.questionnaire.error_msg = '\u8bf7\u9009\u62e9\u4f60\u7684\u6295\u8d44\u5916\u6c47\u7ecf\u9a8c';
        return false;
      }
      return true;
    }
    function confirmPassword() {
      if ($scope.signIn.password === $scope.signIn.passwordConfirm) {
        return true;
      }
      var $focusTip = $('[focus-tip-type="passwordconfirm"]');
      var $focusTipTextWrpper = $('p', $focusTip);
      $focusTipTextWrpper.show();
      $focusTipTextWrpper.text('\u4e24\u6b21\u8f93\u5165\u5bc6\u7801\u4e0d\u4e00\u81f4');
      $focusTip.parent().addClass('has-error');
      return false;
    }
    function validateInput() {
      var $validateInput = $('#tigerwitRegister [data-validate]:visible');
      var valideAll = true;
      $validateInput.each(function (index, element) {
        var $elem = $(element);
        var validatorType = $elem.attr('data-validate');
        var validatorVal = $elem.val();
        var validateResObj = wdValidator.validate(validatorType, validatorVal);
        if (!validateResObj.validate_result) {
          var focusTip = $elem.attr('focus-tip');
          if (focusTip) {
            var $focusTip = $('[focus-tip-type="' + focusTip + '"]');
            var $focusTipTextWrpper = $('p', $focusTip);
            $focusTip.show();
            $focusTipTextWrpper.text(validateResObj.validate_reason);
          }
          $elem.closest('.form-group').addClass('has-error');
        }
        valideAll = valideAll && validateResObj.validate_result;
      });
      return valideAll;
    }
    var countDownTimer;
    function coutDown() {
      $scope.isDisable = 'disabled';
      $scope.countDownNum = 30;
      $scope.countDownText = '\u79d2\u91cd\u65b0\u83b7\u53d6';
      countDownTimer = $interval(function () {
        if ($scope.countDownNum === 0) {
          $interval.cancel(countDownTimer);
          $scope.isDisable = '';
          $scope.countDownText = '\u91cd\u65b0\u83b7\u53d6';
          $scope.countDownNum = '';
        } else {
          $scope.countDownNum--;
        }
      }, 1000, 0);
    }
    $scope.$on('wd-upload-form-success', function (e, data) {
      switch (data.face) {
      case 'front':
        $scope.$apply(function () {
          $scope.person.uiFrontImageError = '';
          $scope.person.uiFrontImageStatus = 2;
        });
        break;
      case 'back':
        $scope.$apply(function () {
          $scope.person.uiBackImageError = '';
          $scope.person.uiBackImageStatus = 2;
        });
        break;
      }
    });
    $scope.$on('wd-upload-form-start', function (e, data) {
      switch (data.face) {
      case 'front':
        $scope.$apply(function () {
          $scope.person.uiFrontImageError = '';
          $scope.person.uiFrontImageStatus = 1;
        });
        break;
      case 'back':
        $scope.$apply(function () {
          $scope.person.uiBackImageError = '';
          $scope.person.uiBackImageStatus = 1;
        });
        break;
      }
    });
    $scope.$on('wd-upload-form-error', function (e, data) {
      switch (data.face) {
      case 'front':
        $scope.$apply(function () {
          $scope.person.uiFrontImageError = '\u4e0a\u4f20\u5931\u8d25';
          $scope.person.uiFrontImageStatus = 3;
        });
        break;
      case 'back':
        $scope.$apply(function () {
          $scope.person.uiBackImageError = '\u4e0a\u4f20\u5931\u8d25';
          $scope.person.uiBackImageStatus = 3;
        });
        break;
      }
    });
    function setInfo() {
      return wdAccount.setInfo($scope.person);
    }
    function verifyPhone(isExistPhone) {
      return wdAccount.verifyPhone({
        phone: $scope.signIn.phone,
        exists: isExistPhone
      });
    }
    $scope.error_msg = '';
    function register() {
      wdAccount.register($scope.signIn).then(function (data) {
        if (!data.is_succ) {
          $scope.error_msg = data.error_msg;
          return;
        }
        if (searchObj.type === 'real') {
          $location.search('type', 'virtual2real');
        } else {
          $location.path('regist_succ');
        }
      }, function (data) {
        console.log(data);
      });
    }
  }
]);
'use strict';
angular.module('tigerwitApp').controller('loginCtrl', [
  '$scope',
  'wdAccount',
  '$timeout',
  '$location',
  'wdStorage',
  function ($scope, wdAccount, $timeout, $location, wdStorage) {
    $scope.login = {
      phone: '',
      password: '',
      uiLoginError: ''
    };
    // 进入时的逻辑
    // wdAccount.check().then(function(data) {
    //     if (data.is_succ) {
    //         $location.path('/index');
    //     } else {
    //         $scope.loading = false;
    //     }
    // }, function(data) {
    //     $scope.loading = false;
    // });
    $scope.loginFun = function () {
      $scope.login.uiLoginError = '';
      wdAccount.login($scope.login).then(function (data) {
        if (data.is_succ) {
          $location.path('/register');
        } else {
          $scope.login.uiLoginError = data.error_msg;
        }
      }, function (data) {
        console.log(data);
        $scope.login.uiLoginError = '\u767b\u5f55\u5931\u8d25';
      });
    };
    $scope.keyDown = function (e) {
      if (e.keyCode === 13) {
        $scope.loginFun();
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').controller('moneyCtrl', [
  '$scope',
  'wdAccount',
  '$timeout',
  '$location',
  'wdAccountMoney',
  function ($scope, wdAccount, $timeout, $location, wdAccountMoney) {
    var equitySocket;
    $scope.user = {
      money: {
        available: '0.00',
        recharge: '1.00',
        uiRecharge: false
      }
    };
    $scope.logout = function () {
      wdAccount.logout().then(function (data) {
        if (data.is_succ) {
          $location.path('/index');
        }
      }, function () {
      });
    };
    wdAccount.check().then(function (data) {
      if (data.is_succ) {
        $scope.loading = false;
        getInfo();
      } else {
        $location.path('/index');
      }
    }, function () {
      $location.path('/index');
    });
    equitySocket = wdAccountMoney.equitySocket();
    equitySocket.onmessage = function (e) {
      var data = JSON.parse(e.data);
      console.log(data);
    };
    function getInfo() {
      wdAccount.getInfo().then(function (data) {
        console.log(data);
        $scope.user.money.available = data.money.available;
      });
    }
    // 金额要增加两位小数
    $scope.pay = function () {
      var num = Number($scope.user.money.recharge);
      if (String(typeof num).toLocaleLowerCase() === 'number') {
        wdAccountMoney.pay(Number(num).toFixed(2));
      }
    };
  }
]);
'use strict';
angular.module('tigerwitApp').factory('wdAccount', [
  '$rootScope',
  '$http',
  'wdStorage',
  function ($rootScope, $http, wdStorage) {
    return {
      check: function () {
        return $http.get('/check');
      },
      verifyPhone: function (params) {
        return $http.get('/verify', { params: params });
      },
      verifyCode: function (opts) {
        return $http.post('/verifycode', opts);
      },
      getRealInfoStep: function () {
        return $http.get('/get_info_progress', { params: { type: 'ReliableInformation' } });
      },
      submitQuestionnaire: function (opts) {
        return $http.post('/questionnaire', opts);
      },
      resetPassword: function (opts) {
        return $http.post('/change_password', opts);
      },
      register: function (opts) {
        return $http.post('/register', opts);
      },
      login: function (opts) {
        wdStorage.removeAll();
        var promise = $http.post('/login', opts);
        promise.then(function (data) {
          if (data.is_set_info) {
            wdStorage.item('is_set_info', data.is_set_info);
          }
          if (data.is_set_id_pic) {
            wdStorage.item('is_set_id_pic', data.is_set_id_pic);
          }
        });
        return promise;
      },
      logout: function () {
        wdStorage.removeAll();
        return $http.get('/logout');
      },
      setInfo: function (opts) {
        return $http.post('/set_info', opts);
      },
      getInfo: function () {
        return $http.get('/get_info');
      }
    };  // 结束
  }
]);
'use strict';
angular.module('tigerwitApp').factory('wdAccountMoney', [
  '$window',
  '$location',
  'wdConfig',
  '$http',
  function ($window, $location, wdConfig, $http) {
    var equitySocketUrl = wdConfig.webSocketUrl + '/equity';
    console.log(equitySocketUrl);
    // 当前接口的 socket 对象
    var equitySocket;
    return {
      equitySocket: function () {
        if (equitySocket) {
          return equitySocket;
        } else {
          equitySocket = new WebSocket(equitySocketUrl);
          return equitySocket;
        }
      },
      pay: function (money) {
        $window.open(wdConfig.apiUrl + '/pay?amount=' + money);
      }
    };  // 结束
  }
]);