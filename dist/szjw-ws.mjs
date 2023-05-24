var W = Object.defineProperty;
var B = (n, e, t) => e in n ? W(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var _ = (n, e, t) => (B(n, typeof e != "symbol" ? e + "" : e, t), t);
var y = (n, e, t) => new Promise((s, i) => {
  var o = (a) => {
    try {
      r(t.next(a));
    } catch (d) {
      i(d);
    }
  }, c = (a) => {
    try {
      r(t.throw(a));
    } catch (d) {
      i(d);
    }
  }, r = (a) => a.done ? s(a.value) : Promise.resolve(a.value).then(o, c);
  r((t = t.apply(n, e)).next());
});
import { BehaviorSubject as H, filter as k, Subject as C, Observable as L, take as U, share as V, firstValueFrom as A, from as R, timeout as x, interval as F } from "rxjs";
import { onUnmounted as P } from "vue";
import { createDecorator as M, getProtoMetadata as G, injectService as j } from "vue3-oop";
const f = {
  // LINEFEED byte (octet 10)
  LF: `
`,
  // NULL byte (octet 0)
  NULL: "\0"
};
class S {
  /**
   * Frame constructor. `command`, `headers` and `body` are available as properties.
   *
   * @internal
   */
  constructor(e) {
    const { command: t, headers: s, body: i, binaryBody: o, escapeHeaderValues: c, skipContentLengthHeader: r } = e;
    this.command = t, this.headers = Object.assign({}, s || {}), o ? (this._binaryBody = o, this.isBinaryBody = !0) : (this._body = i || "", this.isBinaryBody = !1), this.escapeHeaderValues = c || !1, this.skipContentLengthHeader = r || !1;
  }
  /**
   * body of the frame
   */
  get body() {
    return !this._body && this.isBinaryBody && (this._body = new TextDecoder().decode(this._binaryBody)), this._body || "";
  }
  /**
   * body as Uint8Array
   */
  get binaryBody() {
    return !this._binaryBody && !this.isBinaryBody && (this._binaryBody = new TextEncoder().encode(this._body)), this._binaryBody;
  }
  /**
   * deserialize a STOMP Frame from raw data.
   *
   * @internal
   */
  static fromRawFrame(e, t) {
    const s = {}, i = (o) => o.replace(/^\s+|\s+$/g, "");
    for (const o of e.headers.reverse()) {
      o.indexOf(":");
      const c = i(o[0]);
      let r = i(o[1]);
      t && e.command !== "CONNECT" && e.command !== "CONNECTED" && (r = S.hdrValueUnEscape(r)), s[c] = r;
    }
    return new S({
      command: e.command,
      headers: s,
      binaryBody: e.binaryBody,
      escapeHeaderValues: t
    });
  }
  /**
   * @internal
   */
  toString() {
    return this.serializeCmdAndHeaders();
  }
  /**
   * serialize this Frame in a format suitable to be passed to WebSocket.
   * If the body is string the output will be string.
   * If the body is binary (i.e. of type Unit8Array) it will be serialized to ArrayBuffer.
   *
   * @internal
   */
  serialize() {
    const e = this.serializeCmdAndHeaders();
    return this.isBinaryBody ? S.toUnit8Array(e, this._binaryBody).buffer : e + this._body + f.NULL;
  }
  serializeCmdAndHeaders() {
    const e = [this.command];
    this.skipContentLengthHeader && delete this.headers["content-length"];
    for (const t of Object.keys(this.headers || {})) {
      const s = this.headers[t];
      this.escapeHeaderValues && this.command !== "CONNECT" && this.command !== "CONNECTED" ? e.push(`${t}:${S.hdrValueEscape(`${s}`)}`) : e.push(`${t}:${s}`);
    }
    return (this.isBinaryBody || !this.isBodyEmpty() && !this.skipContentLengthHeader) && e.push(`content-length:${this.bodyLength()}`), e.join(f.LF) + f.LF + f.LF;
  }
  isBodyEmpty() {
    return this.bodyLength() === 0;
  }
  bodyLength() {
    const e = this.binaryBody;
    return e ? e.length : 0;
  }
  /**
   * Compute the size of a UTF-8 string by counting its number of bytes
   * (and not the number of characters composing the string)
   */
  static sizeOfUTF8(e) {
    return e ? new TextEncoder().encode(e).length : 0;
  }
  static toUnit8Array(e, t) {
    const s = new TextEncoder().encode(e), i = new Uint8Array([0]), o = new Uint8Array(s.length + t.length + i.length);
    return o.set(s), o.set(t, s.length), o.set(i, s.length + t.length), o;
  }
  /**
   * Serialize a STOMP frame as per STOMP standards, suitable to be sent to the STOMP broker.
   *
   * @internal
   */
  static marshall(e) {
    return new S(e).serialize();
  }
  /**
   *  Escape header values
   */
  static hdrValueEscape(e) {
    return e.replace(/\\/g, "\\\\").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/:/g, "\\c");
  }
  /**
   * UnEscape header values
   */
  static hdrValueUnEscape(e) {
    return e.replace(/\\r/g, "\r").replace(/\\n/g, `
`).replace(/\\c/g, ":").replace(/\\\\/g, "\\");
  }
}
const v = 0, E = 10, w = 13, z = 58;
class K {
  constructor(e, t) {
    this.onFrame = e, this.onIncomingPing = t, this._encoder = new TextEncoder(), this._decoder = new TextDecoder(), this._token = [], this._initState();
  }
  parseChunk(e, t = !1) {
    let s;
    if (typeof e == "string" ? s = this._encoder.encode(e) : s = new Uint8Array(e), t && s[s.length - 1] !== 0) {
      const i = new Uint8Array(s.length + 1);
      i.set(s, 0), i[s.length] = 0, s = i;
    }
    for (let i = 0; i < s.length; i++) {
      const o = s[i];
      this._onByte(o);
    }
  }
  // The following implements a simple Rec Descent Parser.
  // The grammar is simple and just one byte tells what should be the next state
  _collectFrame(e) {
    if (e !== v && e !== w) {
      if (e === E) {
        this.onIncomingPing();
        return;
      }
      this._onByte = this._collectCommand, this._reinjectByte(e);
    }
  }
  _collectCommand(e) {
    if (e !== w) {
      if (e === E) {
        this._results.command = this._consumeTokenAsUTF8(), this._onByte = this._collectHeaders;
        return;
      }
      this._consumeByte(e);
    }
  }
  _collectHeaders(e) {
    if (e !== w) {
      if (e === E) {
        this._setupCollectBody();
        return;
      }
      this._onByte = this._collectHeaderKey, this._reinjectByte(e);
    }
  }
  _reinjectByte(e) {
    this._onByte(e);
  }
  _collectHeaderKey(e) {
    if (e === z) {
      this._headerKey = this._consumeTokenAsUTF8(), this._onByte = this._collectHeaderValue;
      return;
    }
    this._consumeByte(e);
  }
  _collectHeaderValue(e) {
    if (e !== w) {
      if (e === E) {
        this._results.headers.push([
          this._headerKey,
          this._consumeTokenAsUTF8()
        ]), this._headerKey = void 0, this._onByte = this._collectHeaders;
        return;
      }
      this._consumeByte(e);
    }
  }
  _setupCollectBody() {
    const e = this._results.headers.filter((t) => t[0] === "content-length")[0];
    e ? (this._bodyBytesRemaining = parseInt(e[1], 10), this._onByte = this._collectBodyFixedSize) : this._onByte = this._collectBodyNullTerminated;
  }
  _collectBodyNullTerminated(e) {
    if (e === v) {
      this._retrievedBody();
      return;
    }
    this._consumeByte(e);
  }
  _collectBodyFixedSize(e) {
    if (this._bodyBytesRemaining-- === 0) {
      this._retrievedBody();
      return;
    }
    this._consumeByte(e);
  }
  _retrievedBody() {
    this._results.binaryBody = this._consumeTokenAsRaw();
    try {
      this.onFrame(this._results);
    } catch (e) {
      console.log("Ignoring an exception thrown by a frame handler. Original exception: ", e);
    }
    this._initState();
  }
  // Rec Descent Parser helpers
  _consumeByte(e) {
    this._token.push(e);
  }
  _consumeTokenAsUTF8() {
    return this._decoder.decode(this._consumeTokenAsRaw());
  }
  _consumeTokenAsRaw() {
    const e = new Uint8Array(this._token);
    return this._token = [], e;
  }
  _initState() {
    this._results = {
      command: void 0,
      headers: [],
      binaryBody: void 0
    }, this._token = [], this._headerKey = void 0, this._onByte = this._collectFrame;
  }
}
var p;
(function(n) {
  n[n.CONNECTING = 0] = "CONNECTING", n[n.OPEN = 1] = "OPEN", n[n.CLOSING = 2] = "CLOSING", n[n.CLOSED = 3] = "CLOSED";
})(p = p || (p = {}));
var m;
(function(n) {
  n[n.ACTIVE = 0] = "ACTIVE", n[n.DEACTIVATING = 1] = "DEACTIVATING", n[n.INACTIVE = 2] = "INACTIVE";
})(m = m || (m = {}));
class l {
  /**
   * Takes an array of versions, typical elements '1.2', '1.1', or '1.0'
   *
   * You will be creating an instance of this class if you want to override
   * supported versions to be declared during STOMP handshake.
   */
  constructor(e) {
    this.versions = e;
  }
  /**
   * Used as part of CONNECT STOMP Frame
   */
  supportedVersions() {
    return this.versions.join(",");
  }
  /**
   * Used while creating a WebSocket
   */
  protocolVersions() {
    return this.versions.map((e) => `v${e.replace(".", "")}.stomp`);
  }
}
l.V1_0 = "1.0";
l.V1_1 = "1.1";
l.V1_2 = "1.2";
l.default = new l([
  l.V1_2,
  l.V1_1,
  l.V1_0
]);
function q(n, e) {
  n.terminate = function() {
    const t = () => {
    };
    this.onerror = t, this.onmessage = t, this.onopen = t;
    const s = /* @__PURE__ */ new Date(), i = Math.random().toString().substring(2, 8), o = this.onclose;
    this.onclose = (c) => {
      const r = (/* @__PURE__ */ new Date()).getTime() - s.getTime();
      e(`Discarded socket (#${i})  closed after ${r}ms, with code/reason: ${c.code}/${c.reason}`);
    }, this.close(), o == null || o.call(n, {
      code: 4001,
      reason: `Quick discarding socket (#${i}) without waiting for the shutdown sequence.`,
      wasClean: !1
    });
  };
}
class Q {
  constructor(e, t, s) {
    this._client = e, this._webSocket = t, this._connected = !1, this._serverFrameHandlers = {
      // [CONNECTED Frame](https://stomp.github.com/stomp-specification-1.2.html#CONNECTED_Frame)
      CONNECTED: (i) => {
        this.debug(`connected to server ${i.headers.server}`), this._connected = !0, this._connectedVersion = i.headers.version, this._connectedVersion === l.V1_2 && (this._escapeHeaderValues = !0), this._setupHeartbeat(i.headers), this.onConnect(i);
      },
      // [MESSAGE Frame](https://stomp.github.com/stomp-specification-1.2.html#MESSAGE)
      MESSAGE: (i) => {
        const o = i.headers.subscription, c = this._subscriptions[o] || this.onUnhandledMessage, r = i, a = this, d = this._connectedVersion === l.V1_2 ? r.headers.ack : r.headers["message-id"];
        r.ack = (g = {}) => a.ack(d, o, g), r.nack = (g = {}) => a.nack(d, o, g), c(r);
      },
      // [RECEIPT Frame](https://stomp.github.com/stomp-specification-1.2.html#RECEIPT)
      RECEIPT: (i) => {
        const o = this._receiptWatchers[i.headers["receipt-id"]];
        o ? (o(i), delete this._receiptWatchers[i.headers["receipt-id"]]) : this.onUnhandledReceipt(i);
      },
      // [ERROR Frame](https://stomp.github.com/stomp-specification-1.2.html#ERROR)
      ERROR: (i) => {
        this.onStompError(i);
      }
    }, this._counter = 0, this._subscriptions = {}, this._receiptWatchers = {}, this._partialData = "", this._escapeHeaderValues = !1, this._lastServerActivityTS = Date.now(), this.debug = s.debug, this.stompVersions = s.stompVersions, this.connectHeaders = s.connectHeaders, this.disconnectHeaders = s.disconnectHeaders, this.heartbeatIncoming = s.heartbeatIncoming, this.heartbeatOutgoing = s.heartbeatOutgoing, this.splitLargeFrames = s.splitLargeFrames, this.maxWebSocketChunkSize = s.maxWebSocketChunkSize, this.forceBinaryWSFrames = s.forceBinaryWSFrames, this.logRawCommunication = s.logRawCommunication, this.appendMissingNULLonIncoming = s.appendMissingNULLonIncoming, this.discardWebsocketOnCommFailure = s.discardWebsocketOnCommFailure, this.onConnect = s.onConnect, this.onDisconnect = s.onDisconnect, this.onStompError = s.onStompError, this.onWebSocketClose = s.onWebSocketClose, this.onWebSocketError = s.onWebSocketError, this.onUnhandledMessage = s.onUnhandledMessage, this.onUnhandledReceipt = s.onUnhandledReceipt, this.onUnhandledFrame = s.onUnhandledFrame;
  }
  get connectedVersion() {
    return this._connectedVersion;
  }
  get connected() {
    return this._connected;
  }
  start() {
    const e = new K(
      // On Frame
      (t) => {
        const s = S.fromRawFrame(t, this._escapeHeaderValues);
        this.logRawCommunication || this.debug(`<<< ${s}`), (this._serverFrameHandlers[s.command] || this.onUnhandledFrame)(s);
      },
      // On Incoming Ping
      () => {
        this.debug("<<< PONG");
      }
    );
    this._webSocket.onmessage = (t) => {
      if (this.debug("Received data"), this._lastServerActivityTS = Date.now(), this.logRawCommunication) {
        const s = t.data instanceof ArrayBuffer ? new TextDecoder().decode(t.data) : t.data;
        this.debug(`<<< ${s}`);
      }
      e.parseChunk(t.data, this.appendMissingNULLonIncoming);
    }, this._webSocket.onclose = (t) => {
      this.debug(`Connection closed to ${this._webSocket.url}`), this._cleanUp(), this.onWebSocketClose(t);
    }, this._webSocket.onerror = (t) => {
      this.onWebSocketError(t);
    }, this._webSocket.onopen = () => {
      const t = Object.assign({}, this.connectHeaders);
      this.debug("Web Socket Opened..."), t["accept-version"] = this.stompVersions.supportedVersions(), t["heart-beat"] = [
        this.heartbeatOutgoing,
        this.heartbeatIncoming
      ].join(","), this._transmit({ command: "CONNECT", headers: t });
    };
  }
  _setupHeartbeat(e) {
    if (e.version !== l.V1_1 && e.version !== l.V1_2 || !e["heart-beat"])
      return;
    const [t, s] = e["heart-beat"].split(",").map((i) => parseInt(i, 10));
    if (this.heartbeatOutgoing !== 0 && s !== 0) {
      const i = Math.max(this.heartbeatOutgoing, s);
      this.debug(`send PING every ${i}ms`), this._pinger = setInterval(() => {
        this._webSocket.readyState === p.OPEN && (this._webSocket.send(f.LF), this.debug(">>> PING"));
      }, i);
    }
    if (this.heartbeatIncoming !== 0 && t !== 0) {
      const i = Math.max(this.heartbeatIncoming, t);
      this.debug(`check PONG every ${i}ms`), this._ponger = setInterval(() => {
        const o = Date.now() - this._lastServerActivityTS;
        o > i * 2 && (this.debug(`did not receive server activity for the last ${o}ms`), this._closeOrDiscardWebsocket());
      }, i);
    }
  }
  _closeOrDiscardWebsocket() {
    this.discardWebsocketOnCommFailure ? (this.debug("Discarding websocket, the underlying socket may linger for a while"), this.discardWebsocket()) : (this.debug("Issuing close on the websocket"), this._closeWebsocket());
  }
  forceDisconnect() {
    this._webSocket && (this._webSocket.readyState === p.CONNECTING || this._webSocket.readyState === p.OPEN) && this._closeOrDiscardWebsocket();
  }
  _closeWebsocket() {
    this._webSocket.onmessage = () => {
    }, this._webSocket.close();
  }
  discardWebsocket() {
    typeof this._webSocket.terminate != "function" && q(this._webSocket, (e) => this.debug(e)), this._webSocket.terminate();
  }
  _transmit(e) {
    const { command: t, headers: s, body: i, binaryBody: o, skipContentLengthHeader: c } = e, r = new S({
      command: t,
      headers: s,
      body: i,
      binaryBody: o,
      escapeHeaderValues: this._escapeHeaderValues,
      skipContentLengthHeader: c
    });
    let a = r.serialize();
    if (this.logRawCommunication ? this.debug(`>>> ${a}`) : this.debug(`>>> ${r}`), this.forceBinaryWSFrames && typeof a == "string" && (a = new TextEncoder().encode(a)), typeof a != "string" || !this.splitLargeFrames)
      this._webSocket.send(a);
    else {
      let d = a;
      for (; d.length > 0; ) {
        const g = d.substring(0, this.maxWebSocketChunkSize);
        d = d.substring(this.maxWebSocketChunkSize), this._webSocket.send(g), this.debug(`chunk sent = ${g.length}, remaining = ${d.length}`);
      }
    }
  }
  dispose() {
    if (this.connected)
      try {
        const e = Object.assign({}, this.disconnectHeaders);
        e.receipt || (e.receipt = `close-${this._counter++}`), this.watchForReceipt(e.receipt, (t) => {
          this._closeWebsocket(), this._cleanUp(), this.onDisconnect(t);
        }), this._transmit({ command: "DISCONNECT", headers: e });
      } catch (e) {
        this.debug(`Ignoring error during disconnect ${e}`);
      }
    else
      (this._webSocket.readyState === p.CONNECTING || this._webSocket.readyState === p.OPEN) && this._closeWebsocket();
  }
  _cleanUp() {
    this._connected = !1, this._pinger && (clearInterval(this._pinger), this._pinger = void 0), this._ponger && (clearInterval(this._ponger), this._ponger = void 0);
  }
  publish(e) {
    const { destination: t, headers: s, body: i, binaryBody: o, skipContentLengthHeader: c } = e, r = Object.assign({ destination: t }, s);
    this._transmit({
      command: "SEND",
      headers: r,
      body: i,
      binaryBody: o,
      skipContentLengthHeader: c
    });
  }
  watchForReceipt(e, t) {
    this._receiptWatchers[e] = t;
  }
  subscribe(e, t, s = {}) {
    s = Object.assign({}, s), s.id || (s.id = `sub-${this._counter++}`), s.destination = e, this._subscriptions[s.id] = t, this._transmit({ command: "SUBSCRIBE", headers: s });
    const i = this;
    return {
      id: s.id,
      unsubscribe(o) {
        return i.unsubscribe(s.id, o);
      }
    };
  }
  unsubscribe(e, t = {}) {
    t = Object.assign({}, t), delete this._subscriptions[e], t.id = e, this._transmit({ command: "UNSUBSCRIBE", headers: t });
  }
  begin(e) {
    const t = e || `tx-${this._counter++}`;
    this._transmit({
      command: "BEGIN",
      headers: {
        transaction: t
      }
    });
    const s = this;
    return {
      id: t,
      commit() {
        s.commit(t);
      },
      abort() {
        s.abort(t);
      }
    };
  }
  commit(e) {
    this._transmit({
      command: "COMMIT",
      headers: {
        transaction: e
      }
    });
  }
  abort(e) {
    this._transmit({
      command: "ABORT",
      headers: {
        transaction: e
      }
    });
  }
  ack(e, t, s = {}) {
    s = Object.assign({}, s), this._connectedVersion === l.V1_2 ? s.id = e : s["message-id"] = e, s.subscription = t, this._transmit({ command: "ACK", headers: s });
  }
  nack(e, t, s = {}) {
    return s = Object.assign({}, s), this._connectedVersion === l.V1_2 ? s.id = e : s["message-id"] = e, s.subscription = t, this._transmit({ command: "NACK", headers: s });
  }
}
class Y {
  /**
   * Create an instance.
   */
  constructor(e = {}) {
    this.stompVersions = l.default, this.connectionTimeout = 0, this.reconnectDelay = 5e3, this.heartbeatIncoming = 1e4, this.heartbeatOutgoing = 1e4, this.splitLargeFrames = !1, this.maxWebSocketChunkSize = 8 * 1024, this.forceBinaryWSFrames = !1, this.appendMissingNULLonIncoming = !1, this.discardWebsocketOnCommFailure = !1, this.state = m.INACTIVE;
    const t = () => {
    };
    this.debug = t, this.beforeConnect = t, this.onConnect = t, this.onDisconnect = t, this.onUnhandledMessage = t, this.onUnhandledReceipt = t, this.onUnhandledFrame = t, this.onStompError = t, this.onWebSocketClose = t, this.onWebSocketError = t, this.logRawCommunication = !1, this.onChangeState = t, this.connectHeaders = {}, this._disconnectHeaders = {}, this.configure(e);
  }
  /**
   * Underlying WebSocket instance, READONLY.
   */
  get webSocket() {
    var e;
    return (e = this._stompHandler) == null ? void 0 : e._webSocket;
  }
  /**
   * Disconnection headers.
   */
  get disconnectHeaders() {
    return this._disconnectHeaders;
  }
  set disconnectHeaders(e) {
    this._disconnectHeaders = e, this._stompHandler && (this._stompHandler.disconnectHeaders = this._disconnectHeaders);
  }
  /**
   * `true` if there is an active connection to STOMP Broker
   */
  get connected() {
    return !!this._stompHandler && this._stompHandler.connected;
  }
  /**
   * version of STOMP protocol negotiated with the server, READONLY
   */
  get connectedVersion() {
    return this._stompHandler ? this._stompHandler.connectedVersion : void 0;
  }
  /**
   * if the client is active (connected or going to reconnect)
   */
  get active() {
    return this.state === m.ACTIVE;
  }
  _changeState(e) {
    this.state = e, this.onChangeState(e);
  }
  /**
   * Update configuration.
   */
  configure(e) {
    Object.assign(this, e);
  }
  /**
   * Initiate the connection with the broker.
   * If the connection breaks, as per [Client#reconnectDelay]{@link Client#reconnectDelay},
   * it will keep trying to reconnect.
   *
   * Call [Client#deactivate]{@link Client#deactivate} to disconnect and stop reconnection attempts.
   */
  activate() {
    const e = () => {
      if (this.active) {
        this.debug("Already ACTIVE, ignoring request to activate");
        return;
      }
      this._changeState(m.ACTIVE), this._connect();
    };
    this.state === m.DEACTIVATING ? (this.debug("Waiting for deactivation to finish before activating"), this.deactivate().then(() => {
      e();
    })) : e();
  }
  _connect() {
    return y(this, null, function* () {
      if (yield this.beforeConnect(), this._stompHandler) {
        this.debug("There is already a stompHandler, skipping the call to connect");
        return;
      }
      if (!this.active) {
        this.debug("Client has been marked inactive, will not attempt to connect");
        return;
      }
      this.connectionTimeout > 0 && (this._connectionWatcher && clearTimeout(this._connectionWatcher), this._connectionWatcher = setTimeout(() => {
        this.connected || (this.debug(`Connection not established in ${this.connectionTimeout}ms, closing socket`), this.forceDisconnect());
      }, this.connectionTimeout)), this.debug("Opening Web Socket...");
      const e = this._createWebSocket();
      this._stompHandler = new Q(this, e, {
        debug: this.debug,
        stompVersions: this.stompVersions,
        connectHeaders: this.connectHeaders,
        disconnectHeaders: this._disconnectHeaders,
        heartbeatIncoming: this.heartbeatIncoming,
        heartbeatOutgoing: this.heartbeatOutgoing,
        splitLargeFrames: this.splitLargeFrames,
        maxWebSocketChunkSize: this.maxWebSocketChunkSize,
        forceBinaryWSFrames: this.forceBinaryWSFrames,
        logRawCommunication: this.logRawCommunication,
        appendMissingNULLonIncoming: this.appendMissingNULLonIncoming,
        discardWebsocketOnCommFailure: this.discardWebsocketOnCommFailure,
        onConnect: (t) => {
          if (this._connectionWatcher && (clearTimeout(this._connectionWatcher), this._connectionWatcher = void 0), !this.active) {
            this.debug("STOMP got connected while deactivate was issued, will disconnect now"), this._disposeStompHandler();
            return;
          }
          this.onConnect(t);
        },
        onDisconnect: (t) => {
          this.onDisconnect(t);
        },
        onStompError: (t) => {
          this.onStompError(t);
        },
        onWebSocketClose: (t) => {
          this._stompHandler = void 0, this.state === m.DEACTIVATING && this._changeState(m.INACTIVE), this.onWebSocketClose(t), this.active && this._schedule_reconnect();
        },
        onWebSocketError: (t) => {
          this.onWebSocketError(t);
        },
        onUnhandledMessage: (t) => {
          this.onUnhandledMessage(t);
        },
        onUnhandledReceipt: (t) => {
          this.onUnhandledReceipt(t);
        },
        onUnhandledFrame: (t) => {
          this.onUnhandledFrame(t);
        }
      }), this._stompHandler.start();
    });
  }
  _createWebSocket() {
    let e;
    if (this.webSocketFactory)
      e = this.webSocketFactory();
    else if (this.brokerURL)
      e = new WebSocket(this.brokerURL, this.stompVersions.protocolVersions());
    else
      throw new Error("Either brokerURL or webSocketFactory must be provided");
    return e.binaryType = "arraybuffer", e;
  }
  _schedule_reconnect() {
    this.reconnectDelay > 0 && (this.debug(`STOMP: scheduling reconnection in ${this.reconnectDelay}ms`), this._reconnector = setTimeout(() => {
      this._connect();
    }, this.reconnectDelay));
  }
  /**
   * Disconnect if connected and stop auto reconnect loop.
   * Appropriate callbacks will be invoked if there is an underlying STOMP connection.
   *
   * This call is async. It will resolve immediately if there is no underlying active websocket,
   * otherwise, it will resolve after the underlying websocket is properly disposed of.
   *
   * It is not an error to invoke this method more than once.
   * Each of those would resolve on completion of deactivation.
   *
   * To reactivate, you can call [Client#activate]{@link Client#activate}.
   *
   * Experimental: pass `force: true` to immediately discard the underlying connection.
   * This mode will skip both the STOMP and the Websocket shutdown sequences.
   * In some cases, browsers take a long time in the Websocket shutdown
   * if the underlying connection had gone stale.
   * Using this mode can speed up.
   * When this mode is used, the actual Websocket may linger for a while
   * and the broker may not realize that the connection is no longer in use.
   *
   * It is possible to invoke this method initially without the `force` option
   * and subsequently, say after a wait, with the `force` option.
   */
  deactivate() {
    return y(this, arguments, function* (e = {}) {
      var o;
      const t = e.force || !1, s = this.active;
      let i;
      if (this.state === m.INACTIVE)
        return this.debug("Already INACTIVE, nothing more to do"), Promise.resolve();
      if (this._changeState(m.DEACTIVATING), this._reconnector && (clearTimeout(this._reconnector), this._reconnector = void 0), this._stompHandler && // @ts-ignore - if there is a _stompHandler, there is the webSocket
      this.webSocket.readyState !== p.CLOSED) {
        const c = this._stompHandler.onWebSocketClose;
        i = new Promise((r, a) => {
          this._stompHandler.onWebSocketClose = (d) => {
            c(d), r();
          };
        });
      } else
        return this._changeState(m.INACTIVE), Promise.resolve();
      return t ? (o = this._stompHandler) == null || o.discardWebsocket() : s && this._disposeStompHandler(), i;
    });
  }
  /**
   * Force disconnect if there is an active connection by directly closing the underlying WebSocket.
   * This is different from a normal disconnect where a DISCONNECT sequence is carried out with the broker.
   * After forcing disconnect, automatic reconnect will be attempted.
   * To stop further reconnects call [Client#deactivate]{@link Client#deactivate} as well.
   */
  forceDisconnect() {
    this._stompHandler && this._stompHandler.forceDisconnect();
  }
  _disposeStompHandler() {
    this._stompHandler && this._stompHandler.dispose();
  }
  /**
   * Send a message to a named destination. Refer to your STOMP broker documentation for types
   * and naming of destinations.
   *
   * STOMP protocol specifies and suggests some headers and also allows broker-specific headers.
   *
   * `body` must be String.
   * You will need to covert the payload to string in case it is not string (e.g. JSON).
   *
   * To send a binary message body, use `binaryBody` parameter. It should be a
   * [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
   * Sometimes brokers may not support binary frames out of the box.
   * Please check your broker documentation.
   *
   * `content-length` header is automatically added to the STOMP Frame sent to the broker.
   * Set `skipContentLengthHeader` to indicate that `content-length` header should not be added.
   * For binary messages, `content-length` header is always added.
   *
   * Caution: The broker will, most likely, report an error and disconnect
   * if the message body has NULL octet(s) and `content-length` header is missing.
   *
   * ```javascript
   *        client.publish({destination: "/queue/test", headers: {priority: 9}, body: "Hello, STOMP"});
   *
   *        // Only destination is mandatory parameter
   *        client.publish({destination: "/queue/test", body: "Hello, STOMP"});
   *
   *        // Skip content-length header in the frame to the broker
   *        client.publish({"/queue/test", body: "Hello, STOMP", skipContentLengthHeader: true});
   *
   *        var binaryData = generateBinaryData(); // This need to be of type Uint8Array
   *        // setting content-type header is not mandatory, however a good practice
   *        client.publish({destination: '/topic/special', binaryBody: binaryData,
   *                         headers: {'content-type': 'application/octet-stream'}});
   * ```
   */
  publish(e) {
    this._checkConnection(), this._stompHandler.publish(e);
  }
  _checkConnection() {
    if (!this.connected)
      throw new TypeError("There is no underlying STOMP connection");
  }
  /**
   * STOMP brokers may carry out operation asynchronously and allow requesting for acknowledgement.
   * To request an acknowledgement, a `receipt` header needs to be sent with the actual request.
   * The value (say receipt-id) for this header needs to be unique for each use.
   * Typically, a sequence, a UUID, a random number or a combination may be used.
   *
   * A complaint broker will send a RECEIPT frame when an operation has actually been completed.
   * The operation needs to be matched based on the value of the receipt-id.
   *
   * This method allows watching for a receipt and invoking the callback
   *  when the corresponding receipt has been received.
   *
   * The actual {@link IFrame} will be passed as parameter to the callback.
   *
   * Example:
   * ```javascript
   *        // Subscribing with acknowledgement
   *        let receiptId = randomText();
   *
   *        client.watchForReceipt(receiptId, function() {
   *          // Will be called after server acknowledges
   *        });
   *
   *        client.subscribe(TEST.destination, onMessage, {receipt: receiptId});
   *
   *
   *        // Publishing with acknowledgement
   *        receiptId = randomText();
   *
   *        client.watchForReceipt(receiptId, function() {
   *          // Will be called after server acknowledges
   *        });
   *        client.publish({destination: TEST.destination, headers: {receipt: receiptId}, body: msg});
   * ```
   */
  watchForReceipt(e, t) {
    this._checkConnection(), this._stompHandler.watchForReceipt(e, t);
  }
  /**
   * Subscribe to a STOMP Broker location. The callback will be invoked for each
   * received message with the {@link IMessage} as argument.
   *
   * Note: The library will generate a unique ID if there is none provided in the headers.
   *       To use your own ID, pass it using the `headers` argument.
   *
   * ```javascript
   *        callback = function(message) {
   *        // called when the client receives a STOMP message from the server
   *          if (message.body) {
   *            alert("got message with body " + message.body)
   *          } else {
   *            alert("got empty message");
   *          }
   *        });
   *
   *        var subscription = client.subscribe("/queue/test", callback);
   *
   *        // Explicit subscription id
   *        var mySubId = 'my-subscription-id-001';
   *        var subscription = client.subscribe(destination, callback, { id: mySubId });
   * ```
   */
  subscribe(e, t, s = {}) {
    return this._checkConnection(), this._stompHandler.subscribe(e, t, s);
  }
  /**
   * It is preferable to unsubscribe from a subscription by calling
   * `unsubscribe()` directly on {@link StompSubscription} returned by `client.subscribe()`:
   *
   * ```javascript
   *        var subscription = client.subscribe(destination, onmessage);
   *        // ...
   *        subscription.unsubscribe();
   * ```
   *
   * See: https://stomp.github.com/stomp-specification-1.2.html#UNSUBSCRIBE UNSUBSCRIBE Frame
   */
  unsubscribe(e, t = {}) {
    this._checkConnection(), this._stompHandler.unsubscribe(e, t);
  }
  /**
   * Start a transaction, the returned {@link ITransaction} has methods - [commit]{@link ITransaction#commit}
   * and [abort]{@link ITransaction#abort}.
   *
   * `transactionId` is optional, if not passed the library will generate it internally.
   */
  begin(e) {
    return this._checkConnection(), this._stompHandler.begin(e);
  }
  /**
   * Commit a transaction.
   *
   * It is preferable to commit a transaction by calling [commit]{@link ITransaction#commit} directly on
   * {@link ITransaction} returned by [client.begin]{@link Client#begin}.
   *
   * ```javascript
   *        var tx = client.begin(txId);
   *        //...
   *        tx.commit();
   * ```
   */
  commit(e) {
    this._checkConnection(), this._stompHandler.commit(e);
  }
  /**
   * Abort a transaction.
   * It is preferable to abort a transaction by calling [abort]{@link ITransaction#abort} directly on
   * {@link ITransaction} returned by [client.begin]{@link Client#begin}.
   *
   * ```javascript
   *        var tx = client.begin(txId);
   *        //...
   *        tx.abort();
   * ```
   */
  abort(e) {
    this._checkConnection(), this._stompHandler.abort(e);
  }
  /**
   * ACK a message. It is preferable to acknowledge a message by calling [ack]{@link IMessage#ack} directly
   * on the {@link IMessage} handled by a subscription callback:
   *
   * ```javascript
   *        var callback = function (message) {
   *          // process the message
   *          // acknowledge it
   *          message.ack();
   *        };
   *        client.subscribe(destination, callback, {'ack': 'client'});
   * ```
   */
  ack(e, t, s = {}) {
    this._checkConnection(), this._stompHandler.ack(e, t, s);
  }
  /**
   * NACK a message. It is preferable to acknowledge a message by calling [nack]{@link IMessage#nack} directly
   * on the {@link IMessage} handled by a subscription callback:
   *
   * ```javascript
   *        var callback = function (message) {
   *          // process the message
   *          // an error occurs, nack it
   *          message.nack();
   *        };
   *        client.subscribe(destination, callback, {'ack': 'client'});
   * ```
   */
  nack(e, t, s = {}) {
    this._checkConnection(), this._stompHandler.nack(e, t, s);
  }
}
var h;
(function(n) {
  n[n.CONNECTING = 0] = "CONNECTING", n[n.OPEN = 1] = "OPEN", n[n.CLOSING = 2] = "CLOSING", n[n.CLOSED = 3] = "CLOSED";
})(h = h || (h = {}));
class J {
  /**
   * Instance of actual
   * [@stomp/stompjs]{@link https://github.com/stomp-js/stompjs}
   * {@link Client}.
   *
   * **Be careful in calling methods on it directly - you may get unintended consequences.**
   */
  get stompClient() {
    return this._stompClient;
  }
  /**
   * Constructor
   *
   * @param stompClient optionally inject the
   * [@stomp/stompjs]{@link https://github.com/stomp-js/stompjs}
   * {@link Client} to wrap. If this is not provided, a client will
   * be constructed internally.
   */
  constructor(e) {
    this._queuedMessages = [];
    const t = e || new Y();
    this._stompClient = t;
    const s = () => {
    };
    this._beforeConnect = s, this._correlateErrors = () => {
    }, this._debug = s, this._connectionStatePre$ = new H(h.CLOSED), this._connectedPre$ = this._connectionStatePre$.pipe(k((i) => i === h.OPEN)), this.connectionState$ = new H(h.CLOSED), this.connected$ = this.connectionState$.pipe(k((i) => i === h.OPEN)), this.connected$.subscribe(() => {
      this._sendQueuedMessages();
    }), this._serverHeadersBehaviourSubject$ = new H(null), this.serverHeaders$ = this._serverHeadersBehaviourSubject$.pipe(k((i) => i !== null)), this.stompErrors$ = new C(), this.unhandledMessage$ = new C(), this.unhandledReceipts$ = new C(), this.unhandledFrame$ = new C(), this.webSocketErrors$ = new C();
  }
  /**
   * Set configuration. This method may be called multiple times.
   * Each call will add to the existing configuration.
   *
   * Example:
   *
   * ```javascript
   *        const rxStomp = new RxStomp();
   *        rxStomp.configure({
   *          brokerURL: 'ws://127.0.0.1:15674/ws',
   *          connectHeaders: {
   *            login: 'guest',
   *            passcode: 'guest'
   *          },
   *          heartbeatIncoming: 0,
   *          heartbeatOutgoing: 20000,
   *          reconnectDelay: 200,
   *          debug: (msg: string): void => {
   *            console.log(new Date(), msg);
   *          }
   *        });
   *        rxStomp.activate();
   * ```
   *
   * Maps to: [Client#configure]{@link Client#configure}
   */
  configure(e) {
    const t = Object.assign({}, e);
    t.beforeConnect && (this._beforeConnect = t.beforeConnect, delete t.beforeConnect), t.correlateErrors && (this._correlateErrors = t.correlateErrors, delete t.correlateErrors), this._stompClient.configure(t), t.debug && (this._debug = t.debug);
  }
  /**
   * Initiate the connection with the broker.
   * If the connection breaks, as per [RxStompConfig#reconnectDelay]{@link RxStompConfig#reconnectDelay},
   * it will keep trying to reconnect.
   *
   * Call [RxStomp#deactivate]{@link RxStomp#deactivate} to disconnect and stop reconnection attempts.
   *
   * Maps to: [Client#activate]{@link Client#activate}
   */
  activate() {
    this._stompClient.configure({
      beforeConnect: () => y(this, null, function* () {
        this._changeState(h.CONNECTING), yield this._beforeConnect(this);
      }),
      onConnect: (e) => {
        this._serverHeadersBehaviourSubject$.next(e.headers), this._changeState(h.OPEN);
      },
      onStompError: (e) => {
        this.stompErrors$.next(e);
      },
      onWebSocketClose: () => {
        this._changeState(h.CLOSED);
      },
      onUnhandledMessage: (e) => {
        this.unhandledMessage$.next(e);
      },
      onUnhandledReceipt: (e) => {
        this.unhandledReceipts$.next(e);
      },
      onUnhandledFrame: (e) => {
        this.unhandledFrame$.next(e);
      },
      onWebSocketError: (e) => {
        this.webSocketErrors$.next(e);
      }
    }), this._stompClient.activate();
  }
  /**
   * Disconnect if connected and stop auto reconnect loop.
   * Appropriate callbacks will be invoked if the underlying STOMP connection was connected.
   *
   * To reactivate, you can call [RxStomp#activate]{@link RxStomp#activate}.
   *
   * This call is async. It will resolve immediately if there is no underlying active websocket,
   * otherwise, it will resolve after the underlying websocket is properly disposed of.
   *
   * Experimental: Since version 2.0.0, pass `force: true` to immediately discard the underlying connection.
   * See [Client#deactivate]{@link Client#deactivate} for details.
   *
   * Maps to: [Client#deactivate]{@link Client#deactivate}
   */
  deactivate() {
    return y(this, arguments, function* (e = {}) {
      this._changeState(h.CLOSING), yield this._stompClient.deactivate(e), this._changeState(h.CLOSED);
    });
  }
  /**
   * It will return `true` if STOMP broker is connected and `false` otherwise.
   */
  connected() {
    return this.connectionState$.getValue() === h.OPEN;
  }
  /**
   * If the client is active (connected or going to reconnect).
   *
   *  Maps to: [Client#active]{@link Client#active}
   */
  get active() {
    return this.stompClient.active;
  }
  /**
   * Send a message to a named destination. Refer to your STOMP broker documentation for types
   * and naming of destinations.
   *
   * STOMP protocol specifies and suggests some headers and also allows broker-specific headers.
   *
   * `body` must be String.
   * You will need to covert the payload to string in case it is not string (e.g. JSON).
   *
   * To send a binary message body, use binaryBody parameter. It should be a
   * [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
   * Sometimes brokers may not support binary frames out of the box.
   * Please check your broker documentation.
   *
   * The ` content-length` header is automatically added to the STOMP Frame sent to the broker.
   * Set `skipContentLengthHeader` to indicate that `content-length` header should not be added.
   * For binary messages, `content-length` header is always added.
   *
   * Caution: The broker will, most likely, report an error and disconnect if the message body has NULL octet(s)
   * and `content-length` header is missing.
   *
   * The message will get locally queued if the STOMP broker is not connected. It will attempt to
   * publish queued messages as soon as the broker gets connected.
   * If you do not want that behavior,
   * please set [retryIfDisconnected]{@link IRxStompPublishParams#retryIfDisconnected} to `false`
   * in the parameters.
   * When `false`, this function will raise an error if a message could not be sent immediately.
   *
   * Maps to: [Client#publish]{@link Client#publish}
   *
   * See: {@link IRxStompPublishParams} and {@link IPublishParams}
   *
   * ```javascript
   *        rxStomp.publish({destination: "/queue/test", headers: {priority: 9}, body: "Hello, STOMP"});
   *
   *        // Only destination is mandatory parameter
   *        rxStomp.publish({destination: "/queue/test", body: "Hello, STOMP"});
   *
   *        // Skip content-length header in the frame to the broker
   *        rxStomp.publish({"/queue/test", body: "Hello, STOMP", skipContentLengthHeader: true});
   *
   *        var binaryData = generateBinaryData(); // This need to be of type Uint8Array
   *        // setting content-type header is not mandatory, however a good practice
   *        rxStomp.publish({destination: '/topic/special', binaryBody: binaryData,
   *                         headers: {'content-type': 'application/octet-stream'}});
   * ```
   */
  publish(e) {
    const t = e.retryIfDisconnected == null ? !0 : e.retryIfDisconnected;
    if (this.connected())
      this._stompClient.publish(e);
    else if (t)
      this._debug("Not connected, queueing"), this._queuedMessages.push(e);
    else
      throw new Error("Cannot publish while broker is not connected");
  }
  /** It will send queued messages. */
  _sendQueuedMessages() {
    const e = this._queuedMessages;
    if (this._queuedMessages = [], e.length !== 0) {
      this._debug(`Will try sending  ${e.length} queued message(s)`);
      for (const t of e)
        this._debug(`Attempting to send ${t}`), this.publish(t);
    }
  }
  watch(e, t = {}) {
    const s = {
      subHeaders: {},
      unsubHeaders: {},
      subscribeOnlyOnce: !1
    };
    let i;
    return typeof e == "string" ? i = Object.assign({}, s, {
      destination: e,
      subHeaders: t
    }) : i = Object.assign({}, s, e), this._debug(`Request to subscribe ${i.destination}`), L.create((c) => {
      let r, a, d = this._connectedPre$;
      i.subscribeOnlyOnce && (d = d.pipe(U(1)));
      const g = this.stompErrors$.subscribe((b) => {
        this._correlateErrors(b) === i.destination && c.error(b);
      });
      return a = d.subscribe(() => {
        this._debug(`Will subscribe to ${i.destination}`);
        let b = i.subHeaders;
        typeof b == "function" && (b = b()), r = this._stompClient.subscribe(i.destination, (I) => {
          c.next(I);
        }, b);
      }), () => {
        if (this._debug(`Stop watching connection state (for ${i.destination})`), a.unsubscribe(), g.unsubscribe(), this.connected()) {
          this._debug(`Will unsubscribe from ${i.destination} at Stomp`);
          let b = i.unsubHeaders;
          typeof b == "function" && (b = b()), r.unsubscribe(b);
        } else
          this._debug(`Stomp not connected, no need to unsubscribe from ${i.destination} at Stomp`);
      };
    }).pipe(V());
  }
  /**
   * **Deprecated** Please use {@link asyncReceipt}.
   */
  watchForReceipt(e, t) {
    this._stompClient.watchForReceipt(e, t);
  }
  /**
   * STOMP brokers may carry out operation asynchronously and allow requesting for acknowledgement.
   * To request an acknowledgement, a `receipt` header needs to be sent with the actual request.
   * The value (say receipt-id) for this header needs to be unique for each use. Typically, a sequence, a UUID, a
   * random number or a combination may be used.
   *
   * A complaint broker will send a RECEIPT frame when an operation has actually been completed.
   * The operation needs to be matched based on the value of the receipt-id.
   *
   * This method allows watching for a receipt and invoking the callback
   * when the corresponding receipt has been received.
   *
   * The promise will yield the actual {@link IFrame}.
   *
   * Example:
   * ```javascript
   *        // Publishing with acknowledgement
   *        let receiptId = randomText();
   *
   *        rxStomp.publish({destination: '/topic/special', headers: {receipt: receiptId}, body: msg});
   *        await rxStomp.asyncReceipt(receiptId);; // it yields the actual Frame
   * ```
   *
   * Maps to: [Client#watchForReceipt]{@link Client#watchForReceipt}
   */
  asyncReceipt(e) {
    return A(this.unhandledReceipts$.pipe(k((t) => t.headers["receipt-id"] === e)));
  }
  _changeState(e) {
    this._connectionStatePre$.next(e), this.connectionState$.next(e);
  }
}
let O;
const X = new Uint8Array(16);
function Z() {
  if (!O && (O = typeof crypto != "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto), !O))
    throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
  return O(X);
}
const u = [];
for (let n = 0; n < 256; ++n)
  u.push((n + 256).toString(16).slice(1));
function ee(n, e = 0) {
  return (u[n[e + 0]] + u[n[e + 1]] + u[n[e + 2]] + u[n[e + 3]] + "-" + u[n[e + 4]] + u[n[e + 5]] + "-" + u[n[e + 6]] + u[n[e + 7]] + "-" + u[n[e + 8]] + u[n[e + 9]] + "-" + u[n[e + 10]] + u[n[e + 11]] + u[n[e + 12]] + u[n[e + 13]] + u[n[e + 14]] + u[n[e + 15]]).toLowerCase();
}
const te = typeof crypto != "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto), D = {
  randomUUID: te
};
function se(n, e, t) {
  if (D.randomUUID && !e && !n)
    return D.randomUUID();
  n = n || {};
  const s = n.random || (n.rng || Z)();
  if (s[6] = s[6] & 15 | 64, s[8] = s[8] & 63 | 128, e) {
    t = t || 0;
    for (let i = 0; i < 16; ++i)
      e[t + i] = s[i];
    return e;
  }
  return ee(s);
}
var ne = /* @__PURE__ */ ((n) => (n.BPMN = "/user/topic/bpmn", n.EVIDENCE = "evidence", n.USER_LOCATION = "/topic/user-location", n.COMMON_BROADCAST = "/topic/common-broadcast", n.CONFIG = "/topic/config", n.BPMN_EVENT = "/user/topic/bpmn-event", n.DUTY_SCHEDULE_NOTIFY = "/topic/duty-schedule-notify", n))(ne || {}), $ = /* @__PURE__ */ ((n) => (n.HEARTBEAT = "hearbeat", n))($ || {});
const N = {
  [h.CONNECTING]: "与服务器断开连接，正在连接中",
  [h.CLOSED]: "与服务器断开连接",
  [h.OPEN]: "已经连接到服务器",
  [h.CLOSING]: "与服务器断开连接"
}, T = {
  [h.CONNECTING]: "error",
  [h.CLOSED]: "error",
  [h.OPEN]: "success",
  [h.CLOSING]: "error"
};
class ie {
  constructor() {
    _(this, "timeout", 5e3);
    _(this, "reconnectDelay", 5e3);
    _(this, "heartbeatTime", 15e3);
    _(this, "baseUrl", `${location.protocol.startsWith("https") ? "wss" : "ws"}://${location.host}`);
    _(this, "url", "/api/auth/ws/endpoint");
  }
}
class oe {
  constructor() {
    _(this, "rxStomp", new J());
    _(this, "config", new ie());
    _(this, "topicHandlers", {});
    _(this, "topicSubscrition", {});
    _(this, "disconnect$", new C());
    _(this, "connectionState$", new C());
  }
  init(e) {
    for (const t in e)
      this.config[t] = e[t];
  }
  connect(e) {
    this.configure(e), this.rxStomp.activate(), this.heartbeatSubscribe(), this.stateSubscribe();
  }
  disconnect() {
    this.rxStomp.deactivate(), this.disconnect$.next(!0), this.disconnect$.unsubscribe(), this.unsubscribeAll();
  }
  subscribe(e, t) {
    this.topicHandlers[e] ? this.topicHandlers[e].push(t) : (this.topicHandlers[e] = [t], this.topicSubscrition[e] = this.rxStomp.watch({
      destination: e
    }).subscribe((s) => {
      this.topicHandlers[e].forEach((i) => i(JSON.parse(s.body)));
    }));
  }
  unsubscribe(e, t) {
    var i, o, c;
    const s = (i = this.topicHandlers[e]) == null ? void 0 : i.findIndex((r) => r === t);
    s !== void 0 && s > -1 && ((o = this.topicHandlers[e]) == null || o.splice(s, 1), this.topicHandlers[e].length === 0 && ((c = this.topicSubscrition[e]) == null || c.unsubscribe(), this.topicSubscrition[e] = void 0));
  }
  unsubscribeAll() {
    for (const e in this.topicSubscrition)
      this.topicSubscrition[e].unsubscribe(), this.topicSubscrition[e] = void 0;
  }
  publish(e, t) {
    const s = se();
    return this.rxStomp.publish({
      //@ts-ignore
      headers: {
        receipt: s
      },
      destination: e,
      body: t
    }), R(this.rxStomp.asyncReceipt(s)).pipe(
      x({
        first: this.config.timeout
      })
    );
  }
  stateSubscribe() {
    const e = this.rxStomp.stompErrors$.subscribe((i) => {
      this.connectionState$.next({
        type: T[3],
        message: N[3] + i.body
      });
    }), t = this.rxStomp.webSocketErrors$.subscribe((i) => {
      this.connectionState$.next({
        type: T[3],
        message: N[3] + i.type
      });
    }), s = this.rxStomp.connectionState$.subscribe((i) => {
      this.connectionState$.next({
        type: T[i],
        message: N[i]
      }), i !== 1 && this.rxStomp.activate();
    });
    this.disconnect$.subscribe((i) => {
      e.unsubscribe(), t.unsubscribe(), s.unsubscribe();
    });
  }
  configure(e) {
    this.rxStomp.configure({
      brokerURL: this.config.baseUrl + this.config.url,
      connectHeaders: {
        Authorization: e
      },
      reconnectDelay: this.config.reconnectDelay,
      heartbeatIncoming: 0,
      // server to client
      heartbeatOutgoing: this.config.timeout
    });
  }
  heartbeatSubscribe() {
    const e = F(this.config.heartbeatTime).subscribe(
      () => this.publish($.HEARTBEAT, Date.now().toString()).subscribe({
        complete: () => {
        },
        error: (t) => {
          this.rxStomp.deactivate({ force: !0 });
        }
      })
    );
    this.disconnect$.subscribe((t) => {
      e.unsubscribe();
    });
  }
}
const re = M("WsSubscribe");
function ce(n) {
  const e = G(n, re.MetadataKey);
  if (!e || !e.length)
    return;
  const t = j(oe);
  for (const s of e) {
    const { options: i, key: o } = s, c = (r) => n[o].call(n, r);
    t.subscribe(i, c), P(() => {
      t.unsubscribe(i, c);
    });
  }
}
const _e = {
  key: "WsSubscribe",
  handler: ce
};
var ae = /* @__PURE__ */ ((n) => (n.TASK_CREATED = "task-created", n.TASK_ASSIGNED = "task-assigned", n.TASK_COMPLETED = "task-complete", n.TASK_CANCELLD = "task-cancelled", n))(ae || {}), he = /* @__PURE__ */ ((n) => (n.PROCESS_STARTED = "process-started", n.PROCESS_UPDATED = "process-updated", n.PROCESS_COMPLETED = "process-completed", n.PROCESS_CANCELLED = "process-cancelled", n.PROCESS_VARIABLE_UPDATED = "process-variable-updated", n))(he || {});
export {
  he as EnumBpmnProcessAction,
  ae as EnumBpmnTaskAction,
  $ as EnumPublishDestination,
  ne as EnumTopic,
  N as InformWebsocketText,
  T as InformWebsocketType,
  oe as WebSocketService,
  ie as WebscoketConfig,
  re as WsSubscribe,
  _e as WsSubscribeHandler
};
//# sourceMappingURL=szjw-ws.mjs.map
