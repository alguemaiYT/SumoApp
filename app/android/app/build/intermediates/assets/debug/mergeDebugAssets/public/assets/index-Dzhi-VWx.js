var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
/*! Capacitor: https://capacitorjs.com/ - MIT License */
const createCapacitorPlatforms = (win) => {
  const defaultPlatformMap = /* @__PURE__ */ new Map();
  defaultPlatformMap.set("web", { name: "web" });
  const capPlatforms = win.CapacitorPlatforms || {
    currentPlatform: { name: "web" },
    platforms: defaultPlatformMap
  };
  const addPlatform = (name, platform) => {
    capPlatforms.platforms.set(name, platform);
  };
  const setPlatform = (name) => {
    if (capPlatforms.platforms.has(name)) {
      capPlatforms.currentPlatform = capPlatforms.platforms.get(name);
    }
  };
  capPlatforms.addPlatform = addPlatform;
  capPlatforms.setPlatform = setPlatform;
  return capPlatforms;
};
const initPlatforms = (win) => win.CapacitorPlatforms = createCapacitorPlatforms(win);
const CapacitorPlatforms = /* @__PURE__ */ initPlatforms(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
CapacitorPlatforms.addPlatform;
CapacitorPlatforms.setPlatform;
var ExceptionCode;
(function(ExceptionCode2) {
  ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
  ExceptionCode2["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
class CapacitorException extends Error {
  constructor(message, code, data) {
    super(message);
    this.message = message;
    this.code = code;
    this.data = data;
  }
}
const getPlatformId = (win) => {
  var _a, _b;
  if (win === null || win === void 0 ? void 0 : win.androidBridge) {
    return "android";
  } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
    return "ios";
  } else {
    return "web";
  }
};
const createCapacitor = (win) => {
  var _a, _b, _c, _d, _e;
  const capCustomPlatform = win.CapacitorCustomPlatform || null;
  const cap = win.Capacitor || {};
  const Plugins = cap.Plugins = cap.Plugins || {};
  const capPlatforms = win.CapacitorPlatforms;
  const defaultGetPlatform = () => {
    return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
  };
  const getPlatform = ((_a = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _a === void 0 ? void 0 : _a.getPlatform) || defaultGetPlatform;
  const defaultIsNativePlatform = () => getPlatform() !== "web";
  const isNativePlatform = ((_b = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _b === void 0 ? void 0 : _b.isNativePlatform) || defaultIsNativePlatform;
  const defaultIsPluginAvailable = (pluginName) => {
    const plugin = registeredPlugins.get(pluginName);
    if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
      return true;
    }
    if (getPluginHeader(pluginName)) {
      return true;
    }
    return false;
  };
  const isPluginAvailable = ((_c = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _c === void 0 ? void 0 : _c.isPluginAvailable) || defaultIsPluginAvailable;
  const defaultGetPluginHeader = (pluginName) => {
    var _a2;
    return (_a2 = cap.PluginHeaders) === null || _a2 === void 0 ? void 0 : _a2.find((h) => h.name === pluginName);
  };
  const getPluginHeader = ((_d = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _d === void 0 ? void 0 : _d.getPluginHeader) || defaultGetPluginHeader;
  const handleError = (err) => win.console.error(err);
  const pluginMethodNoop = (_target, prop, pluginName) => {
    return Promise.reject(`${pluginName} does not have an implementation of "${prop}".`);
  };
  const registeredPlugins = /* @__PURE__ */ new Map();
  const defaultRegisterPlugin = (pluginName, jsImplementations = {}) => {
    const registeredPlugin = registeredPlugins.get(pluginName);
    if (registeredPlugin) {
      console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
      return registeredPlugin.proxy;
    }
    const platform = getPlatform();
    const pluginHeader = getPluginHeader(pluginName);
    let jsImplementation;
    const loadPluginImplementation = async () => {
      if (!jsImplementation && platform in jsImplementations) {
        jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
      } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
        jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
      }
      return jsImplementation;
    };
    const createPluginMethod = (impl, prop) => {
      var _a2, _b2;
      if (pluginHeader) {
        const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
        if (methodHeader) {
          if (methodHeader.rtype === "promise") {
            return (options) => cap.nativePromise(pluginName, prop.toString(), options);
          } else {
            return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
          }
        } else if (impl) {
          return (_a2 = impl[prop]) === null || _a2 === void 0 ? void 0 : _a2.bind(impl);
        }
      } else if (impl) {
        return (_b2 = impl[prop]) === null || _b2 === void 0 ? void 0 : _b2.bind(impl);
      } else {
        throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
      }
    };
    const createPluginMethodWrapper = (prop) => {
      let remove;
      const wrapper = (...args) => {
        const p = loadPluginImplementation().then((impl) => {
          const fn = createPluginMethod(impl, prop);
          if (fn) {
            const p2 = fn(...args);
            remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
            return p2;
          } else {
            throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        });
        if (prop === "addListener") {
          p.remove = async () => remove();
        }
        return p;
      };
      wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
      Object.defineProperty(wrapper, "name", {
        value: prop,
        writable: false,
        configurable: false
      });
      return wrapper;
    };
    const addListener = createPluginMethodWrapper("addListener");
    const removeListener = createPluginMethodWrapper("removeListener");
    const addListenerNative = (eventName, callback) => {
      const call = addListener({ eventName }, callback);
      const remove = async () => {
        const callbackId = await call;
        removeListener({
          eventName,
          callbackId
        }, callback);
      };
      const p = new Promise((resolve) => call.then(() => resolve({ remove })));
      p.remove = async () => {
        console.warn(`Using addListener() without 'await' is deprecated.`);
        await remove();
      };
      return p;
    };
    const proxy = new Proxy({}, {
      get(_, prop) {
        switch (prop) {
          case "$$typeof":
            return void 0;
          case "toJSON":
            return () => ({});
          case "addListener":
            return pluginHeader ? addListenerNative : addListener;
          case "removeListener":
            return removeListener;
          default:
            return createPluginMethodWrapper(prop);
        }
      }
    });
    Plugins[pluginName] = proxy;
    registeredPlugins.set(pluginName, {
      name: pluginName,
      proxy,
      platforms: /* @__PURE__ */ new Set([
        ...Object.keys(jsImplementations),
        ...pluginHeader ? [platform] : []
      ])
    });
    return proxy;
  };
  const registerPlugin2 = ((_e = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _e === void 0 ? void 0 : _e.registerPlugin) || defaultRegisterPlugin;
  if (!cap.convertFileSrc) {
    cap.convertFileSrc = (filePath) => filePath;
  }
  cap.getPlatform = getPlatform;
  cap.handleError = handleError;
  cap.isNativePlatform = isNativePlatform;
  cap.isPluginAvailable = isPluginAvailable;
  cap.pluginMethodNoop = pluginMethodNoop;
  cap.registerPlugin = registerPlugin2;
  cap.Exception = CapacitorException;
  cap.DEBUG = !!cap.DEBUG;
  cap.isLoggingEnabled = !!cap.isLoggingEnabled;
  cap.platform = cap.getPlatform();
  cap.isNative = cap.isNativePlatform();
  return cap;
};
const initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
const Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
const registerPlugin = Capacitor.registerPlugin;
Capacitor.Plugins;
class WebPlugin {
  constructor(config) {
    this.listeners = {};
    this.windowListeners = {};
    if (config) {
      console.warn(`Capacitor WebPlugin "${config.name}" config object was deprecated in v3 and will be removed in v4.`);
      this.config = config;
    }
  }
  addListener(eventName, listenerFunc) {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listenerFunc);
    const windowListener = this.windowListeners[eventName];
    if (windowListener && !windowListener.registered) {
      this.addWindowListener(windowListener);
    }
    const remove = async () => this.removeListener(eventName, listenerFunc);
    const p = Promise.resolve({ remove });
    Object.defineProperty(p, "remove", {
      value: async () => {
        console.warn(`Using addListener() without 'await' is deprecated.`);
        await remove();
      }
    });
    return p;
  }
  async removeAllListeners() {
    this.listeners = {};
    for (const listener in this.windowListeners) {
      this.removeWindowListener(this.windowListeners[listener]);
    }
    this.windowListeners = {};
  }
  notifyListeners(eventName, data) {
    const listeners = this.listeners[eventName];
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }
  hasListeners(eventName) {
    return !!this.listeners[eventName].length;
  }
  registerWindowListener(windowEventName, pluginEventName) {
    this.windowListeners[pluginEventName] = {
      registered: false,
      windowEventName,
      pluginEventName,
      handler: (event) => {
        this.notifyListeners(pluginEventName, event);
      }
    };
  }
  unimplemented(msg = "not implemented") {
    return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
  }
  unavailable(msg = "not available") {
    return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
  }
  async removeListener(eventName, listenerFunc) {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listenerFunc);
    this.listeners[eventName].splice(index, 1);
    if (!this.listeners[eventName].length) {
      this.removeWindowListener(this.windowListeners[eventName]);
    }
  }
  addWindowListener(handle) {
    window.addEventListener(handle.windowEventName, handle.handler);
    handle.registered = true;
  }
  removeWindowListener(handle) {
    if (!handle) {
      return;
    }
    window.removeEventListener(handle.windowEventName, handle.handler);
    handle.registered = false;
  }
}
const encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
const decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
class CapacitorCookiesPluginWeb extends WebPlugin {
  async getCookies() {
    const cookies = document.cookie;
    const cookieMap = {};
    cookies.split(";").forEach((cookie) => {
      if (cookie.length <= 0)
        return;
      let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
      key = decode(key).trim();
      value = decode(value).trim();
      cookieMap[key] = value;
    });
    return cookieMap;
  }
  async setCookie(options) {
    try {
      const encodedKey = encode(options.key);
      const encodedValue = encode(options.value);
      const expires = `; expires=${(options.expires || "").replace("expires=", "")}`;
      const path = (options.path || "/").replace("path=", "");
      const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
      document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async deleteCookie(options) {
    try {
      document.cookie = `${options.key}=; Max-Age=0`;
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async clearCookies() {
    try {
      const cookies = document.cookie.split(";") || [];
      for (const cookie of cookies) {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
  async clearAllCookies() {
    try {
      await this.clearCookies();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
registerPlugin("CapacitorCookies", {
  web: () => new CapacitorCookiesPluginWeb()
});
const readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const base64String = reader.result;
    resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
  };
  reader.onerror = (error) => reject(error);
  reader.readAsDataURL(blob);
});
const normalizeHttpHeaders = (headers = {}) => {
  const originalKeys = Object.keys(headers);
  const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
  const normalized = loweredKeys.reduce((acc, key, index) => {
    acc[key] = headers[originalKeys[index]];
    return acc;
  }, {});
  return normalized;
};
const buildUrlParams = (params, shouldEncode = true) => {
  if (!params)
    return null;
  const output = Object.entries(params).reduce((accumulator, entry) => {
    const [key, value] = entry;
    let encodedValue;
    let item;
    if (Array.isArray(value)) {
      item = "";
      value.forEach((str) => {
        encodedValue = shouldEncode ? encodeURIComponent(str) : str;
        item += `${key}=${encodedValue}&`;
      });
      item.slice(0, -1);
    } else {
      encodedValue = shouldEncode ? encodeURIComponent(value) : value;
      item = `${key}=${encodedValue}`;
    }
    return `${accumulator}&${item}`;
  }, "");
  return output.substr(1);
};
const buildRequestInit = (options, extra = {}) => {
  const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
  const headers = normalizeHttpHeaders(options.headers);
  const type = headers["content-type"] || "";
  if (typeof options.data === "string") {
    output.body = options.data;
  } else if (type.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.data || {})) {
      params.set(key, value);
    }
    output.body = params.toString();
  } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
    const form = new FormData();
    if (options.data instanceof FormData) {
      options.data.forEach((value, key) => {
        form.append(key, value);
      });
    } else {
      for (const key of Object.keys(options.data)) {
        form.append(key, options.data[key]);
      }
    }
    output.body = form;
    const headers2 = new Headers(output.headers);
    headers2.delete("content-type");
    output.headers = headers2;
  } else if (type.includes("application/json") || typeof options.data === "object") {
    output.body = JSON.stringify(options.data);
  }
  return output;
};
class CapacitorHttpPluginWeb extends WebPlugin {
  /**
   * Perform an Http request given a set of options
   * @param options Options to build the HTTP request
   */
  async request(options) {
    const requestInit = buildRequestInit(options, options.webFetchExtra);
    const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
    const url = urlParams ? `${options.url}?${urlParams}` : options.url;
    const response = await fetch(url, requestInit);
    const contentType = response.headers.get("content-type") || "";
    let { responseType = "text" } = response.ok ? options : {};
    if (contentType.includes("application/json")) {
      responseType = "json";
    }
    let data;
    let blob;
    switch (responseType) {
      case "arraybuffer":
      case "blob":
        blob = await response.blob();
        data = await readBlobAsBase64(blob);
        break;
      case "json":
        data = await response.json();
        break;
      case "document":
      case "text":
      default:
        data = await response.text();
    }
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      data,
      headers,
      status: response.status,
      url: response.url
    };
  }
  /**
   * Perform an Http GET request given a set of options
   * @param options Options to build the HTTP request
   */
  async get(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
  }
  /**
   * Perform an Http POST request given a set of options
   * @param options Options to build the HTTP request
   */
  async post(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
  }
  /**
   * Perform an Http PUT request given a set of options
   * @param options Options to build the HTTP request
   */
  async put(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
  }
  /**
   * Perform an Http PATCH request given a set of options
   * @param options Options to build the HTTP request
   */
  async patch(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
  }
  /**
   * Perform an Http DELETE request given a set of options
   * @param options Options to build the HTTP request
   */
  async delete(options) {
    return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
  }
}
registerPlugin("CapacitorHttp", {
  web: () => new CapacitorHttpPluginWeb()
});
const SplashScreen = registerPlugin("SplashScreen", {
  web: () => __vitePreload(() => import("./web-qaKhFwY1.js"), true ? [] : void 0).then((m) => new m.SplashScreenWeb())
});
var Style;
(function(Style2) {
  Style2["Dark"] = "DARK";
  Style2["Light"] = "LIGHT";
  Style2["Default"] = "DEFAULT";
})(Style || (Style = {}));
var Animation;
(function(Animation2) {
  Animation2["None"] = "NONE";
  Animation2["Slide"] = "SLIDE";
  Animation2["Fade"] = "FADE";
})(Animation || (Animation = {}));
const StatusBar = registerPlugin("StatusBar");
const KeepAwake = registerPlugin("KeepAwake", {
  web: () => __vitePreload(() => import("./web-D5Ontjqf.js"), true ? [] : void 0).then((m) => new m.KeepAwakeWeb())
});
const Preferences = registerPlugin("Preferences", {
  web: () => __vitePreload(() => import("./web-CdN9r1GH.js"), true ? [] : void 0).then((m) => new m.PreferencesWeb())
});
const BluetoothClassic = registerPlugin("BluetoothClassic");
class BLEService {
  constructor() {
    __publicField(this, "listeners", /* @__PURE__ */ new Map());
    __publicField(this, "connectedDevice", null);
    __publicField(this, "scanInProgress", false);
    __publicField(this, "isConnected", false);
    __publicField(this, "ROBOT_NAME", "Madinboo");
    this.initBluetooth();
  }
  async initBluetooth() {
    console.log("BLEService: Initializing Bluetooth...");
    try {
      const { available } = await BluetoothClassic.isAvailable();
      console.log("BLEService: Bluetooth availability:", available);
      if (!available) {
        console.error("BLEService: Bluetooth not available");
        return;
      }
      await BluetoothClassic.removeAllListeners();
      await BluetoothClassic.addListener("deviceFound", (device) => {
        var _a;
        console.log("BLEService: Device found event:", device.name, device.address);
        if ((_a = device.name) == null ? void 0 : _a.includes(this.ROBOT_NAME)) {
          console.log("BLEService: Target robot found! Auto-connecting...");
          this.emit("deviceFound", device);
          this.connect(device);
        }
      });
      await BluetoothClassic.addListener("connected", (device) => {
        console.log("BLEService: Connected successfully to:", device.name);
        this.connectedDevice = device;
        this.isConnected = true;
        this.emit("connected", device);
        Preferences.set({
          key: "lastDevice",
          value: JSON.stringify(device)
        });
      });
      await BluetoothClassic.addListener("scanningState", (state) => {
        console.log("BLEService: Scanning state changed:", state.scanning);
        this.scanInProgress = state.scanning;
        this.emit("scanningState", state);
      });
      console.log("BLEService: Listeners attached and ready");
      this.emit("bleReady", {});
    } catch (err) {
      console.error("BLEService: Init error:", err);
      this.emit("error", { message: "Falha ao inicializar Bluetooth" });
    }
  }
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(callback);
  }
  off(event, callback) {
    var _a;
    (_a = this.listeners.get(event)) == null ? void 0 : _a.delete(callback);
  }
  emit(event, data) {
    var _a;
    (_a = this.listeners.get(event)) == null ? void 0 : _a.forEach((cb) => cb(data));
  }
  async requestPermissions() {
    console.log("BLEService: Checking permissions...");
    try {
      const status = await BluetoothClassic.checkPermissions();
      console.log("BLEService: Permission status:", status);
      if (status.bluetooth === "granted" && status.location === "granted") {
        return true;
      }
      console.log("BLEService: Requesting permissions...");
      const requestResult = await BluetoothClassic.requestPermissions();
      console.log("BLEService: Request result:", requestResult);
      return requestResult.bluetooth === "granted" && requestResult.location === "granted";
    } catch (err) {
      console.error("BLEService: Permission logic error:", err);
      return false;
    }
  }
  async startAutoDiscovery() {
    if (this.scanInProgress) {
      await this.stopScan();
    }
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        this.emit("error", { message: "Permissões negadas. O app precisa de Bluetooth e Localização." });
        return;
      }
      await BluetoothClassic.startDiscovery();
    } catch (err) {
      console.error("Scan error:", err);
      this.emit("error", { message: "Erro ao iniciar busca" });
    }
  }
  async stopScan() {
    try {
      await BluetoothClassic.stopDiscovery();
    } catch (err) {
      console.error("Stop scan error:", err);
    }
  }
  async connect(device) {
    try {
      this.showConnectingStatus();
      await BluetoothClassic.connect({ address: device.address });
    } catch (err) {
      console.error("Connect error:", err);
      this.emit("error", { message: "Falha ao conectar" });
    }
  }
  showConnectingStatus() {
  }
  async disconnect() {
    try {
      await BluetoothClassic.disconnect();
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }
  async sendCommand(command) {
    if (!this.isConnected) return;
    try {
      await BluetoothClassic.sendCommand({ command: command + "\n" });
    } catch (err) {
      console.error("Send error:", err);
    }
  }
  async tryAutoReconnect() {
    try {
      const { value } = await Preferences.get({ key: "lastDevice" });
      if (value) {
        const device = JSON.parse(value);
        console.log("Attempting auto-reconnect to:", device.address);
        await this.connect(device);
      }
    } catch (err) {
      console.error("Auto-reconnect error:", err);
    }
  }
  isConnectedToDevice() {
    return this.isConnected;
  }
  isScanning() {
    return this.scanInProgress;
  }
  getConnectedDevice() {
    return this.connectedDevice;
  }
}
const bleService = new BLEService();
var ImpactStyle;
(function(ImpactStyle2) {
  ImpactStyle2["Heavy"] = "HEAVY";
  ImpactStyle2["Medium"] = "MEDIUM";
  ImpactStyle2["Light"] = "LIGHT";
})(ImpactStyle || (ImpactStyle = {}));
var NotificationType;
(function(NotificationType2) {
  NotificationType2["Success"] = "SUCCESS";
  NotificationType2["Warning"] = "WARNING";
  NotificationType2["Error"] = "ERROR";
})(NotificationType || (NotificationType = {}));
const Haptics = registerPlugin("Haptics", {
  web: () => __vitePreload(() => import("./web-SURFh_Qo.js"), true ? [] : void 0).then((m) => new m.HapticsWeb())
});
class BluetoothAdapter {
  constructor() {
    __publicField(this, "statusElement", null);
    __publicField(this, "commandButtons", null);
    this.attachListeners();
    this.updateUI();
  }
  attachListeners() {
    bleService.on("connected", async (device) => {
      console.log("Connected to:", device);
      await Haptics.vibrate({ duration: 200 });
      this.updateUI();
      this.showStatus(`Conectado: ${device.name}`, "success");
      if (typeof window.onNativeBluetoothConnected === "function") {
        window.onNativeBluetoothConnected(device);
      }
    });
    bleService.on("disconnected", () => {
      console.log("Disconnected");
      this.updateUI();
      this.showStatus("Desconectado", "default");
      if (typeof window.onNativeBluetoothDisconnected === "function") {
        window.onNativeBluetoothDisconnected();
      }
    });
    bleService.on("scanningState", (state) => {
      this.updateUI();
      if (state.scanning) {
        this.showStatus("Procurando robô...", "scanning");
      }
    });
    bleService.on("deviceFound", async (device) => {
      this.showStatus(`Robô encontrado: ${device.name}`, "success");
      await Haptics.vibrate({ duration: 150 });
    });
  }
  async handleBluetoothButtonClick() {
    console.log("Bluetooth button clicked");
    await bleService.requestPermissions();
    if (bleService.isConnectedToDevice()) {
      console.log("Disconnecting...");
      await bleService.disconnect();
    } else {
      console.log("Starting auto-discovery...");
      await Haptics.vibrate({ duration: 75 });
      this.updateUI();
      await bleService.startAutoDiscovery();
    }
    this.updateUI();
  }
  async sendCommand(cmd, value) {
    const command = value !== void 0 ? `${cmd},${value}*` : `${cmd}*`;
    await bleService.sendCommand(command);
    await Haptics.vibrate({ duration: 30 });
  }
  showStatus(message, status) {
    const statusEl = document.getElementById("status-message");
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${status}`;
    }
  }
  handleTelemetry(data) {
    if (data.startsWith("dados:")) {
      const values = data.substring(6).split("|");
      this.updateTelemetryUI(values);
    }
  }
  updateTelemetryUI(values) {
    const battery = document.getElementById("battery-level");
    if (battery && values[5]) {
      battery.textContent = values[5] + "V";
    }
  }
  updateUI() {
    const connectBtn = document.getElementById("connect-btn");
    const connectLabel = document.getElementById("connectLabel");
    if (connectBtn && connectLabel) {
      const isConnected = bleService.isConnectedToDevice();
      connectLabel.textContent = isConnected ? "Desconectar" : "Conectar Bluetooth";
      connectBtn.classList.toggle("connecting", bleService.isScanning());
      connectBtn.classList.toggle("connected", isConnected);
    } else {
      console.warn("UI elements for Bluetooth not found");
    }
  }
  async init() {
    await bleService.tryAutoReconnect();
    this.updateUI();
  }
}
const bluetoothAdapter = new BluetoothAdapter();
window.bluetoothAdapter = bluetoothAdapter;
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await StatusBar.setBackgroundColor({ color: "#080C14" });
    StatusBar.setStyle({ style: "light" });
    await KeepAwake.keepAwake().catch(() => console.warn("KeepAwake not supported"));
    await bluetoothAdapter.init();
    setTimeout(() => {
      SplashScreen.hide().catch(() => {
      });
    }, 1500);
  } catch (err) {
    console.error("Init error:", err);
  }
});
export {
  ImpactStyle as I,
  NotificationType as N,
  WebPlugin as W
};
