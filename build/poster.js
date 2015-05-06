(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"base64-js":2,"buffer":1,"ieee754":3,"oMfpAn":4}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"buffer":1,"oMfpAn":4}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"buffer":1,"oMfpAn":4}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"buffer":1,"oMfpAn":4}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){

/* **********************************************
     Begin prism-core.js
********************************************** */

self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;

var _ = self.Prism = {
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (_.util.type(tokens) === 'Array') {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function (o) {
			var type = _.util.type(o);

			switch (type) {
				case 'Object':
					var clone = {};

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = _.util.clone(o[key]);
						}
					}

					return clone;

				case 'Array':
					return o.map(function(v) { return _.util.clone(v); });
			}

			return o;
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need anobject and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before. If not provided, the function appends instead.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];
			
			if (arguments.length == 2) {
				insert = arguments[1];
				
				for (var newToken in insert) {
					if (insert.hasOwnProperty(newToken)) {
						grammar[newToken] = insert[newToken];
					}
				}
				
				return grammar;
			}
			
			var ret = {};

			for (var token in grammar) {

				if (grammar.hasOwnProperty(token)) {

					if (token == before) {

						for (var newToken in insert) {

							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					ret[token] = grammar[token];
				}
			}
			
			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === root[inside] && key != inside) {
					this[key] = ret;
				}
			});

			return root[inside] = ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function(o, callback, type) {
			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					if (_.util.type(o[i]) === 'Object') {
						_.languages.DFS(o[i], callback);
					}
					else if (_.util.type(o[i]) === 'Array') {
						_.languages.DFS(o[i], callback, i);
					}
				}
			}
		}
	},

	highlightAll: function(async, callback) {
		var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language, grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,''])[1];
			grammar = _.languages[language];
		}

		if (!grammar) {
			return;
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		parent = element.parentNode;

		if (/pre/i.test(parent.nodeName)) {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		if(!code) {
			return;
		}

		code = code.replace(/^(?:\r?\n|\r)/,'');

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		_.hooks.run('before-highlight', env);

		if (async && self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				env.highlightedCode = Token.stringify(JSON.parse(evt.data), language);

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(env.element);
				_.hooks.run('after-highlight', env);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code
			}));
		}
		else {
			env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			callback && callback.call(element);

			_.hooks.run('after-highlight', env);
		}
	},

	highlight: function (text, grammar, language) {
		var tokens = _.tokenize(text, grammar);
		return Token.stringify(_.util.encode(tokens), language);
	},

	tokenize: function(text, grammar, language) {
		var Token = _.Token;

		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		tokenloop: for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					lookbehindLength = 0,
					alias = pattern.alias;

				pattern = pattern.pattern || pattern;

				for (var i=0; i<strarr.length; i++) { // Don’t cache length as it changes during the loop

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						break tokenloop;
					}

					if (str instanceof Token) {
						continue;
					}

					pattern.lastIndex = 0;

					var match = pattern.exec(str);

					if (match) {
						if(lookbehind) {
							lookbehindLength = match[1].length;
						}

						var from = match.index - 1 + lookbehindLength,
							match = match[0].slice(lookbehindLength),
							len = match.length,
							to = from + len,
							before = str.slice(0, from + 1),
							after = str.slice(to + 1);

						var args = [i, 1];

						if (before) {
							args.push(before);
						}

						var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias);

						args.push(wrapped);

						if (after) {
							args.push(after);
						}

						Array.prototype.splice.apply(strarr, args);
					}
				}
			}
		}

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	}
};

var Token = _.Token = function(type, content, alias) {
	this.type = type;
	this.content = content;
	this.alias = alias;
};

Token.stringify = function(o, language, parent) {
	if (typeof o == 'string') {
		return o;
	}

	if (_.util.type(o) === 'Array') {
		return o.map(function(element) {
			return Token.stringify(element, language, o);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language, parent),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language,
		parent: parent
	};

	if (env.type == 'comment') {
		env.attributes['spellcheck'] = 'true';
	}

	if (o.alias) {
		var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = '';

	for (var name in env.attributes) {
		attributes += name + '="' + (env.attributes[name] || '') + '"';
	}

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';

};

if (!self.document) {
	if (!self.addEventListener) {
		// in Node.js
		return self.Prism;
	}
 	// In worker
	self.addEventListener('message', function(evt) {
		var message = JSON.parse(evt.data),
		    lang = message.language,
		    code = message.code;

		self.postMessage(JSON.stringify(_.util.encode(_.tokenize(code, _.languages[lang]))));
		self.close();
	}, false);

	return self.Prism;
}

// Get current script and highlight
var script = document.getElementsByTagName('script');

script = script[script.length - 1];

if (script) {
	_.filename = script.src;

	if (document.addEventListener && !script.hasAttribute('data-manual')) {
		document.addEventListener('DOMContentLoaded', _.highlightAll);
	}
}

return self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': /<!--[\w\W]*?-->/,
	'prolog': /<\?.+?\?>/,
	'doctype': /<!DOCTYPE.+?>/,
	'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
	'tag': {
		pattern: /<\/?[\w:-]+\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|[^\s'">=]+))?\s*)*\/?>/i,
		inside: {
			'tag': {
				pattern: /^<\/?[\w:-]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[\w-]+?:/
				}
			},
			'attr-value': {
				pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
				inside: {
					'punctuation': /=|>|"/
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[\w:-]+/,
				inside: {
					'namespace': /^[\w-]+?:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});


/* **********************************************
     Begin prism-css.js
********************************************** */

Prism.languages.css = {
	'comment': /\/\*[\w\W]*?\*\//,
	'atrule': {
		pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
		inside: {
			'punctuation': /[;:]/
		}
	},
	'url': /url\((?:(["'])(\\\n|\\?.)*?\1|.*?)\)/i,
	'selector': /[^\{\}\s][^\{\};]*(?=\s*\{)/,
	'string': /("|')(\\\n|\\?.)*?\1/,
	'property': /(\b|\B)[\w-]+(?=\s*:)/i,
	'important': /\B!important\b/i,
	'punctuation': /[\{\};:]/,
	'function': /[-a-z0-9]+(?=\()/i
};

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'style': {
			pattern: /<style[\w\W]*?>[\w\W]*?<\/style>/i,
			inside: {
				'tag': {
					pattern: /<style[\w\W]*?>|<\/style>/i,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.css
			},
			alias: 'language-css'
		}
	});
	
	Prism.languages.insertBefore('inside', 'attr-value', {
		'style-attr': {
			pattern: /\s*style=("|').*?\1/i,
			inside: {
				'attr-name': {
					pattern: /^\s*style/i,
					inside: Prism.languages.markup.tag.inside
				},
				'punctuation': /^\s*=\s*['"]|['"]\s*$/,
				'attr-value': {
					pattern: /.+/i,
					inside: Prism.languages.css
				}
			},
			alias: 'language-css'
		}
	}, Prism.languages.markup.tag);
}

/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.+/,
			lookbehind: true
		}
	],
	'string': /("|')(\\\n|\\?.)*?\1/,
	'class-name': {
		pattern: /((?:(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
		lookbehind: true,
		inside: {
			punctuation: /(\.|\\)/
		}
	},
	'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(true|false)\b/,
	'function': {
		pattern: /[a-z0-9_]+\(/i,
		inside: {
			punctuation: /\(/
		}
	},
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/,
	'operator': /[-+]{1,2}|!|<=?|>=?|={1,3}|&{1,2}|\|?\||\?|\*|\/|~|\^|%/,
	'ignore': /&(lt|gt|amp);/i,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'keyword': /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|get|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/,
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|-?Infinity)\b/,
	'function': /(?!\d)[a-z0-9_$]+(?=\()/i
});

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/,
		lookbehind: true
	}
});

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'script': {
			pattern: /<script[\w\W]*?>[\w\W]*?<\/script>/i,
			inside: {
				'tag': {
					pattern: /<script[\w\W]*?>|<\/script>/i,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.javascript
			},
			alias: 'language-javascript'
		}
	});
}


/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function(){

if (!self.Prism || !self.document || !document.querySelector) {
	return;
}

var Extensions = {
	'js': 'javascript',
	'html': 'markup',
	'svg': 'markup',
	'xml': 'markup',
	'py': 'python',
	'rb': 'ruby',
	'ps1': 'powershell',
	'psm1': 'powershell'
};

Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function(pre) {
	var src = pre.getAttribute('data-src');
	var extension = (src.match(/\.(\w+)$/) || [,''])[1];
	var language = Extensions[extension] || extension;
	
	var code = document.createElement('code');
	code.className = 'language-' + language;
	
	pre.textContent = '';
	
	code.textContent = 'Loading…';
	
	pre.appendChild(code);
	
	var xhr = new XMLHttpRequest();
	
	xhr.open('GET', src, true);

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			
			if (xhr.status < 400 && xhr.responseText) {
				code.textContent = xhr.responseText;
			
				Prism.highlightElement(code);
			}
			else if (xhr.status >= 400) {
				code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
			}
			else {
				code.textContent = '✖ Error: File does not exist or is empty';
			}
		}
	};
	
	xhr.send(null);
});

})();

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/prismjs/prism.js","/../../node_modules/prismjs")
},{"buffer":1,"oMfpAn":4}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
/**
 * Eventful clipboard support
 *
 * WARNING:  This class is a hudge kludge that works around the prehistoric
 * clipboard support (lack thereof) in modern webrowsers.  It creates a hidden
 * textbox which is focused.  The programmer must call `set_clippable` to change
 * what will be copied when the user hits keys corresponding to a copy
 * operation.  Events `copy`, `cut`, and `paste` are raised by this class.
 */
var Clipboard = (function (_super) {
    __extends(Clipboard, _super);
    function Clipboard(el) {
        _super.call(this);
        this._el = el;
        // Create a textbox that's hidden.
        this.hidden_input = document.createElement('textarea');
        this.hidden_input.setAttribute('class', 'poster hidden-clipboard');
        this.hidden_input.setAttribute('x-palm-disable-auto-cap', 'true');
        this.hidden_input.setAttribute('wrap', 'off');
        this.hidden_input.setAttribute('autocorrect', 'off');
        this.hidden_input.setAttribute('autocapitalize', 'off');
        this.hidden_input.setAttribute('spellcheck', 'false');
        el.appendChild(this.hidden_input);
        this._bind_events();
    }
    /**
     * Set what will be copied when the user copies.
     * @param text
     */
    Clipboard.prototype.set_clippable = function (text) {
        this._clippable = text;
        this.hidden_input.value = this._clippable;
        this._focus();
    };
    /**
     * Move the textarea to a point.
     * @param x
     * @param y
     */
    Clipboard.prototype.set_position = function (x, y) {
        this.hidden_input.setAttribute('style', 'left: ' + String(x) + 'px; top: ' + String(y) + 'px;');
    };
    /**
     * Focus the hidden text area.
     */
    Clipboard.prototype._focus = function () {
        this.hidden_input.focus();
        this.hidden_input.select();
    };
    /**
     * Handle when the user pastes into the textbox.
     */
    Clipboard.prototype._handle_paste = function (e) {
        var pasted = e.clipboardData.getData(e.clipboardData.types[0]);
        utils.cancel_bubble(e);
        this.trigger('paste', pasted);
    };
    /**
     * Bind events of the hidden textbox.
     */
    Clipboard.prototype._bind_events = function () {
        var _this = this;
        // Listen to el's focus event.  If el is focused, focus the hidden input
        // instead.
        utils.hook(this._el, 'onfocus', utils.proxy(this._focus, this));
        utils.hook(this.hidden_input, 'onpaste', utils.proxy(this._handle_paste, this));
        utils.hook(this.hidden_input, 'oncut', function () {
            // Trigger the event in a timeout so it fires after the system event.
            setTimeout(function () {
                _this.trigger('cut', _this._clippable);
            }, 0);
        });
        utils.hook(this.hidden_input, 'oncopy', function () {
            _this.trigger('copy', _this._clippable);
        });
        utils.hook(this.hidden_input, 'onkeypress', function () {
            setTimeout(function () {
                _this.hidden_input.value = _this._clippable;
                _this._focus();
            }, 0);
        });
        utils.hook(this.hidden_input, 'onkeyup', function () {
            setTimeout(function () {
                _this.hidden_input.value = _this._clippable;
                _this._focus();
            }, 0);
        });
    };
    return Clipboard;
})(utils.PosterClass);
exports.Clipboard = Clipboard;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/clipboard.js","/control")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./map');
var register = keymap.Map.register;
var utils = require('../utils/utils');
var config_mod = require('../utils/config');
var config = config_mod.config;
;
/**
 * Input cursor.
 */
var Cursor = (function (_super) {
    __extends(Cursor, _super);
    function Cursor(model, push_history, cursors) {
        _super.call(this);
        this._model = model;
        this._push_history = push_history;
        this._cursors = cursors;
        this.primary_row = 0;
        this.primary_char = 0;
        this.secondary_row = 0;
        this.secondary_char = 0;
        this._register_api();
    }
    Object.defineProperty(Cursor.prototype, "start_row", {
        get: function () {
            return Math.min(this.primary_row, this.secondary_row);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "end_row", {
        get: function () {
            return Math.max(this.primary_row, this.secondary_row);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "start_char", {
        get: function () {
            if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
                return this.primary_char;
            }
            else {
                return this.secondary_char;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "end_char", {
        get: function () {
            if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
                return this.secondary_char;
            }
            else {
                return this.primary_char;
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Unregister the actions and event listeners of this cursor.
     */
    Cursor.prototype.unregister = function () {
        keymap.Map.unregister_by_tag(this);
    };
    /**
     * Gets the state of the cursor.
     */
    Cursor.prototype.get_state = function () {
        return {
            primary_row: this.primary_row,
            primary_char: this.primary_char,
            secondary_row: this.secondary_row,
            secondary_char: this.secondary_char,
            _memory_char: this._memory_char
        };
    };
    /**
     * Sets the state of the cursor.
     * @param state
     * @param [historical] - Defaults to true.  Whether this should be recorded in history.
     */
    Cursor.prototype.set_state = function (state, historical) {
        if (state) {
            var old_state = {};
            for (var key in state) {
                if (state.hasOwnProperty(key)) {
                    old_state[key] = this[key];
                    this[key] = state[key];
                }
            }
            if (historical === undefined || historical === true) {
                this._push_history('set_state', [state], 'set_state', [old_state]);
            }
            this.trigger('change');
        }
    };
    /**
     * Moves the primary cursor a given offset.
     * @param  x
     * @param  y
     * @param  (optional) hop=false - hop to the other side of the
     *                   selected region if the primary is on the opposite of the
     *                   direction of motion.
     */
    Cursor.prototype.move_primary = function (x, y, hop) {
        if (hop) {
            if (this.primary_row != this.secondary_row || this.primary_char != this.secondary_char) {
                var start_row = this.start_row;
                var start_char = this.start_char;
                var end_row = this.end_row;
                var end_char = this.end_char;
                if (x < 0 || y < 0) {
                    this.primary_row = start_row;
                    this.primary_char = start_char;
                    this.secondary_row = end_row;
                    this.secondary_char = end_char;
                }
                else {
                    this.primary_row = end_row;
                    this.primary_char = end_char;
                    this.secondary_row = start_row;
                    this.secondary_char = start_char;
                }
            }
        }
        if (x < 0) {
            if (this.primary_char + x < 0) {
                if (this.primary_row === 0) {
                    this.primary_char = 0;
                }
                else {
                    this.primary_row -= 1;
                    this.primary_char = this._model._rows[this.primary_row].length;
                }
            }
            else {
                this.primary_char += x;
            }
        }
        else if (x > 0) {
            if (this.primary_char + x > this._model._rows[this.primary_row].length) {
                if (this.primary_row === this._model._rows.length - 1) {
                    this.primary_char = this._model._rows[this.primary_row].length;
                }
                else {
                    this.primary_row += 1;
                    this.primary_char = 0;
                }
            }
            else {
                this.primary_char += x;
            }
        }
        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        if (x !== 0) {
            this._memory_char = this.primary_char;
        }
        if (y !== 0) {
            this.primary_row += y;
            this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length - 1);
            if (this._memory_char !== undefined) {
                this.primary_char = this._memory_char;
            }
            if (this.primary_char > this._model._rows[this.primary_row].length) {
                this.primary_char = this._model._rows[this.primary_row].length;
            }
        }
        this.trigger('change');
    };
    /**
     * Walk the primary cursor in a direction until a not-text character is found.
     */
    Cursor.prototype.word_primary = function (direction) {
        // Make sure direction is 1 or -1.
        direction = direction < 0 ? -1 : 1;
        // If moving left and at end of row, move up a row if possible.
        if (this.primary_char === 0 && direction == -1) {
            if (this.primary_row !== 0) {
                this.primary_row--;
                this.primary_char = this._model._rows[this.primary_row].length;
                this._memory_char = this.primary_char;
                this.trigger('change');
            }
            return;
        }
        // If moving right and at end of row, move down a row if possible.
        if (this.primary_char >= this._model._rows[this.primary_row].length && direction == 1) {
            if (this.primary_row < this._model._rows.length - 1) {
                this.primary_row++;
                this.primary_char = 0;
                this._memory_char = this.primary_char;
                this.trigger('change');
            }
            return;
        }
        var i = this.primary_char;
        var hit_text = false;
        var row_text = this._model._rows[this.primary_row];
        if (direction == -1) {
            while (0 < i && !(hit_text && utils.not_text(row_text[i - 1]))) {
                hit_text = hit_text || !utils.not_text(row_text[i - 1]);
                i += direction;
            }
        }
        else {
            while (i < row_text.length && !(hit_text && utils.not_text(row_text[i]))) {
                hit_text = hit_text || !utils.not_text(row_text[i]);
                i += direction;
            }
        }
        this.primary_char = i;
        this._memory_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Select all of the text.
     */
    Cursor.prototype.select_all = function () {
        this.primary_row = this._model._rows.length - 1;
        this.primary_char = this._model._rows[this.primary_row].length;
        this.secondary_row = 0;
        this.secondary_char = 0;
        this.trigger('change');
    };
    /**
     * Move the primary cursor to the line end.
     */
    Cursor.prototype.primary_goto_end = function () {
        // Get the start of the actual content, skipping the whitespace.
        var row_text = this._model._rows[this.primary_row];
        var trimmed = row_text.trim();
        var start = row_text.indexOf(trimmed);
        var target = row_text.length;
        if (0 < start && start < row_text.length && this.primary_char !== start + trimmed.length) {
            target = start + trimmed.length;
        }
        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Move the primary cursor to the line start.
     */
    Cursor.prototype.primary_goto_start = function () {
        // Get the start of the actual content, skipping the whitespace.
        var row_text = this._model._rows[this.primary_row];
        var start = row_text.indexOf(row_text.trim());
        var target = 0;
        if (0 < start && start < row_text.length && this.primary_char !== start) {
            target = start;
        }
        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Selects a word at the given location.
     */
    Cursor.prototype.select_word = function (row_index, char_index) {
        this.set_both(row_index, char_index);
        this.word_primary(-1);
        this._reset_secondary();
        this.word_primary(1);
    };
    /**
     * Set the primary cursor position
     */
    Cursor.prototype.set_primary = function (row_index, char_index) {
        this.primary_row = row_index;
        this.primary_char = char_index;
        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Set the secondary cursor position
     */
    Cursor.prototype.set_secondary = function (row_index, char_index) {
        this.secondary_row = row_index;
        this.secondary_char = char_index;
        this.trigger('change');
    };
    /**
     * Sets both the primary and secondary cursor positions
     */
    Cursor.prototype.set_both = function (row_index, char_index) {
        this.primary_row = row_index;
        this.primary_char = char_index;
        this.secondary_row = row_index;
        this.secondary_char = char_index;
        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Handles when a key is pressed.
     * @param  e - original event.
     * @return was the event handled.
     */
    Cursor.prototype.keypress = function (e) {
        var _this = this;
        var char_code = e.which || e.keyCode;
        var char_typed = String.fromCharCode(char_code);
        var enclosing = '\'"[{(`<'.indexOf(char_typed) !== -1;
        var highlighted = (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char);
        // Check if the primary character is the last character of the row,
        // or if it is whitespace or a right closing character.
        var current_char = this._model._rows[this.primary_row][this.primary_char];
        var right_padded = this.primary_char === this._model._rows[this.primary_row].length || current_char.trim() === '' || ']}>)'.indexOf(current_char) !== -1;
        if (enclosing && (highlighted || right_padded)) {
            var right_char = char_typed;
            var inverses = { '[': ']', '(': ')', '<': '>', '{': '}' };
            if (inverses[right_char] !== undefined)
                right_char = inverses[right_char];
            // If one or more characters are highlighted, surround them using
            // the block characters.
            if (highlighted) {
                var primary_row = this.primary_row;
                var primary_char = this.primary_char;
                var secondary_row = this.secondary_row;
                var secondary_char = this.secondary_char;
                var same_row = this.start_row === this.end_row;
                this.historical(function () {
                    _this.model_add_text(_this.start_row, _this.start_char, char_typed);
                    _this.model_add_text(_this.end_row, _this.end_char + (same_row ? 1 : 0), right_char);
                });
                this.primary_row = primary_row;
                this.primary_char = primary_char + (same_row || this.primary_row < this.secondary_row ? 1 : 0);
                this.secondary_row = secondary_row;
                this.secondary_char = secondary_char + (same_row || this.primary_row > this.secondary_row ? 1 : 0);
                this.trigger('change');
                return true;
            }
            else {
                this.historical(function () {
                    _this.model_add_text(_this.primary_row, _this.primary_char, char_typed);
                    _this.model_add_text(_this.primary_row, _this.primary_char + 1, right_char);
                });
                this.move_primary(1, 0);
                this._reset_secondary();
                return true;
            }
        }
        else {
            this.remove_selected();
            this.historical(function () {
                _this.model_add_text(_this.primary_row, _this.primary_char, char_typed);
            });
            this.move_primary(1, 0);
            this._reset_secondary();
            return true;
        }
    };
    /**
     * Indent
     * @param  e - original event.
     * @return was the event handled.
     */
    Cursor.prototype.indent = function (e) {
        var _this = this;
        var indent = this._make_indents()[0];
        this.historical(function () {
            if (_this.primary_row == _this.secondary_row && _this.primary_char == _this.secondary_char) {
                _this.model_add_text(_this.primary_row, _this.primary_char, indent);
            }
            else {
                for (var row = _this.start_row; row <= _this.end_row; row++) {
                    _this.model_add_text(row, 0, indent);
                }
            }
        });
        this.primary_char += indent.length;
        this._memory_char = this.primary_char;
        this.secondary_char += indent.length;
        this.trigger('change');
        return true;
    };
    /**
     * Unindent
     * @param  e - original event.
     * @return was the event handled.
     */
    Cursor.prototype.unindent = function (e) {
        var _this = this;
        var indents = this._make_indents();
        var removed_start = 0;
        var removed_end = 0;
        // If no text is selected, remove the indent preceding the
        // cursor if it exists.
        this.historical(function () {
            if (_this.primary_row == _this.secondary_row && _this.primary_char == _this.secondary_char) {
                for (var i = 0; i < indents.length; i++) {
                    var indent = indents[i];
                    if (_this.primary_char >= indent.length) {
                        var before = _this._model.get_text(_this.primary_row, _this.primary_char - indent.length, _this.primary_row, _this.primary_char);
                        if (before == indent) {
                            _this.model_remove_text(_this.primary_row, _this.primary_char - indent.length, _this.primary_row, _this.primary_char);
                            removed_start = indent.length;
                            removed_end = indent.length;
                            break;
                        }
                    }
                }
            }
            else {
                for (var row = _this.start_row; row <= _this.end_row; row++) {
                    for (var i = 0; i < indents.length; i++) {
                        var indent = indents[i];
                        if (_this._model._rows[row].length >= indent.length) {
                            if (_this._model._rows[row].substring(0, indent.length) == indent) {
                                _this.model_remove_text(row, 0, row, indent.length);
                                if (row == _this.start_row)
                                    removed_start = indent.length;
                                if (row == _this.end_row)
                                    removed_end = indent.length;
                                break;
                            }
                        }
                        ;
                    }
                }
            }
        });
        // Move the selected characters backwards if indents were removed.
        var start_is_primary = (this.primary_row == this.start_row && this.primary_char == this.start_char);
        if (start_is_primary) {
            this.primary_char -= removed_start;
            this.secondary_char -= removed_end;
        }
        else {
            this.primary_char -= removed_end;
            this.secondary_char -= removed_start;
        }
        this._memory_char = this.primary_char;
        if (removed_end || removed_start)
            this.trigger('change');
        return true;
    };
    /**
     * Insert a newline
     * @param  e - original event.
     * @return was the event handled.
     */
    Cursor.prototype.newline = function (e) {
        var _this = this;
        this.remove_selected();
        // Get the blank space at the begining of the line.
        var line_text = this._model.get_text(this.primary_row, 0, this.primary_row, this.primary_char);
        var spaceless = line_text.trim();
        var left = line_text.length;
        if (spaceless.length > 0) {
            left = line_text.indexOf(spaceless);
        }
        var indent = line_text.substring(0, left);
        this.historical(function () {
            _this.model_add_text(_this.primary_row, _this.primary_char, '\n' + indent);
        });
        this.primary_row += 1;
        this.primary_char = indent.length;
        this._memory_char = this.primary_char;
        this._reset_secondary();
        return true;
    };
    /**
     * Insert text
     * @param text
     * @return successful.
     */
    Cursor.prototype.insert_text = function (text) {
        var _this = this;
        this.remove_selected();
        this.historical(function () {
            _this.model_add_text(_this.primary_row, _this.primary_char, text);
        });
        // Move cursor to the end.
        if (text.indexOf('\n') == -1) {
            this.primary_char = this.start_char + text.length;
        }
        else {
            var lines = text.split('\n');
            this.primary_row += lines.length - 1;
            this.primary_char = lines[lines.length - 1].length;
        }
        this._reset_secondary();
        this.trigger('change');
        return true;
    };
    /**
     * Paste text
     */
    Cursor.prototype.paste = function (text) {
        var _this = this;
        if (this._copied_row === text) {
            this.historical(function () {
                _this.model_add_row(_this.primary_row, text);
            });
            this.primary_row++;
            this.secondary_row++;
            this.trigger('change');
        }
        else {
            this.insert_text(text);
        }
    };
    /**
     * Remove the selected text
     * @return true if text was removed.
     */
    Cursor.prototype.remove_selected = function () {
        var _this = this;
        if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
            var row_index = this.start_row;
            var char_index = this.start_char;
            this.historical(function () {
                _this.model_remove_text(_this.start_row, _this.start_char, _this.end_row, _this.end_char);
            });
            this.primary_row = row_index;
            this.primary_char = char_index;
            this._reset_secondary();
            this.trigger('change');
            return true;
        }
        return false;
    };
    /**
     * Gets the selected text.
     * @return selected text
     */
    Cursor.prototype.get = function () {
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            return this._model._rows[this.primary_row];
        }
        else {
            return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
        }
    };
    /**
     * Cuts the selected text.
     * @return selected text
     */
    Cursor.prototype.cut = function () {
        var _this = this;
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];
            this.historical(function () {
                _this.model_remove_row(_this.primary_row);
                _this.trigger('update');
            });
        }
        else {
            this._copied_row = null;
            this.remove_selected();
        }
        return text;
    };
    /**
     * Copies the selected text.
     * @return selected text
     */
    Cursor.prototype.copy = function () {
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];
        }
        else {
            this._copied_row = null;
        }
        return text;
    };
    /**
     * Delete forward, typically called by `delete` keypress.
     * @return success
     */
    Cursor.prototype.delete_forward = function () {
        if (!this.remove_selected()) {
            this.move_primary(1, 0);
            this.remove_selected();
        }
        return true;
    };
    /**
     * Delete backward, typically called by `backspace` keypress.
     * @return success
     */
    Cursor.prototype.delete_backward = function () {
        if (!this.remove_selected()) {
            this.move_primary(-1, 0);
            this.remove_selected();
        }
        return true;
    };
    /**
     * Delete one word backwards.
     * @return success
     */
    Cursor.prototype.delete_word_left = function () {
        if (!this.remove_selected()) {
            if (this.primary_char === 0) {
                this.word_primary(-1);
                this.remove_selected();
            }
            else {
                // Walk backwards until char index is 0 or
                // a different type of character is hit.
                var row = this._model._rows[this.primary_row];
                var i = this.primary_char - 1;
                var start_not_text = utils.not_text(row[i]);
                while (i >= 0 && utils.not_text(row[i]) == start_not_text) {
                    i--;
                }
                this.secondary_char = i + 1;
                this.remove_selected();
            }
        }
        return true;
    };
    /**
     * Delete one word forwards.
     * @return success
     */
    Cursor.prototype.delete_word_right = function () {
        if (!this.remove_selected()) {
            var row = this._model._rows[this.primary_row];
            if (this.primary_char === row.length) {
                this.word_primary(1);
                this.remove_selected();
            }
            else {
                // Walk forwards until char index is at end or
                // a different type of character is hit.
                var i = this.primary_char;
                var start_not_text = utils.not_text(row[i]);
                while (i < row.length && utils.not_text(row[i]) == start_not_text) {
                    i++;
                }
                this.secondary_char = i;
                this.remove_selected();
            }
        }
        this._end_historical_move();
        return true;
    };
    /**
     * Record the before and after positions of the cursor for history.
     * @param  f - executes with `this` context
     */
    Cursor.prototype.historical = function (f) {
        this._start_historical_move();
        var ret = f.apply(this);
        this._end_historical_move();
        return ret;
    };
    /**
     * Adds text to the model while keeping track of the history.
     */
    Cursor.prototype.model_add_text = function (row_index, char_index, text) {
        var _this = this;
        var lines = text.split('\n');
        this._push_history('model_add_text', [row_index, char_index, text], 'model_remove_text', [row_index, char_index, row_index + lines.length - 1, lines.length > 1 ? lines[lines.length - 1].length : char_index + text.length], config.history_group_delay || 100);
        this._model.add_text(row_index, char_index, text);
        // Move other cursors.
        this._cursors.cursors.forEach(function (cursor) {
            if (cursor !== _this) {
                var changed = false;
                // If the cursor is on the row where the text was added, and is
                // at or after the insertion point, move the cursor over.  If
                // the cursor is on a line below the line where the text was
                // inserted, move the cursor down the number of lines inserted.
                // Do this for both primary and secondary cursors.
                if (cursor.primary_row === row_index && cursor.primary_char >= char_index) {
                    cursor.primary_char += lines[lines.length - 1].length;
                    changed = true;
                }
                if (lines.length > 1 && cursor.primary_row >= row_index) {
                    cursor.primary_row += lines.length - 1;
                    changed = true;
                }
                if (cursor.secondary_row === row_index && cursor.secondary_char >= char_index) {
                    cursor.secondary_char += lines[lines.length - 1].length;
                    changed = true;
                }
                if (lines.length > 1 && cursor.secondary_row >= row_index) {
                    cursor.secondary_row += lines.length - 1;
                    changed = true;
                }
                if (changed) {
                    cursor.trigger('change');
                }
            }
        });
    };
    /**
     * Removes text from the model while keeping track of the history.
     */
    Cursor.prototype.model_remove_text = function (start_row, start_char, end_row, end_char) {
        var _this = this;
        var text = this._model.get_text(start_row, start_char, end_row, end_char);
        this._push_history('model_remove_text', [start_row, start_char, end_row, end_char], 'model_add_text', [start_row, start_char, text], config.history_group_delay || 100);
        this._model.remove_text(start_row, start_char, end_row, end_char);
        // Move other cursors.
        this._cursors.cursors.forEach(function (cursor) {
            if (cursor !== _this) {
                var changed = false;
                // If cursor is within removed region, move the cursor to
                // the start of the region.  Do this for both primary and
                // secondary coordinates.
                var within = false;
                if (start_row <= cursor.primary_row && cursor.primary_row <= end_row) {
                    if (start_row < cursor.primary_row && cursor.primary_row < end_row) {
                        within = true;
                    }
                    else {
                        within = true;
                        if (cursor.primary_row === start_row && cursor.primary_char < start_char) {
                            within = false;
                        }
                        if (cursor.primary_row === end_row && cursor.primary_char > end_char) {
                            within = false;
                        }
                    }
                }
                if (within) {
                    cursor.primary_row = start_row;
                    cursor.primary_char = start_char;
                    changed = true;
                }
                else {
                    // If the cursor is on or after the removed region move it up 
                    // the number of lines removed.
                    // 
                    // If the cursor is after the removed region, but on the same
                    // line as the last line of the removed text, move the cursor
                    // backwards the amount of characters on that line.  Do this 
                    // for both primary and secondary coordinates.
                    if (cursor.primary_row >= end_row) {
                        cursor.primary_row -= end_row - start_row;
                        if (cursor.primary_row === end_row && cursor.primary_char >= end_char) {
                            cursor.primary_char += start_char - end_char;
                        }
                        changed = true;
                    }
                }
                within = false;
                if (start_row <= cursor.secondary_row && cursor.secondary_row <= end_row) {
                    if (start_row < cursor.secondary_row && cursor.secondary_row < end_row) {
                        within = true;
                    }
                    else {
                        within = true;
                        if (cursor.secondary_row === start_row && cursor.secondary_char < start_char) {
                            within = false;
                        }
                        if (cursor.secondary_row === end_row && cursor.secondary_char > end_char) {
                            within = false;
                        }
                    }
                }
                if (within) {
                    cursor.secondary_row = start_row;
                    cursor.secondary_char = start_char;
                    changed = true;
                }
                else {
                    // If the cursor is on or after the removed region move it up 
                    // the number of lines removed.
                    // 
                    // If the cursor is after the removed region, but on the same
                    // line as the last line of the removed text, move the cursor
                    // backwards the amount of characters on that line.  Do this 
                    // for both primary and secondary coordinates.
                    if (cursor.secondary_row >= end_row) {
                        cursor.secondary_row -= end_row - start_row;
                        if (cursor.secondary_row === end_row && cursor.secondary_char >= end_char) {
                            cursor.secondary_char += start_char - end_char;
                        }
                        changed = true;
                    }
                }
                if (changed) {
                    cursor.trigger('change');
                }
            }
        });
    };
    /**
     * Adds a row of text while keeping track of the history.
     */
    Cursor.prototype.model_add_row = function (row_index, text) {
        var _this = this;
        this._push_history('model_add_row', [row_index, text], 'model_remove_row', [row_index], config.history_group_delay || 100);
        this._model.add_row(row_index, text);
        // Move other cursors.
        this._cursors.cursors.forEach(function (cursor) {
            if (cursor !== _this) {
                var changed = false;
                // Cursors on or below the inserted row should be moved 
                // down a row.
                if (cursor.primary_row >= row_index) {
                    cursor.primary_row += 1;
                    changed = true;
                }
                if (cursor.secondary_row >= row_index) {
                    cursor.secondary_row += 1;
                    changed = true;
                }
                if (changed) {
                    cursor.trigger('change');
                }
            }
        });
    };
    /**
     * Removes a row of text while keeping track of the history.
     */
    Cursor.prototype.model_remove_row = function (row_index) {
        var _this = this;
        this._push_history('model_remove_row', [row_index], 'model_add_row', [row_index, this._model._rows[row_index]], config.history_group_delay || 100);
        this._model.remove_row(row_index);
        // Move other cursors.
        this._cursors.cursors.forEach(function (cursor) {
            if (cursor !== _this) {
                var changed = false;
                // For cursors on or below the removed line, move them up 
                // a line if possible.
                if (cursor.primary_row >= row_index) {
                    if (cursor.primary_row === 0) {
                        cursor.primary_char = 0;
                    }
                    else {
                        cursor.primary_row -= 1;
                    }
                    changed = true;
                }
                if (cursor.secondary_row >= row_index) {
                    if (cursor.secondary_row === 0) {
                        cursor.secondary_char = 0;
                    }
                    else {
                        cursor.secondary_row -= 1;
                    }
                    changed = true;
                }
                if (changed) {
                    cursor.trigger('change');
                }
            }
        });
    };
    /**
     * Reset the secondary cursor to the value of the primary.
     */
    Cursor.prototype._reset_secondary = function () {
        this.secondary_row = this.primary_row;
        this.secondary_char = this.primary_char;
        this.trigger('change');
    };
    /**
     * Record the starting state of the cursor for the history buffer.
     */
    Cursor.prototype._start_historical_move = function () {
        if (!this._historical_start) {
            this._historical_start = this.get_state();
        }
    };
    /**
     * Record the ending state of the cursor for the history buffer, then
     * push a reversable action describing the change of the cursor.
     */
    Cursor.prototype._end_historical_move = function () {
        this._push_history('set_state', [this.get_state()], 'set_state', [this._historical_start], config.history_group_delay || 100);
        this._historical_start = null;
    };
    /**
     * Makes a list of indentation strings used to indent one level,
     * ordered by usage preference.
     */
    Cursor.prototype._make_indents = function () {
        var indents = [];
        if (config.use_spaces) {
            var indent = '';
            for (var i = 0; i < config.tab_width; i++) {
                indent += ' ';
                indents.push(indent);
            }
            indents.reverse();
        }
        indents.push('\t');
        return indents;
    };
    /**
     * Registers an action API with the map
     */
    Cursor.prototype._register_api = function () {
        var _this = this;
        var p = utils.proxy(this._validation_lock_proxy, this);
        register('cursor.set_state', p(this.set_state), this);
        register('cursor.remove_selected', p(this.remove_selected), this);
        register('cursor.keypress', p(this.keypress), this);
        register('cursor.indent', p(this.indent), this);
        register('cursor.unindent', p(this.unindent), this);
        register('cursor.newline', p(this.newline), this);
        register('cursor.insert_text', p(this.insert_text), this);
        register('cursor.delete_backward', p(this.delete_backward), this);
        register('cursor.delete_forward', p(this.delete_forward), this);
        register('cursor.delete_word_left', p(this.delete_word_left), this);
        register('cursor.delete_word_right', p(this.delete_word_right), this);
        register('cursor.select_all', p(this.select_all), this);
        register('cursor.left', p(function () {
            _this.move_primary(-1, 0, true);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.right', p(function () {
            _this.move_primary(1, 0, true);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.up', p(function () {
            _this.move_primary(0, -1, true);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.down', p(function () {
            _this.move_primary(0, 1, true);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.select_left', p(function () {
            _this.move_primary(-1, 0);
            return true;
        }), this);
        register('cursor.select_right', p(function () {
            _this.move_primary(1, 0);
            return true;
        }), this);
        register('cursor.select_up', p(function () {
            _this.move_primary(0, -1);
            return true;
        }), this);
        register('cursor.select_down', p(function () {
            _this.move_primary(0, 1);
            return true;
        }), this);
        register('cursor.word_left', p(function () {
            _this.word_primary(-1);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.word_right', p(function () {
            _this.word_primary(1);
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.select_word_left', p(function () {
            _this.word_primary(-1);
            return true;
        }), this);
        register('cursor.select_word_right', p(function () {
            _this.word_primary(1);
            return true;
        }), this);
        register('cursor.line_start', p(function () {
            _this.primary_goto_start();
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.line_end', p(function () {
            _this.primary_goto_end();
            _this._reset_secondary();
            return true;
        }), this);
        register('cursor.select_line_start', p(function () {
            _this.primary_goto_start();
            return true;
        }), this);
        register('cursor.select_line_end', p(function () {
            _this.primary_goto_end();
            return true;
        }), this);
    };
    /**
     * Proxy a method for this context, preventing validation from running while
     * it runs.
     */
    Cursor.prototype._validation_lock_proxy = function (x) {
        var _this = this;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            _this._cursors.lock_validation();
            try {
                return x.apply(_this, args);
            }
            finally {
                _this._cursors.unlock_validation();
                setTimeout(utils.proxy(_this._cursors.validate, _this._cursors), 0);
            }
        };
    };
    return Cursor;
})(utils.PosterClass);
exports.Cursor = Cursor;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/cursor.js","/control")
},{"../utils/config":39,"../utils/utils":41,"./map":11,"buffer":1,"oMfpAn":4}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./map');
var register = keymap.Map.register;
var cursor = require('./cursor');
var utils = require('../utils/utils');
/**
 * Manages one or more cursors
 */
var Cursors = (function (_super) {
    __extends(Cursors, _super);
    function Cursors(el, model, clipboard, history) {
        _super.call(this);
        this._validate_lock = false;
        this._el = el;
        this._model = model;
        this.get_row_char = undefined;
        this.cursors = [];
        this._selecting_text = false;
        this._clipboard = clipboard;
        this._history = history;
        // Create initial cursor.
        this.create(undefined, false);
        // Register actions.
        register('cursors._cursor_proxy', this._validation_lock_proxy(this._cursor_proxy));
        register('cursors.create', this._validation_lock_proxy(this.create));
        register('cursors.single', this._validation_lock_proxy(this.single));
        register('cursors.pop', this._validation_lock_proxy(this.pop));
        register('cursors.remove', this._validation_lock_proxy(this.remove));
        register('cursors.start_new_selection', this._validation_lock_proxy(this.start_new_selection));
        register('cursors.start_selection', this._validation_lock_proxy(this.start_selection));
        register('cursors.set_selection', this._validation_lock_proxy(this.set_selection));
        register('cursors.start_set_selection', this._validation_lock_proxy(this.start_set_selection));
        register('cursors.end_selection', this._validation_lock_proxy(this.end_selection));
        register('cursors.select_word', this._validation_lock_proxy(this.select_word));
        // Bind clipboard events.
        this._clipboard.on('cut', this._validation_lock_proxy(this._handle_cut));
        this._clipboard.on('copy', this._validation_lock_proxy(this._handle_copy));
        this._clipboard.on('paste', this._validation_lock_proxy(this._handle_paste));
    }
    /**
     * Creates a cursor and manages it.
     * @param [state] state to apply to the new cursor.
     * @param [reversable] - defaults to true, is action reversable.
     */
    Cursors.prototype.create = function (state, reversable) {
        var _this = this;
        // Record this action in history.
        if (reversable === undefined || reversable === true) {
            this._history.push_action('cursors.create', utils.args(arguments), 'cursors.pop', []);
        }
        // Create a proxying history method for the cursor itself.
        var index = this.cursors.length;
        var history_proxy = function (forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
            _this._history.push_action('cursors._cursor_proxy', [index, forward_name, forward_params], 'cursors._cursor_proxy', [index, backward_name, backward_params], autogroup_delay);
        };
        // Create the cursor.
        var new_cursor = new cursor.Cursor(this._model, history_proxy, this);
        this.cursors.push(new_cursor);
        // Set the initial properties of the cursor.
        if (state)
            new_cursor.set_state(state, false);
        // Listen for cursor change events.
        new_cursor.on('change', function () {
            _this.trigger('change', new_cursor);
            _this._update_selection();
            _this.validate();
        });
        this.trigger('change', new_cursor);
        return new_cursor;
    };
    /**
     * Remove every cursor except for the first one.
     */
    Cursors.prototype.single = function () {
        while (this.cursors.length > 1) {
            this.pop();
        }
    };
    /**
     * Remove the last cursor.
     * @returns last cursor or null
     */
    Cursors.prototype.pop = function () {
        return this.remove(this.cursors.length - 1);
    };
    /**
     * Removes a cursor.
     * @returns cursor or null
     */
    Cursors.prototype.remove = function (index) {
        if (index >= this.cursors.length)
            return null;
        // Remove the last cursor and unregister it.
        var cursor = this.cursors.splice(index, 1)[0];
        cursor.unregister();
        cursor.off('change');
        // Record this action in history.
        this._history.push_action('cursors.remove', [index], 'cursors.create', [cursor.get_state()]);
        // Alert listeners of changes.
        this.trigger('change');
        return cursor;
    };
    /**
     * Creates a cursor and starts selecting text from mouse coordinates.
     * @param e - mouse event containing the coordinates.
     */
    Cursors.prototype.start_new_selection = function (e) {
        this.create();
        this.start_selection(e, false);
    };
    /**
     * Starts selecting text from mouse coordinates.
     * @param e - mouse event containing the coordinates.
     */
    Cursors.prototype.start_selection = function (e, remove_others) {
        if (remove_others === void 0) { remove_others = true; }
        if (remove_others) {
            this.single();
        }
        var x = e.offsetX;
        var y = e.offsetY;
        this._selecting_text = true;
        if (this.get_row_char) {
            var location = this.get_row_char(x, y);
            this.cursors[this.cursors.length - 1].set_both(location.row_index, location.char_index);
        }
    };
    /**
     * Finalizes the selection of text.
     */
    Cursors.prototype.end_selection = function () {
        this._selecting_text = false;
    };
    /**
     * Sets the endpoint of text selection from mouse coordinates.
     * @param  e - mouse event containing the coordinates.
     */
    Cursors.prototype.set_selection = function (e) {
        var touchpane = this._el.getBoundingClientRect();
        var x = e.clientX - touchpane.left;
        var y = e.clientY - touchpane.top;
        if (this._selecting_text && this.get_row_char) {
            var location = this.get_row_char(x, y);
            this.cursors[this.cursors.length - 1].set_primary(location.row_index, location.char_index);
        }
    };
    /**
     * Sets the endpoint of text selection from mouse coordinates.
     * Different than set_selection because it doesn't need a call
     * to start_selection to work.
     * @param e - mouse event containing the coordinates.
     */
    Cursors.prototype.start_set_selection = function (e) {
        this._selecting_text = true;
        this.set_selection(e);
    };
    /**
     * Selects a word at the given mouse coordinates.
     * @param e - mouse event containing the coordinates.
     */
    Cursors.prototype.select_word = function (e) {
        var x = e.offsetX;
        var y = e.offsetY;
        if (this.get_row_char) {
            var location = this.get_row_char(x, y);
            this.cursors[this.cursors.length - 1].select_word(location.row_index, location.char_index);
        }
    };
    /**
     * Prevents the cursors from validating.
     */
    Cursors.prototype.lock_validation = function () {
        this._validate_lock = true;
    };
    /**
     * Allows the cursors to validate.
     */
    Cursors.prototype.unlock_validation = function () {
        this._validate_lock = false;
    };
    /**
     * Reduces overlapping cursors and validates cursor coordinates.
     * Complexity: O(n*ceil(n/2)-(n%2-1)*n/2) ~ O(n^2)
     */
    Cursors.prototype.validate = function () {
        if (this._validate_lock)
            return;
        try {
            this._validate_lock = true;
            // Validate cursors
            var i;
            for (i = 0; i < this.cursors.length; i++) {
                var changed = false;
                var cursor = this.cursors[i];
                if (cursor.primary_row >= this._model._rows.length) {
                    cursor.primary_row = Math.max(0, this._model._rows.length - 1);
                    changed = true;
                }
                if (cursor.primary_char > this._model._rows[cursor.primary_row].length) {
                    cursor.primary_char = this._model._rows[cursor.primary_row].length;
                    changed = true;
                }
                if (cursor.secondary_row >= this._model._rows.length) {
                    cursor.secondary_row = Math.max(0, this._model._rows.length - 1);
                    changed = true;
                }
                if (cursor.secondary_char > this._model._rows[cursor.secondary_row].length) {
                    cursor.secondary_char = this._model._rows[cursor.secondary_row].length;
                    changed = true;
                }
                if (changed) {
                    cursor.trigger('change');
                }
            }
            for (i = 0; i < this.cursors.length - 1; i++) {
                for (var j = i + 1; j < this.cursors.length; j++) {
                    var a = this.cursors[i];
                    var b = this.cursors[j];
                    // Intersection test
                    //   as     ae  bs      be
                    //   bs <= ae && be >= as
                    if (b.start_row <= a.end_row && b.end_row >= a.start_row) {
                        if (!(b.start_row === a.end_row && b.start_char > a.end_char || b.end_row === a.start_row && b.end_char < a.start_char)) {
                            var newstartrow = Math.min(a.start_row, b.start_row);
                            var newendrow = Math.min(a.end_row, b.end_row);
                            var newstartchar;
                            var newendchar;
                            if (a.start_row < b.start_row) {
                                newstartchar = a.start_char;
                            }
                            else if (a.start_row > b.start_row) {
                                newstartchar = b.start_char;
                            }
                            else {
                                newstartchar = Math.min(a.start_char, b.start_char);
                            }
                            if (a.end_row < b.end_row) {
                                newendchar = b.end_char;
                            }
                            else if (a.end_row > b.end_row) {
                                newendchar = a.end_char;
                            }
                            else {
                                newendchar = Math.max(a.end_char, b.end_char);
                            }
                            // Determine if the start should be primary or the
                            // end.
                            if ((a.primary_row === newstartrow && a.primary_char === newstartchar) || (b.primary_row === newstartrow && b.primary_char === newstartchar)) {
                                a.primary_row = newstartrow;
                                a.primary_char = newstartchar;
                                a.secondary_row = newendrow;
                                a.secondary_char = newendchar;
                            }
                            else {
                                a.secondary_row = newstartrow;
                                a.secondary_char = newstartchar;
                                a.primary_row = newendrow;
                                a.primary_char = newendchar;
                            }
                            a.trigger('change');
                            this.remove(j);
                        }
                    }
                }
            }
        }
        finally {
            this._validate_lock = false;
        }
    };
    /**
     * Proxy a method for this context, preventing validation from running while
     * it runs.
     */
    Cursors.prototype._validation_lock_proxy = function (x) {
        var _this = this;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            _this.lock_validation();
            try {
                return x.apply(_this, args);
            }
            finally {
                _this.unlock_validation();
                setTimeout(utils.proxy(_this.validate, _this));
            }
        };
    };
    /**
     * Handles history proxy events for individual cursors.
     * @param cursor_index
     * @param function_name
     * @param function_params
     */
    Cursors.prototype._cursor_proxy = function (cursor_index, function_name, function_params) {
        if (cursor_index < this.cursors.length) {
            var cursor = this.cursors[cursor_index];
            cursor[function_name].apply(cursor, function_params);
        }
    };
    /**
     * Handles when the selected text is copied to the clipboard.
     * @param text - by val text that was cut
     */
    Cursors.prototype._handle_copy = function (text) {
        this.cursors.forEach(function (cursor) { return cursor.copy(); });
    };
    /**
     * Handles when the selected text is cut to the clipboard.
     * @param text - by val text that was cut
     */
    Cursors.prototype._handle_cut = function (text) {
        this.cursors.forEach(function (cursor) { return cursor.cut(); });
    };
    /**
     * Handles when text is pasted into the document.
     */
    Cursors.prototype._handle_paste = function (text) {
        // If the modulus of the number of cursors and the number of pasted lines
        // of text is zero, split the cut lines among the cursors.
        var lines = text.split('\n');
        if (this.cursors.length > 1 && lines.length > 1 && lines.length % this.cursors.length === 0) {
            var lines_per_cursor = lines.length / this.cursors.length;
            this.cursors.forEach(function (cursor, index) {
                cursor.insert_text(lines.slice(index * lines_per_cursor, index * lines_per_cursor + lines_per_cursor).join('\n'));
            });
        }
        else {
            this.cursors.forEach(function (cursor) { return cursor.paste(text); });
        }
    };
    /**
     * Update the clippable text based on new selection.
     */
    Cursors.prototype._update_selection = function () {
        // Copy all of the selected text.
        var selections = [];
        this.cursors.forEach(function (cursor) { return selections.push(cursor.get()); });
        // Make the copied text clippable.
        this._clipboard.set_clippable(selections.join('\n'));
    };
    return Cursors;
})(utils.PosterClass);
exports.Cursors = Cursors;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/cursors.js","/control")
},{"../utils/utils":41,"./cursor":7,"./map":11,"buffer":1,"oMfpAn":4}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var _map;
if (navigator.appVersion.indexOf("Mac") != -1) {
    _map = {
        'alt-leftarrow': 'cursor.word_left',
        'alt-rightarrow': 'cursor.word_right',
        'shift-alt-leftarrow': 'cursor.select_word_left',
        'shift-alt-rightarrow': 'cursor.select_word_right',
        'alt-backspace': 'cursor.delete_word_left',
        'alt-delete': 'cursor.delete_word_right',
        'meta-leftarrow': 'cursor.line_start',
        'meta-rightarrow': 'cursor.line_end',
        'shift-meta-leftarrow': 'cursor.select_line_start',
        'shift-meta-rightarrow': 'cursor.select_line_end',
        'meta-a': 'cursor.select_all',
        'meta-z': 'history.undo',
        'meta-y': 'history.redo',
        'meta-mouse0-down': 'cursors.start_new_selection',
        'meta-mouse-move': 'cursors.set_selection',
        'meta-mouse0-up': 'cursors.end_selection'
    };
}
else {
    _map = {
        'ctrl-leftarrow': 'cursor.word_left',
        'ctrl-rightarrow': 'cursor.word_right',
        'ctrl-backspace': 'cursor.delete_word_left',
        'ctrl-delete': 'cursor.delete_word_right',
        'shift-ctrl-leftarrow': 'cursor.select_word_left',
        'shift-ctrl-rightarrow': 'cursor.select_word_right',
        'home': 'cursor.line_start',
        'end': 'cursor.line_end',
        'shift-home': 'cursor.select_line_start',
        'shift-end': 'cursor.select_line_end',
        'ctrl-a': 'cursor.select_all',
        'ctrl-z': 'history.undo',
        'ctrl-y': 'history.redo',
        'ctrl-mouse0-down': 'cursors.start_new_selection',
        'ctrl-mouse-move': 'cursors.set_selection',
        'ctrl-mouse0-up': 'cursors.end_selection'
    };
}
// Common bindings
_map['keypress'] = 'cursor.keypress';
_map['enter'] = 'cursor.newline';
_map['delete'] = 'cursor.delete_forward';
_map['backspace'] = 'cursor.delete_backward';
_map['leftarrow'] = 'cursor.left';
_map['rightarrow'] = 'cursor.right';
_map['uparrow'] = 'cursor.up';
_map['downarrow'] = 'cursor.down';
_map['shift-leftarrow'] = 'cursor.select_left';
_map['shift-rightarrow'] = 'cursor.select_right';
_map['shift-uparrow'] = 'cursor.select_up';
_map['shift-downarrow'] = 'cursor.select_down';
_map['mouse0-dblclick'] = 'cursors.select_word';
_map['mouse0-down'] = 'cursors.start_selection';
_map['mouse-move'] = 'cursors.set_selection';
_map['mouse0-up'] = 'cursors.end_selection';
_map['shift-mouse0-up'] = 'cursors.end_selection';
_map['shift-mouse0-down'] = 'cursors.start_set_selection';
_map['shift-mouse-move'] = 'cursors.set_selection';
_map['tab'] = 'cursor.indent';
_map['shift-tab'] = 'cursor.unindent';
_map['escape'] = 'cursors.single';
exports.map = _map;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/default.js","/control")
},{"buffer":1,"oMfpAn":4}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
var keymap = require('./map');
/**
 * Reversible action history.
 */
var History = (function (_super) {
    __extends(History, _super);
    function History(map) {
        _super.call(this);
        this._map = map;
        this._actions = [];
        this._action_groups = [];
        this._undone = [];
        this._autogroup = null;
        this._action_lock = false;
        keymap.Map.register('history.undo', utils.proxy(this.undo, this));
        keymap.Map.register('history.redo', utils.proxy(this.redo, this));
    }
    /**
     * Push a reversible action to the history.
     * @param forward_name - name of the forward action
     * @param forward_params - parameters to use when invoking the forward action
     * @param backward_name - name of the backward action
     * @param backward_params - parameters to use when invoking the backward action
     * @param [autogroup_delay] - time to wait to automatically group the actions.
     *                            If this is undefined, autogrouping will not occur.
     */
    History.prototype.push_action = function (forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
        var _this = this;
        if (this._action_lock)
            return;
        this._actions.push({
            forward: {
                name: forward_name,
                parameters: forward_params,
            },
            backward: {
                name: backward_name,
                parameters: backward_params,
            }
        });
        this._undone = [];
        // If a delay is defined, prepare a timeout to autogroup.
        if (autogroup_delay !== undefined) {
            // If another timeout was already set, cancel it.
            if (this._autogroup !== null) {
                clearTimeout(this._autogroup);
            }
            // Set a new timeout.
            this._autogroup = setTimeout(function () {
                _this.group_actions();
            }, autogroup_delay);
        }
    };
    /**
     * Commit the pushed actions to one group.
     */
    History.prototype.group_actions = function () {
        this._autogroup = null;
        if (this._action_lock)
            return;
        this._action_groups.push(this._actions);
        this._actions = [];
        this._undone = [];
    };
    /**
     * Undo one set of actions.
     */
    History.prototype.undo = function () {
        var _this = this;
        // If a timeout is set, group now.
        if (this._autogroup !== null) {
            clearTimeout(this._autogroup);
            this.group_actions();
        }
        var undo;
        if (this._actions.length > 0) {
            undo = this._actions;
        }
        else if (this._action_groups.length > 0) {
            undo = this._action_groups.pop();
            undo.reverse();
        }
        else {
            return true;
        }
        // Undo the actions.
        if (!this._action_lock) {
            this._action_lock = true;
            try {
                undo.forEach(function (action) {
                    _this._map.invoke(action.backward.name, action.backward.parameters);
                });
            }
            finally {
                this._action_lock = false;
            }
        }
        // Allow the action to be redone.
        this._undone.push(undo);
        return true;
    };
    /**
     * Redo one set of actions.
     */
    History.prototype.redo = function () {
        var _this = this;
        if (this._undone.length > 0) {
            var redo = this._undone.pop();
            // Redo the actions.
            if (!this._action_lock) {
                this._action_lock = true;
                try {
                    redo.forEach(function (action) {
                        _this._map.invoke(action.forward.name, action.forward.parameters);
                    });
                }
                finally {
                    this._action_lock = false;
                }
            }
            // Allow the action to be undone.
            this._action_groups.push(redo);
        }
        return true;
    };
    return History;
})(utils.PosterClass);
exports.History = History;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/history.js","/control")
},{"../utils/utils":41,"./map":11,"buffer":1,"oMfpAn":4}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils/utils');
/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Map = (function (_super) {
    __extends(Map, _super);
    function Map(normalizer) {
        _super.call(this);
        /**
         * Registers an action.
         * @param name - name of the action
         * @param f
         * @param (optional) tag - allows you to specify a tag
         *                  which can be used with the `unregister_by_tag`
         *                  method to quickly unregister actions with
         *                  the tag specified.
         */
        this.register = function (name, f, tag) {
            return Map.register(name, f, tag);
        };
        /**
         * Unregister an action.
         * @param name - name of the action
         * @param f
         * @return true if action was found and unregistered
         */
        this.unregister = function (name, f) {
            return Map.unregister(name, f);
        };
        /**
         * Unregisters all of the actions registered with a given tag.
         * @param tag - specified in Map.register.
         * @return true if the tag was found and deleted.
         */
        this.unregister_by_tag = function (tag) {
            return Map.unregister_by_tag(tag);
        };
        this._map = {};
        // Create normalizer property
        this._normalizer = null;
        this._proxy_handle_event = utils.proxy(this._handle_event, this);
        // If defined, set the normalizer.
        if (normalizer)
            this.normalizer = normalizer;
    }
    Object.defineProperty(Map.prototype, "normalizer", {
        get: function () {
            return this._normalizer;
        },
        set: function (value) {
            // Remove event handler.
            if (this._normalizer)
                this._normalizer.off_all(this._proxy_handle_event);
            // Set, and add event handler.
            this._normalizer = value;
            if (value)
                value.on_all(this._proxy_handle_event);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Append event actions to the map.
     *
     * The map allows you to register actions for keys.
     * Example:
     *     map.map({
     *         'ctrl-a': 'cursors.select_all',
     *     })
     *
     * Multiple actions can be registered for a single event.
     * The actions are executed sequentially, until one action
     * returns `true` in which case the execution haults.  This
     * allows actions to run conditionally.
     * Example:
     *     // Implementing a dual mode editor, you may have two
     *     // functions to register for one key. i.e.:
     *     var do_a = function(e) {
     *         if (mode=='edit') {
     *             console.log('A');
     *             return true;
     *         }
     *     }
     *     var do_b = function(e) {
     *         if (mode=='command') {
     *             console.log('B');
     *             return true;
     *         }
     *     }
     *
     *     // To register both for one key
     *     Map.register('action_a', do_a);
     *     Map.register('action_b', do_b);
     *     map.map({
     *         'alt-v': ['action_a', 'action_b'],
     *     });
     */
    Map.prototype.map = function (keyactions) {
        var _this = this;
        var parsed = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(function (key) {
            if (_this._map[key] === undefined) {
                _this._map[key] = parsed[key];
            }
            else {
                _this._map[key] = _this._map[key].concat(parsed[key]);
            }
        });
    };
    /**
     * Prepend event actions to the map.
     *
     * See the doc for `map` for a detailed description of
     * possible input values.
     */
    Map.prototype.prepend_map = function (keyactions) {
        var _this = this;
        var parsed = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(function (key) {
            if (_this._map[key] === undefined) {
                _this._map[key] = parsed[key];
            }
            else {
                _this._map[key] = parsed[key].concat(_this._map[key]);
            }
        });
    };
    /**
     * Unmap event actions in the map.
     *
     * See the doc for `map` for a detailed description of
     * possible input values.
     */
    Map.prototype.unmap = function (keyactions) {
        var _this = this;
        var parsed = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(function (key) {
            if (_this._map[key] !== undefined) {
                parsed[key].forEach(function (value) {
                    var index = _this._map[key].indexOf(value);
                    if (index != -1) {
                        _this._map[key].splice(index, 1);
                    }
                });
            }
        });
    };
    /**
     * Get a modifiable array of the actions for a particular event.
     * @return by ref copy of the actions registered to an event.
     */
    Map.prototype.get_mapping = function (event) {
        return this._map[this._normalize_event_name(event)];
    };
    /**
     * Invokes the callbacks of an action by name.
     * @param name
     * @param [args] - arguments to pass to the action callback[s]
     * @return true if one or more of the actions returned true
     */
    Map.prototype.invoke = function (name, args) {
        var action_callbacks = Map.registry[name];
        if (action_callbacks) {
            var returns = [];
            action_callbacks.forEach(function (action_callback) {
                returns.push(action_callback.apply(undefined, args) === true);
            });
            // If one of the action callbacks returned true, cancel bubbling.
            if (returns.some(function (x) {
                return x;
            })) {
                return true;
            }
        }
        return false;
    };
    /**
     * Parse the arguments to a map function.
     */
    Map.prototype._parse_map_arguments = function (keyactions) {
        var _this = this;
        var parsed = {};
        Object.keys(keyactions).forEach(function (key) {
            var normalized_key = _this._normalize_event_name(key);
            // If the value is not an array, wrap it in one.
            var value;
            if (!utils.is_array(keyactions[key])) {
                value = [keyactions[key]];
            }
            else {
                value = keyactions[key];
            }
            // If the key is already defined, concat the values to
            // it.  Otherwise, set it.
            if (parsed[normalized_key] === undefined) {
                parsed[normalized_key] = value;
            }
            else {
                parsed[normalized_key] = parsed[normalized_key].concat(value);
            }
        });
        return parsed;
    };
    /**
     * Handles a normalized event.
     * @param name - name of the event
     * @param e - browser Event object
     */
    Map.prototype._handle_event = function (name, e) {
        var _this = this;
        var normalized_event = this._normalize_event_name(name);
        var action_names = this._map[normalized_event];
        if (action_names) {
            action_names.forEach(function (action_name) {
                if (_this.invoke(action_name, [e])) {
                    utils.cancel_bubble(e);
                }
            });
        }
    };
    /**
     * Alphabetically sorts keys in event name, so
     * @return normalized event name
     */
    Map.prototype._normalize_event_name = function (name) {
        return name.toLowerCase().trim().split('-').sort().join('-');
    };
    Map.registry = {};
    Map._registry_tags = {};
    /**
     * Registers an action.
     * @param name - name of the action
     * @param f
     * @param (optional) tag - allows you to specify a tag
     *                  which can be used with the `unregister_by_tag`
     *                  method to quickly unregister actions with
     *                  the tag specified.
     */
    Map.register = function (name, f, tag) {
        if (utils.is_array(Map.registry[name])) {
            Map.registry[name].push(f);
        }
        else {
            Map.registry[name] = [f];
        }
        if (tag) {
            var tag_hash = utils.hash(tag);
            if (Map._registry_tags[tag_hash] === undefined) {
                Map._registry_tags[tag_hash] = [];
            }
            Map._registry_tags[tag_hash].push({ name: name, f: f });
        }
    };
    /**
     * Unregister an action.
     * @param name - name of the action
     * @param f
     * @return true if action was found and unregistered
     */
    Map.unregister = function (name, f) {
        var index = Map.registry[name].indexOf(f);
        if (index != -1) {
            Map.registry[name].splice(index, 1);
            return true;
        }
        return false;
    };
    /**
     * Unregisters all of the actions registered with a given tag.
     * @param tag - specified in Map.register.
     * @return true if the tag was found and deleted.
     */
    Map.unregister_by_tag = function (tag) {
        var tag_hash = utils.hash(tag);
        if (Map._registry_tags[tag_hash]) {
            Map._registry_tags[tag_hash].forEach(function (registration) {
                Map.unregister(registration.name, registration.f);
            });
            delete Map._registry_tags[tag_hash];
            return true;
        }
    };
    return Map;
})(utils.PosterClass);
exports.Map = Map;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/map.js","/control")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils/utils');
/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Normalizer = (function (_super) {
    __extends(Normalizer, _super);
    function Normalizer() {
        _super.call(this);
        this._el_hooks = {};
    }
    /**
     * Listen to the events of an element.
     */
    Normalizer.prototype.listen_to = function (el, mouse, keyboard) {
        if (mouse === void 0) { mouse = true; }
        if (keyboard === void 0) { keyboard = true; }
        var hooks = [];
        if (keyboard) {
            hooks.push(utils.hook(el, 'onkeypress', this._proxy('press', this._handle_keypress_event, el)));
            hooks.push(utils.hook(el, 'onkeydown', this._proxy('down', this._handle_keyboard_event, el)));
            hooks.push(utils.hook(el, 'onkeyup', this._proxy('up', this._handle_keyboard_event, el)));
            hooks.push(utils.hook(el, 'ondblclick', this._proxy('dblclick', this._handle_mouse_event, el)));
            hooks.push(utils.hook(el, 'onclick', this._proxy('click', this._handle_mouse_event, el)));
        }
        if (mouse) {
            hooks.push(utils.hook(el, 'onmousedown', this._proxy('down', this._handle_mouse_event, el)));
            hooks.push(utils.hook(el, 'onmouseup', this._proxy('up', this._handle_mouse_event, el)));
            hooks.push(utils.hook(el, 'onmousemove', this._proxy('move', this._handle_mousemove_event, el)));
        }
        this._el_hooks[utils.hash(el)] = hooks;
    };
    /**
     * Stops listening to an element.
     */
    Normalizer.prototype.stop_listening_to = function (el) {
        var key = utils.hash(el);
        if (this._el_hooks[key] !== undefined) {
            this._el_hooks[key].forEach(function (hook) { return hook.unhook(); });
            delete this._el_hooks[key];
        }
    };
    /**
     * Handles when a mouse event occurs
     */
    Normalizer.prototype._handle_mouse_event = function (el, event_name, e) {
        e = e || window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
    };
    /**
     * Handles when a mouse event occurs
     */
    Normalizer.prototype._handle_mousemove_event = function (el, event_name, e) {
        e = e || window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
    };
    /**
     * Handles when a keyboard event occurs
     */
    Normalizer.prototype._handle_keyboard_event = function (el, event_name, e) {
        e = e || window.event;
        var keyname = this._lookup_keycode(e.keyCode);
        if (keyname !== undefined) {
            this.trigger(this._modifier_string(e) + keyname + '-' + event_name, e);
            if (event_name == 'down') {
                this.trigger(this._modifier_string(e) + keyname, e);
            }
        }
        this.trigger(this._modifier_string(e) + String(e.keyCode) + '-' + event_name, e);
        this.trigger('key' + event_name, e);
    };
    /**
     * Handles when a keypress event occurs
     */
    Normalizer.prototype._handle_keypress_event = function (el, event_name, e) {
        this.trigger('keypress', e);
    };
    /**
     * Creates an element event proxy.
     */
    Normalizer.prototype._proxy = function (event_name, f, el) {
        var that = this;
        return function () {
            var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
            return f.apply(that, args);
        };
    };
    /**
     * Create a modifiers string from an event.
     * @return dash separated modifier string
     */
    Normalizer.prototype._modifier_string = function (e) {
        var modifiers = [];
        if (e.ctrlKey)
            modifiers.push('ctrl');
        if (e.altKey)
            modifiers.push('alt');
        if (e.shiftKey)
            modifiers.push('shift');
        // Hack, metaKey not recognized by TypeScript.
        if (e.metaKey)
            modifiers.push('meta');
        var string = modifiers.sort().join('-');
        if (string.length > 0)
            string = string + '-';
        return string;
    };
    /**
     * Lookup the human friendly name for a keycode.
     * @return key name
     */
    Normalizer.prototype._lookup_keycode = function (keycode) {
        if (112 <= keycode && keycode <= 123) {
            return 'f' + (keycode - 111);
        }
        else if (48 <= keycode && keycode <= 57) {
            return String(keycode - 48);
        }
        else if (65 <= keycode && keycode <= 90) {
            return 'abcdefghijklmnopqrstuvwxyz'.substring(keycode - 65, keycode - 64);
        }
        else {
            var codes = {
                8: 'backspace',
                9: 'tab',
                13: 'enter',
                16: 'shift',
                17: 'ctrl',
                18: 'alt',
                19: 'pause',
                20: 'capslock',
                27: 'esc',
                32: 'space',
                33: 'pageup',
                34: 'pagedown',
                35: 'end',
                36: 'home',
                37: 'leftarrow',
                38: 'uparrow',
                39: 'rightarrow',
                40: 'downarrow',
                44: 'printscreen',
                45: 'insert',
                46: 'delete',
                91: 'windows',
                93: 'menu',
                144: 'numlock',
                145: 'scrolllock',
                188: 'comma',
                190: 'period',
                191: 'fowardslash',
                192: 'tilde',
                219: 'leftbracket',
                220: 'backslash',
                221: 'rightbracket',
                222: 'quote',
            };
            return codes[keycode];
        }
        // TODO: this function is missing some browser specific
        // keycode mappings.
    };
    return Normalizer;
})(utils.PosterClass);
exports.Normalizer = Normalizer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/control/normalizer.js","/control")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils/utils');
var normalizer = require('./control/normalizer');
var keymap = require('./control/map');
var default_keymap = require('./control/default');
var cursors = require('./control/cursors');
var clipboard = require('./control/clipboard');
var history = require('./control/history');
/**
 * Controller for a DocumentModel.
 */
var DocumentController = (function (_super) {
    __extends(DocumentController, _super);
    function DocumentController(el, model) {
        _super.call(this);
        this.clipboard = new clipboard.Clipboard(el);
        this.normalizer = new normalizer.Normalizer();
        this.normalizer.listen_to(el);
        this.normalizer.listen_to(this.clipboard.hidden_input, false, true);
        this.map = new keymap.Map(this.normalizer);
        this.map.map(default_keymap.map);
        this.history = new history.History(this.map);
        this.cursors = new cursors.Cursors(el, model, this.clipboard, this.history);
    }
    return DocumentController;
})(utils.PosterClass);
exports.DocumentController = DocumentController;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/document_controller.js","/")
},{"./control/clipboard":6,"./control/cursors":8,"./control/default":9,"./control/history":10,"./control/map":11,"./control/normalizer":12,"./utils/utils":41,"buffer":1,"oMfpAn":4}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils/utils');
var superset = require('./utils/superset');
/**
 * Model containing all of the document's data (text).
 */
var DocumentModel = (function (_super) {
    __extends(DocumentModel, _super);
    function DocumentModel() {
        _super.call(this);
        this._rows = [];
        this._row_tags = [];
        this._tag_lock = 0;
        this._pending_tag_events = false;
    }
    Object.defineProperty(DocumentModel.prototype, "rows", {
        /**
         * Shallow copy of the array.  Modifying this won't modify the
         * contents of the Poster instance.
         */
        get: function () {
            return [].concat(this._rows);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocumentModel.prototype, "text", {
        /**
         * Gets the text of the Poster instance
         */
        get: function () {
            return this._get_text();
        },
        /**
         * Sets the text of the Poster instance
         */
        set: function (value) {
            this._set_text(value);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Acquire a lock on tag events
     *
     * Prevents tag events from firing.
     * @return lock count
     */
    DocumentModel.prototype.acquire_tag_event_lock = function () {
        return this._tag_lock++;
    };
    /**
     * Release a lock on tag events
     * @return lock count
     */
    DocumentModel.prototype.release_tag_event_lock = function () {
        this._tag_lock--;
        if (this._tag_lock < 0) {
            this._tag_lock = 0;
        }
        if (this._tag_lock === 0 && this._pending_tag_events) {
            this._pending_tag_events = false;
            this.trigger_tag_events();
        }
        return this._tag_lock;
    };
    /**
     * Triggers the tag change events.
     */
    DocumentModel.prototype.trigger_tag_events = function (rows) {
        if (this._tag_lock === 0) {
            this.trigger('tags_changed', this._pending_tag_events_rows);
            this._pending_tag_events_rows = undefined;
        }
        else {
            this._pending_tag_events = true;
            if (this._pending_tag_events_rows) {
                this._pending_tag_events_rows = this._pending_tag_events_rows.concat(rows);
            }
            else {
                this._pending_tag_events_rows = rows;
            }
        }
    };
    /**
     * Sets a 'tag' on the text specified.
     * @param start_row - row the tag starts on
     * @param start_char - index, in the row, of the first tagged character
     * @param end_row - row the tag ends on
     * @param end_char - index, in the row, of the last tagged character
     * @param tag_name
     * @param tag_value - overrides any previous tags
     */
    DocumentModel.prototype.set_tag = function (start_row, start_char, end_row, end_char, tag_name, tag_value) {
        var coords = this.validate_coords.apply(this, arguments);
        var rows = [];
        for (var row = coords.start_row; row <= coords.end_row; row++) {
            // Make sure the superset is defined for the row/tag_name pair.
            var row_tags = this._row_tags[row];
            if (row_tags[tag_name] === undefined) {
                row_tags[tag_name] = new superset.Superset();
            }
            // Get the start and end char indicies.
            var s = coords.start_char;
            var e = coords.end_char;
            if (row > coords.start_row)
                s = 0;
            if (row < coords.end_row)
                e = this._rows[row].length - 1;
            // Set the value for the range.
            row_tags[tag_name].set(s, e, tag_value);
            rows.push(row);
        }
        this.trigger_tag_events(rows);
    };
    /**
     * Removed all of the tags on the document.
     */
    DocumentModel.prototype.clear_tags = function (start_row, end_row) {
        start_row = start_row !== undefined ? start_row : 0;
        end_row = end_row !== undefined ? end_row : this._row_tags.length - 1;
        var rows = [];
        for (var i = start_row; i <= end_row; i++) {
            this._row_tags[i] = {};
            rows.push(i);
        }
        this.trigger_tag_events(rows);
    };
    /**
     * Get the tag value applied to the character.
     * @return value or undefined
     */
    DocumentModel.prototype.get_tag_value = function (tag_name, row_index, char_index) {
        // Loop through the tags on this row.
        var row_tags = this._row_tags[row_index][tag_name];
        if (row_tags !== undefined) {
            var tag_array = row_tags.array;
            for (var i = 0; i < tag_array.length; i++) {
                // Check if within.
                if (tag_array[i][0] <= char_index && char_index <= tag_array[i][1]) {
                    return tag_array[i][2];
                }
            }
        }
        return undefined;
    };
    /**
     * Get the tag value ranges applied to the specific range.
     * @return array of tag value ranges ([row_index, start_char, end_char, tag_value])
     */
    DocumentModel.prototype.get_tags = function (tag_name, start_row, start_char, end_row, end_char) {
        var coords = this.validate_coords.call(this, start_row, start_char, end_row, end_char);
        var values = [];
        for (var row = coords.start_row; row <= coords.end_row; row++) {
            // Get the start and end char indicies.
            var s = coords.start_char;
            var e = coords.end_char;
            if (row > coords.start_row)
                s = 0;
            if (row < coords.end_row)
                e = this._rows[row].length - 1;
            // Loop through the tags on this row.
            var row_tags = this._row_tags[row][tag_name];
            if (row_tags !== undefined) {
                var tag_array = row_tags.array;
                for (var i = 0; i < tag_array.length; i++) {
                    var ns = tag_array[i][0];
                    var ne = tag_array[i][1];
                    // Check if the areas insersect.
                    if (ns <= e && ne >= s) {
                        values.push([row, ns, ne, tag_array[i][2]]);
                    }
                }
            }
        }
        return values;
    };
    /**
     * Adds text efficiently somewhere in the document.
     */
    DocumentModel.prototype.add_text = function (row_index, char_index, text) {
        var coords = this.validate_coords.apply(this, Array.prototype.slice.call(arguments, 0, 2));
        var old_text = this._rows[coords.start_row];
        // If the text has a new line in it, just re-set
        // the rows list.
        if (text.indexOf('\n') != -1) {
            var new_rows = [];
            if (coords.start_row > 0) {
                new_rows = this._rows.slice(0, coords.start_row);
            }
            var old_row_start = old_text.substring(0, coords.start_char);
            var old_row_end = old_text.substring(coords.start_char);
            var split_text = text.split('\n');
            new_rows.push(old_row_start + split_text[0]);
            if (split_text.length > 2) {
                new_rows = new_rows.concat(split_text.slice(1, split_text.length - 1));
            }
            new_rows.push(split_text[split_text.length - 1] + old_row_end);
            if (coords.start_row + 1 < this._rows.length) {
                new_rows = new_rows.concat(this._rows.slice(coords.start_row + 1));
            }
            this._rows = new_rows;
            this._resized_rows();
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('rows_added', coords.start_row + 1, coords.start_row + split_text.length - 1);
            this.trigger('changed');
        }
        else {
            this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('changed');
        }
    };
    /**
     * Removes a block of text from the document
     */
    DocumentModel.prototype.remove_text = function (start_row, start_char, end_row, end_char) {
        var coords = this.validate_coords.apply(this, arguments);
        var old_text = this._rows[coords.start_row];
        if (coords.start_row == coords.end_row) {
            this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.start_row].substring(coords.end_char);
        }
        else {
            this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.end_row].substring(coords.end_char);
        }
        if (coords.end_row - coords.start_row > 0) {
            var rows_removed = this._rows.splice(coords.start_row + 1, coords.end_row - coords.start_row);
            this._resized_rows();
            // If there are more deleted rows than rows remaining, it
            // is faster to run a calculation on the remaining rows than
            // to run it on the rows removed.
            if (rows_removed.length > this._rows.length) {
                this.trigger('text_changed');
                this.trigger('changed');
            }
            else {
                this.trigger('row_changed', old_text, coords.start_row);
                this.trigger('rows_removed', rows_removed);
                this.trigger('changed');
            }
        }
        else if (coords.end_row == coords.start_row) {
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('changed');
        }
    };
    /**
     * Remove a row from the document.
     */
    DocumentModel.prototype.remove_row = function (row_index) {
        if (0 <= row_index && row_index < this._rows.length) {
            var rows_removed = this._rows.splice(row_index, 1);
            this._resized_rows();
            this.trigger('rows_removed', rows_removed);
            this.trigger('changed');
        }
    };
    /**
     * Gets a chunk of text.
     */
    DocumentModel.prototype.get_text = function (start_row, start_char, end_row, end_char) {
        var coords = this.validate_coords.apply(this, arguments);
        if (coords.start_row == coords.end_row) {
            return this._rows[coords.start_row].substring(coords.start_char, coords.end_char);
        }
        else {
            var text = [];
            text.push(this._rows[coords.start_row].substring(coords.start_char));
            if (coords.end_row - coords.start_row > 1) {
                for (var i = coords.start_row + 1; i < coords.end_row; i++) {
                    text.push(this._rows[i]);
                }
            }
            text.push(this._rows[coords.end_row].substring(0, coords.end_char));
            return text.join('\n');
        }
    };
    /**
     * Add a row to the document
     * @param row_index
     * @param text - new row's text
     */
    DocumentModel.prototype.add_row = function (row_index, text) {
        var new_rows = [];
        if (row_index > 0) {
            new_rows = this._rows.slice(0, row_index);
        }
        new_rows.push(text);
        if (row_index < this._rows.length) {
            new_rows = new_rows.concat(this._rows.slice(row_index));
        }
        this._rows = new_rows;
        this._resized_rows();
        this.trigger('rows_added', row_index, row_index);
        this.trigger('changed');
    };
    /**
     * Validates row, character coordinates in the document.
     * @return dictionary containing validated coordinates {start_row,
     *         start_char, end_row, end_char}
     */
    DocumentModel.prototype.validate_coords = function (start_row, start_char, end_row, end_char) {
        // Make sure the values aren't undefined.
        if (start_row === undefined)
            start_row = 0;
        if (start_char === undefined)
            start_char = 0;
        if (end_row === undefined)
            end_row = start_row;
        if (end_char === undefined)
            end_char = start_char;
        // Make sure the values are within the bounds of the contents.
        if (this._rows.length === 0) {
            start_row = 0;
            start_char = 0;
            end_row = 0;
            end_char = 0;
        }
        else {
            if (start_row >= this._rows.length)
                start_row = this._rows.length - 1;
            if (start_row < 0)
                start_row = 0;
            if (end_row >= this._rows.length)
                end_row = this._rows.length - 1;
            if (end_row < 0)
                end_row = 0;
            if (start_char > this._rows[start_row].length)
                start_char = this._rows[start_row].length;
            if (start_char < 0)
                start_char = 0;
            if (end_char > this._rows[end_row].length)
                end_char = this._rows[end_row].length;
            if (end_char < 0)
                end_char = 0;
        }
        // Make sure the start is before the end.
        if (start_row > end_row || (start_row == end_row && start_char > end_char)) {
            return {
                start_row: end_row,
                start_char: end_char,
                end_row: start_row,
                end_char: start_char,
            };
        }
        else {
            return {
                start_row: start_row,
                start_char: start_char,
                end_row: end_row,
                end_char: end_char,
            };
        }
    };
    /**
     * Gets the text of the document.
     */
    DocumentModel.prototype._get_text = function () {
        return this._rows.join('\n');
    };
    /**
     * Sets the text of the document.
     * Complexity O(N) for N rows
     */
    DocumentModel.prototype._set_text = function (value) {
        this._rows = value.split('\n');
        this._resized_rows();
        this.trigger('text_changed');
        this.trigger('changed');
    };
    /**
     * Updates _row's partner arrays.
     */
    DocumentModel.prototype._resized_rows = function () {
        while (this._row_tags.length < this._rows.length) {
            this._row_tags.push({});
        }
        if (this._row_tags.length > this._rows.length) {
            this._row_tags.splice(this._rows.length, this._row_tags.length - this._rows.length);
        }
    };
    return DocumentModel;
})(utils.PosterClass);
exports.DocumentModel = DocumentModel;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/document_model.js","/")
},{"./utils/superset":40,"./utils/utils":41,"buffer":1,"oMfpAn":4}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils/utils');
// Renderers
var batch = require('./draw/renderers/batch');
var highlighted_row = require('./draw/renderers/highlighted_row');
var cursors = require('./draw/renderers/cursors');
var selections = require('./draw/renderers/selections');
var color = require('./draw/renderers/color');
var highlighter = require('./syntax/prism');
/**
 * Visual representation of a DocumentModel instance
 */
var DocumentView = (function (_super) {
    __extends(DocumentView, _super);
    /**
     * @param scrolling_canvas
     * @param model
     * @param cursors_model
     * @param style - describes rendering style
     * @param has_focus - function that checks if the text area has focus
     * @param move_focal_point - function that moves the focal point
     */
    function DocumentView(scrolling_canvas, model, cursors_model, style, has_focus, move_focal_point) {
        // Create child renderers.
        var row_renderer = new highlighted_row.HighlightedRowRenderer(model, scrolling_canvas, style);
        row_renderer.margin_left = 2;
        row_renderer.margin_top = 2;
        this.row_renderer = row_renderer;
        // Make sure changes made to the cursor(s) are within the visible region.
        cursors_model.on('change', function (cursor) {
            if (cursor === undefined)
                return;
            var row_index = cursor.primary_row;
            var char_index = cursor.primary_char;
            var top = row_renderer.get_row_top(row_index);
            var height = row_renderer.get_row_height(row_index);
            var left = row_renderer.measure_partial_row_width(row_index, char_index) + row_renderer.margin_left;
            var bottom = top + height;
            var canvas_height = scrolling_canvas.height - 20;
            if (bottom > scrolling_canvas.scroll_top + canvas_height) {
                scrolling_canvas.scroll_top = bottom - canvas_height;
            }
            else if (top < scrolling_canvas.scroll_top) {
                scrolling_canvas.scroll_top = top;
            }
            var canvas_width = scrolling_canvas.width - 20;
            if (left > scrolling_canvas.scroll_left + canvas_width) {
                scrolling_canvas.scroll_left = left - canvas_width;
            }
            else if (left - row_renderer.margin_left < scrolling_canvas.scroll_left) {
                scrolling_canvas.scroll_left = Math.max(0, left - row_renderer.margin_left);
            }
            move_focal_point(left - scrolling_canvas.scroll_left, top - scrolling_canvas.scroll_top - scrolling_canvas.height);
        });
        var cursors_renderer = new cursors.CursorsRenderer(cursors_model, style, row_renderer, has_focus);
        var selections_renderer = new selections.SelectionsRenderer(cursors_model, style, row_renderer, has_focus, cursors_renderer);
        // Create the background renderer
        var color_renderer = new color.ColorRenderer();
        color_renderer.color = style.background || 'white';
        style.on('changed:style', function () {
            color_renderer.color = style.background;
        });
        // Create the document highlighter, which needs to know about the currently
        // rendered rows in order to know where to highlight.
        this.highlighter = new highlighter.PrismHighlighter(model, row_renderer);
        // Pass get_row_char into cursors.
        cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);
        // Call base constructor.
        _super.call(this, [
            color_renderer,
            selections_renderer,
            row_renderer,
            cursors_renderer,
        ], scrolling_canvas);
        // Hookup render events.
        this._canvas.on('redraw', utils.proxy(this.render, this));
        model.on('changed', utils.proxy(scrolling_canvas.redraw, scrolling_canvas));
    }
    Object.defineProperty(DocumentView.prototype, "language", {
        get: function () {
            return this._language;
        },
        set: function (value) {
            this.highlighter.load(value);
            this._language = value;
        },
        enumerable: true,
        configurable: true
    });
    return DocumentView;
})(batch.BatchRenderer);
exports.DocumentView = DocumentView;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/document_view.js","/")
},{"./draw/renderers/batch":18,"./draw/renderers/color":19,"./draw/renderers/cursors":20,"./draw/renderers/highlighted_row":21,"./draw/renderers/selections":24,"./syntax/prism":38,"./utils/utils":41,"buffer":1,"oMfpAn":4}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
/**
 * Animation helper.
 */
var Animator = (function (_super) {
    __extends(Animator, _super);
    function Animator(duration) {
        _super.call(this);
        this.duration = duration;
        this._start = Date.now();
    }
    /**
     * Get the time in the animation
     * @return between 0 and 1
     */
    Animator.prototype.time = function () {
        var elapsed = Date.now() - this._start;
        return (elapsed % this.duration) / this.duration;
    };
    /**
     * Reset the animation progress to 0.
     */
    Animator.prototype.reset = function () {
        this._start = Date.now();
    };
    return Animator;
})(utils.PosterClass);
exports.Animator = Animator;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/animator.js","/draw")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils/utils');
var config_mod = require('../utils/config');
var config = config_mod.config;
(function (CompositeOperationEnum) {
    CompositeOperationEnum[CompositeOperationEnum["source_over"] = 0] = "source_over";
    CompositeOperationEnum[CompositeOperationEnum["source_atop"] = 1] = "source_atop";
    CompositeOperationEnum[CompositeOperationEnum["source_in"] = 2] = "source_in";
    CompositeOperationEnum[CompositeOperationEnum["source_out"] = 3] = "source_out";
    CompositeOperationEnum[CompositeOperationEnum["destination_over"] = 4] = "destination_over";
    CompositeOperationEnum[CompositeOperationEnum["destination_atop"] = 5] = "destination_atop";
    CompositeOperationEnum[CompositeOperationEnum["destination_in"] = 6] = "destination_in";
    CompositeOperationEnum[CompositeOperationEnum["destination_out"] = 7] = "destination_out";
    CompositeOperationEnum[CompositeOperationEnum["lighter"] = 8] = "lighter";
    CompositeOperationEnum[CompositeOperationEnum["copy"] = 9] = "copy";
    CompositeOperationEnum[CompositeOperationEnum["xor"] = 10] = "xor";
})(exports.CompositeOperationEnum || (exports.CompositeOperationEnum = {}));
var CompositeOperationEnum = exports.CompositeOperationEnum;
(function (TextAlignmentEnum) {
    TextAlignmentEnum[TextAlignmentEnum["start"] = 0] = "start";
    TextAlignmentEnum[TextAlignmentEnum["end"] = 1] = "end";
    TextAlignmentEnum[TextAlignmentEnum["center"] = 2] = "center";
    TextAlignmentEnum[TextAlignmentEnum["left"] = 3] = "left";
    TextAlignmentEnum[TextAlignmentEnum["right"] = 4] = "right";
})(exports.TextAlignmentEnum || (exports.TextAlignmentEnum = {}));
var TextAlignmentEnum = exports.TextAlignmentEnum;
(function (TextBaselineEnum) {
    TextBaselineEnum[TextBaselineEnum["alphabetic"] = 0] = "alphabetic";
    TextBaselineEnum[TextBaselineEnum["top"] = 1] = "top";
    TextBaselineEnum[TextBaselineEnum["hanging"] = 2] = "hanging";
    TextBaselineEnum[TextBaselineEnum["middle"] = 3] = "middle";
    TextBaselineEnum[TextBaselineEnum["ideographic"] = 4] = "ideographic";
    TextBaselineEnum[TextBaselineEnum["bottom"] = 5] = "bottom";
})(exports.TextBaselineEnum || (exports.TextBaselineEnum = {}));
var TextBaselineEnum = exports.TextBaselineEnum;
(function (LineCapEnum) {
    LineCapEnum[LineCapEnum["butt"] = 0] = "butt";
    LineCapEnum[LineCapEnum["round"] = 1] = "round";
    LineCapEnum[LineCapEnum["square"] = 2] = "square";
})(exports.LineCapEnum || (exports.LineCapEnum = {}));
var LineCapEnum = exports.LineCapEnum;
(function (LineJoinEnum) {
    LineJoinEnum[LineJoinEnum["bevel"] = 0] = "bevel";
    LineJoinEnum[LineJoinEnum["round"] = 1] = "round";
    LineJoinEnum[LineJoinEnum["miter"] = 2] = "miter";
})(exports.LineJoinEnum || (exports.LineJoinEnum = {}));
var LineJoinEnum = exports.LineJoinEnum;
/**
 * HTML canvas with drawing convinience functions.
 */
var Canvas = (function (_super) {
    __extends(Canvas, _super);
    function Canvas() {
        _super.call(this);
        this._text_size_cache_size = 1000;
        this._rendered_region = {
            x1: null,
            y1: null,
            x2: null,
            y2: null
        };
        this._layout();
        this._last_set_options = {};
        this._text_size_cache = {};
        this._text_size_array = [];
        // Set default size.
        this.width = 400;
        this.height = 300;
    }
    Object.defineProperty(Canvas.prototype, "context", {
        get: function () {
            return this._context;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "height", {
        /**
         * Height of the canvas
         */
        get: function () {
            return this._canvas.height / 2;
        },
        set: function (value) {
            this._canvas.setAttribute('height', String(value * 2));
            // Stretch the image for retina support.
            this.scale(2, 2);
            this._touch();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "width", {
        /**
         * Width of the canvas
         */
        get: function () {
            return this._canvas.width / 2;
        },
        set: function (value) {
            this._canvas.setAttribute('width', String(value * 2));
            // Stretch the image for retina support.
            this.scale(2, 2);
            this._touch();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "rendered_region", {
        /**
         * Region of the canvas that has been rendered to
         * @return null if canvas has changed since last check
         */
        get: function () {
            return this.get_rendered_region(true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Canvas.prototype, "canvas", {
        /**
         * HTML 5 Canvas element
         */
        get: function () {
            return this._canvas;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Gets the region of the canvas that has been rendered to.
     * @param  [reset] - resets the region.
     */
    Canvas.prototype.get_rendered_region = function (reset) {
        var rendered_region = this._rendered_region;
        if (rendered_region.x1 === null)
            return null;
        if (reset) {
            this._rendered_region = {
                x1: null,
                y1: null,
                x2: null,
                y2: null
            };
        }
        return {
            x: this.tx(rendered_region.x1, true),
            y: this.ty(rendered_region.y1, true),
            width: (this.tx(rendered_region.x2) - this.tx(rendered_region.x1)),
            height: (this.ty(rendered_region.y2) - this.ty(rendered_region.y1)),
        };
    };
    /**
     * Erases the cached rendering options.
     *
     * This should be called if a font is not rendering properly.  A font may not
     * render properly if it was was used within Poster before it was loaded by the
     * browser. i.e. If font 'FontA' is used within Poster, but hasn't been loaded
     * yet by the browser, Poster will use a temporary font instead of 'FontA'.
     * Because Poster is unaware of when fonts are loaded (TODO attempt to fix this)
     * by the browser, once 'FontA' is actually loaded, the temporary font will
     * continue to be used.  Clearing the cache makes Poster attempt to reload that
     * font.
     */
    Canvas.prototype.erase_options_cache = function () {
        this._last_set_options = {};
    };
    /**
     * Draws a rectangle
     */
    Canvas.prototype.draw_rectangle = function (x, y, width, height, options) {
        var tx = this.tx(x);
        var ty = this.ty(y);
        this.context.beginPath();
        this.context.rect(tx, ty, width, height);
        this._do_draw(options);
        this._touch(tx, ty, tx + width, ty + height);
    };
    /**
     * Draws a circle
     */
    Canvas.prototype.draw_circle = function (x, y, r, options) {
        var tx = this.tx(x);
        var ty = this.ty(y);
        this.context.beginPath();
        this.context.arc(tx, ty, r, 0, 2 * Math.PI);
        this._do_draw(options);
        this._touch(tx - r, ty - r, tx + r, ty + r);
    };
    /**
     * Draws an image
     */
    Canvas.prototype.draw_image = function (img, x, y, width, height, clip_bounds) {
        var tx = this.tx(x);
        var ty = this.ty(y);
        width = width || img.width;
        height = height || img.height;
        var html_img = img.canvas ? img.canvas : img;
        if (clip_bounds) {
            // Horizontally offset the image operation by one pixel along each 
            // border to eliminate the strange white l&r border artifacts.
            var hoffset = 1;
            this.context.drawImage(html_img, (this.tx(clip_bounds.x) - hoffset) * 2, this.ty(clip_bounds.y) * 2, (clip_bounds.width + 2 * hoffset) * 2, clip_bounds.height * 2, tx - hoffset, ty, width + 2 * hoffset, height);
        }
        else {
            this.context.drawImage(html_img, tx, ty, width, height);
        }
        this._touch(tx, ty, tx + width, ty + height);
    };
    /**
     * Draws a line
     */
    Canvas.prototype.draw_line = function (x1, y1, x2, y2, options) {
        var tx1 = this.tx(x1);
        var ty1 = this.ty(y1);
        var tx2 = this.tx(x2);
        var ty2 = this.ty(y2);
        this.context.beginPath();
        this.context.moveTo(tx1, ty1);
        this.context.lineTo(tx2, ty2);
        this._do_draw(options);
        this._touch(tx1, ty1, tx2, ty2);
    };
    /**
     * Draws a poly line
     * @param  points - array of points.  Each point is an array itself, of the
     *                  form [x, y] where x and y are floating point values.
     */
    Canvas.prototype.draw_polyline = function (points, options) {
        if (points.length < 2) {
            throw new Error('Poly line must have atleast two points.');
        }
        else {
            this.context.beginPath();
            var point = points[0];
            this.context.moveTo(this.tx(point[0]), this.ty(point[1]));
            var minx = this.width;
            var miny = this.height;
            var maxx = 0;
            var maxy = 0;
            for (var i = 1; i < points.length; i++) {
                point = points[i];
                var tx = this.tx(point[0]);
                var ty = this.ty(point[1]);
                this.context.lineTo(tx, ty);
                minx = Math.min(tx, minx);
                miny = Math.min(ty, miny);
                maxx = Math.max(tx, maxx);
                maxy = Math.max(ty, maxy);
            }
            this._do_draw(options);
            this._touch(minx, miny, maxx, maxy);
        }
    };
    /**
     * Draws a text string
     */
    Canvas.prototype.draw_text = function (x, y, text, options) {
        var tx = this.tx(x);
        var ty = this.ty(y);
        text = this._process_tabs(text);
        options = this._apply_options(options);
        // 'fill' the text by default when neither a stroke or fill 
        // is defined.  Otherwise only fill if a fill is defined.
        if (options.fill || !options.stroke) {
            this.context.fillText(text, tx, ty);
        }
        // Only stroke if a stroke is defined.
        if (options.stroke) {
            this.context.strokeText(text, tx, ty);
        }
        // Mark the region as dirty.
        var width = this.measure_text(text, options);
        var height = this._font_height;
        this._touch(tx, ty, tx + width, ty + height);
    };
    /**
     * Get's a chunk of the canvas as a raw image.
     */
    Canvas.prototype.get_raw_image = function (x, y, width, height) {
        console.warn('get_raw_image image is slow, use canvas references instead with draw_image');
        if (x === undefined) {
            x = 0;
        }
        else {
            x = this.tx(x);
        }
        if (y === undefined) {
            y = 0;
        }
        else {
            y = this.ty(y);
        }
        if (width === undefined)
            width = this.width;
        if (height === undefined)
            height = this.height;
        // Multiply by two for pixel doubling.
        x = 2 * x;
        y = 2 * y;
        width = 2 * width;
        height = 2 * height;
        // Update the cached image if it's not the requested one.
        var region = {
            x1: x,
            y1: y,
            x2: width,
            y2: height
        };
        if (!(this._cached_timestamp === this._modified && utils.compare_objects(region, this._cached_region))) {
            this._cached_image = this.context.getImageData(x, y, width, height);
            this._cached_timestamp = this._modified;
            this._cached_region = region;
        }
        // Return the cached image.
        return this._cached_image;
    };
    /**
     * Put's a raw image on the canvas somewhere.
     */
    Canvas.prototype.put_raw_image = function (img, x, y) {
        console.warn('put_raw_image image is slow, use draw_image instead');
        var tx = this.tx(x);
        var ty = this.ty(y);
        // Multiply by two for pixel doubling.
        var ret = this.context.putImageData(img, tx * 2, ty * 2);
        this._touch(tx, ty, this.width, this.height); // Don't know size of image
    };
    /**
     * Measures the width of a text string.
     */
    Canvas.prototype.measure_text = function (text, options) {
        options = this._apply_options(options);
        text = this._process_tabs(text);
        // Cache the size if it's not already cached.
        if (this._text_size_cache[text] === undefined) {
            this._text_size_cache[text] = this.context.measureText(text).width;
            this._text_size_array.push(text);
            while (this._text_size_array.length > this._text_size_cache_size) {
                var oldest = this._text_size_array.shift();
                delete this._text_size_cache[oldest];
            }
        }
        // Use the cached size.
        return this._text_size_cache[text];
    };
    /**
     * Create a linear gradient
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @param color_stops - array of [float, color] pairs
     */
    Canvas.prototype.gradient = function (x1, y1, x2, y2, color_stops) {
        var gradient = this.context.createLinearGradient(x1, y1, x2, y2);
        for (var i = 0; i < color_stops.length; i++) {
            gradient.addColorStop(color_stops[i][0], color_stops[i][1]);
        }
        return gradient;
    };
    /**
     * Clear's the canvas.
     */
    Canvas.prototype.clear = function (region) {
        if (region) {
            var tx = this.tx(region.x);
            var ty = this.ty(region.y);
            this.context.clearRect(tx, ty, region.width, region.height);
            this._touch(tx, ty, tx + region.width, ty + region.height);
        }
        else {
            this.context.clearRect(0, 0, this.width, this.height);
            this._touch();
        }
    };
    /**
     * Scale the current drawing.
     */
    Canvas.prototype.scale = function (x, y) {
        this.context.scale(x, y);
        this._touch();
    };
    /**
     * Transform an x value before rendering.
     * @param x
     * @param [inverse] - perform inverse transformation
     */
    Canvas.prototype.tx = function (x, inverse) {
        return x;
    };
    /**
     * Transform a y value before rendering.
     * @param y
     * @param [inverse] - perform inverse transformation
     */
    Canvas.prototype.ty = function (y, inverse) {
        return y;
    };
    /**
     * Layout the elements for the canvas.
     * Creates `this.el`
     */
    Canvas.prototype._layout = function () {
        this._canvas = document.createElement('canvas');
        this._canvas.setAttribute('class', 'poster hidden-canvas');
        this._context = this._canvas.getContext('2d');
        // Stretch the image for retina support.
        this.scale(2, 2);
    };
    /**
     * Finishes the drawing operation using the set of provided options.
     */
    Canvas.prototype._do_draw = function (options) {
        options = this._apply_options(options);
        // Only fill if a fill is defined.
        if (options.fill) {
            this.context.fill();
        }
        // Stroke by default, if no stroke or fill is defined.  Otherwise
        // only stroke if a stroke is defined.
        if (options.stroke || !options.fill) {
            this.context.stroke();
        }
    };
    /**
     * Applies a dictionary of drawing options to the pen.
     */
    Canvas.prototype._apply_options = function (options) {
        options = options || {};
        // Special options.
        var set_options = {};
        set_options.globalAlpha = (options.alpha === undefined ? 1.0 : options.alpha);
        set_options.globalCompositeOperation = CompositeOperationEnum[(options.composite_operation || 0 /* source_over */)].replace(/_/g, '-');
        // Line style.
        set_options.lineCap = LineCapEnum[(options.line_cap || 0 /* butt */)];
        set_options.lineJoin = LineJoinEnum[(options.line_join || 0 /* bevel */)];
        set_options.lineWidth = options.line_width === undefined ? 1.0 : options.line_width;
        set_options.miterLimit = options.line_miter_limit === undefined ? 10 : options.line_miter_limit;
        this.context.strokeStyle = options.line_color || options.color || 'black'; // TODO: Support gradient
        options.stroke = (options.line_color !== undefined || options.line_width !== undefined);
        // Fill style.
        this.context.fillStyle = options.fill_color || options.color || 'red'; // TODO: Support gradient
        options.fill = options.fill_color !== undefined;
        // Font style.
        var pixels = function (x) {
            if (x !== undefined && x !== null) {
                if (!isNaN(x)) {
                    return String(x) + 'px';
                }
                else {
                    return x;
                }
            }
            else {
                return null;
            }
        };
        var font_style = options.font_style || '';
        var font_variant = options.font_variant || '';
        var font_weight = options.font_weight || '';
        this._font_height = options.font_size || 12;
        var font_size = pixels(this._font_height);
        var font_family = options.font_family || 'Arial';
        var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
        set_options.font = font;
        // Text style.
        set_options.textAlign = TextAlignmentEnum[(options.text_align || 3 /* left */)];
        set_options.textBaseline = TextBaselineEnum[(options.text_baseline || 1 /* top */)];
        // TODO: Support shadows.
        // Empty the measure text cache if the font is changed.
        if (set_options.font !== this._last_set_options.font) {
            this._text_size_cache = {};
            this._text_size_array = [];
        }
        for (var key in set_options) {
            if (set_options.hasOwnProperty(key)) {
                if (this._last_set_options[key] !== set_options[key]) {
                    this._last_set_options[key] = set_options[key];
                    this.context[key] = set_options[key];
                }
            }
        }
        return options;
    };
    /**
     * Update the timestamp that the canvas was modified and
     * the region that has contents rendered to it.
     */
    Canvas.prototype._touch = function (x1, y1, x2, y2) {
        this._modified = Date.now();
        var all_undefined = (x1 === undefined && y1 === undefined && x2 === undefined && y2 === undefined);
        var one_nan = (isNaN(x1 * x2 * y1 * y2));
        if (one_nan || all_undefined) {
            this._rendered_region = {
                x1: 0,
                y1: 0,
                x2: this.width,
                y2: this.height
            };
            return;
        }
        // Set the render region.
        var comparitor = function (old_value, new_value, comparison) {
            if (old_value === null || old_value === undefined || new_value === null || new_value === undefined) {
                return new_value;
            }
            else {
                return comparison.call(undefined, old_value, new_value);
            }
        };
        this._rendered_region.x1 = comparitor(this._rendered_region.x1, comparitor(x1, x2, Math.min), Math.min);
        this._rendered_region.y1 = comparitor(this._rendered_region.y1, comparitor(y1, y2, Math.min), Math.min);
        this._rendered_region.x2 = comparitor(this._rendered_region.x2, comparitor(x1, x2, Math.max), Math.max);
        this._rendered_region.y2 = comparitor(this._rendered_region.y2, comparitor(y1, y2, Math.max), Math.max);
    };
    /**
     * Convert tab characters to the config defined number of space
     * characters for rendering.
     */
    Canvas.prototype._process_tabs = function (s) {
        var space_tab = '';
        for (var i = 0; i < (config.tab_width || 1); i++) {
            space_tab += ' ';
        }
        return s.replace(/\t/g, space_tab);
    };
    return Canvas;
})(utils.PosterClass);
exports.Canvas = Canvas;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/canvas.js","/draw")
},{"../utils/config":39,"../utils/utils":41,"buffer":1,"oMfpAn":4}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../../utils/utils');
var renderer = require('./renderer');
var config_mod = require('../../utils/config');
var config = config_mod.config;
/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
var BatchRenderer = (function (_super) {
    __extends(BatchRenderer, _super);
    function BatchRenderer(renderers, canvas) {
        var _this = this;
        _super.call(this, canvas);
        this._render_lock = false;
        this._renderers = renderers;
        // Listen to the layers, if one layer changes, recompose
        // the full image by copying them all again.
        this._renderers.forEach(function (renderer) {
            renderer.on('changed', function () {
                var rendered_region = renderer.canvas.rendered_region;
                _this._copy_renderers(rendered_region);
            });
        });
    }
    Object.defineProperty(BatchRenderer.prototype, "width", {
        get: function () {
            return this._canvas.width;
        },
        set: function (value) {
            this._canvas.width = value;
            this._renderers.forEach(function (renderer) {
                renderer.width = value;
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BatchRenderer.prototype, "height", {
        get: function () {
            return this._canvas.height;
        },
        set: function (value) {
            this._canvas.height = value;
            this._renderers.forEach(function (renderer) {
                renderer.height = value;
            });
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Adds a renderer
     */
    BatchRenderer.prototype.add_renderer = function (renderer) {
        var _this = this;
        this._renderers.push(renderer);
        renderer.on('changed', function () {
            var rendered_region = renderer.canvas.rendered_region;
            _this._copy_renderers(rendered_region);
        });
    };
    /**
     * Removes a renderer
     */
    BatchRenderer.prototype.remove_renderer = function (renderer) {
        var index = this._renderers.indexOf(renderer);
        if (index !== -1) {
            this._renderers.splice(index, 1);
            renderer.off('changed');
        }
    };
    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled.
     */
    BatchRenderer.prototype.render = function (scroll) {
        var _this = this;
        if (!this._render_lock) {
            try {
                this._render_lock = true;
                this._renderers.forEach(function (renderer) {
                    // Apply the rendering coordinate transforms of the parent.
                    if (!renderer.options.parent_independent) {
                        renderer.canvas.tx = utils.proxy(_this._canvas.tx, _this._canvas);
                        renderer.canvas.ty = utils.proxy(_this._canvas.ty, _this._canvas);
                    }
                });
                // Tell each renderer to render and keep track of the region
                // that has freshly rendered contents.
                var rendered_region = null;
                this._renderers.forEach(function (renderer) {
                    // Tell the renderer to render itself.
                    renderer.render(scroll);
                    var new_region = renderer.canvas.rendered_region;
                    if (rendered_region === null) {
                        rendered_region = new_region;
                    }
                    else if (new_region !== null) {
                        // Calculate the sum of the two dirty regions.
                        var x1 = rendered_region.x;
                        var x2 = rendered_region.x + rendered_region.width;
                        var y1 = rendered_region.y;
                        var y2 = rendered_region.y + rendered_region.height;
                        x1 = Math.min(x1, new_region.x);
                        x2 = Math.max(x2, new_region.x + new_region.width);
                        y1 = Math.min(y1, new_region.y);
                        y2 = Math.max(y2, new_region.y + new_region.height);
                        rendered_region.x = x1;
                        rendered_region.y = y1;
                        rendered_region.width = x2 - x1;
                        rendered_region.height = y2 - y1;
                    }
                });
                // Copy the results to self.
                this._copy_renderers(rendered_region);
            }
            finally {
                this._render_lock = false;
            }
        }
    };
    /**
     * Copies all the renderer layers to the canvas.
     */
    BatchRenderer.prototype._copy_renderers = function (region) {
        var _this = this;
        this._canvas.clear(region);
        this._renderers.forEach(function (renderer) { return _this._copy_renderer(renderer, region); });
        // Debug, higlight blit region.
        if (region && config.highlight_blit) {
            this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, { color: utils.random_color() });
        }
    };
    /**
     * Copy a renderer to the canvas.
     */
    BatchRenderer.prototype._copy_renderer = function (renderer, region) {
        if (region) {
            // Copy a region.
            this._canvas.draw_image(renderer.canvas, region.x, region.y, region.width, region.height, region);
        }
        else {
            // Copy the entire image.
            this._canvas.draw_image(renderer.canvas, this.left, this.top, this._canvas.width, this._canvas.height);
        }
    };
    return BatchRenderer;
})(renderer.RendererBase);
exports.BatchRenderer = BatchRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/batch.js","/draw/renderers")
},{"../../utils/config":39,"../../utils/utils":41,"./renderer":22,"buffer":1,"oMfpAn":4}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var renderer = require('./renderer');
/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var ColorRenderer = (function (_super) {
    __extends(ColorRenderer, _super);
    function ColorRenderer() {
        // Create with the option 'parent_independent' to disable
        // parent coordinate translations from being applied by 
        // a batch renderer.
        _super.call(this, undefined, { parent_independent: true });
        this._rendered = false;
    }
    Object.defineProperty(ColorRenderer.prototype, "width", {
        get: function () {
            return this._canvas.width;
        },
        set: function (value) {
            this._canvas.width = value;
            this._render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColorRenderer.prototype, "height", {
        get: function () {
            return this._canvas.height;
        },
        set: function (value) {
            this._canvas.height = value;
            this._render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ColorRenderer.prototype, "color", {
        get: function () {
            return this._color;
        },
        set: function (value) {
            this._color = value;
            this._render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled.
     */
    ColorRenderer.prototype.render = function (scroll) {
        if (!this._rendered) {
            this._render();
            this._rendered = true;
        }
    };
    /**
     * Render a frame.
     */
    ColorRenderer.prototype._render = function () {
        this._canvas.clear();
        this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, { fill_color: this._color });
    };
    return ColorRenderer;
})(renderer.RendererBase);
exports.ColorRenderer = ColorRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/color.js","/draw/renderers")
},{"./renderer":22,"buffer":1,"oMfpAn":4}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var animator = require('../animator');
var utils = require('../../utils/utils');
var renderer = require('./renderer');
/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
var CursorsRenderer = (function (_super) {
    __extends(CursorsRenderer, _super);
    function CursorsRenderer(cursors, style, row_renderer, has_focus) {
        var _this = this;
        _super.call(this);
        this.style = style;
        this._has_focus = has_focus;
        this._cursors = cursors;
        this._last_drawn_cursors = [];
        this._row_renderer = row_renderer;
        this._blink_animator = new animator.Animator(1000);
        this._fps = 2;
        // Start the cursor rendering clock.
        this._render_clock();
        this._last_rendered = null;
        // Watch for cursor change events.
        var rerender = function () {
            _this._blink_animator.reset();
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger('changed');
        };
        this._cursors.on('change', rerender);
    }
    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     */
    CursorsRenderer.prototype.render = function (scroll) {
        var _this = this;
        // Remove the previously drawn cursors, if any.
        if (scroll !== undefined) {
            this._canvas.clear();
            utils.clear_array(this._last_drawn_cursors);
        }
        else {
            if (this._last_drawn_cursors.length > 0) {
                this._last_drawn_cursors.forEach(function (cursor_box) {
                    // Remove 1px space around the cursor box too for anti-aliasing.
                    _this._canvas.clear({
                        x: cursor_box.x - 1,
                        y: cursor_box.y - 1,
                        width: cursor_box.width + 2,
                        height: cursor_box.height + 2,
                    });
                });
                utils.clear_array(this._last_drawn_cursors);
            }
        }
        // Only render if the canvas has focus.
        if (this._has_focus() && this._blink_animator.time() < 0.5) {
            this._cursors.cursors.forEach(function (cursor) {
                // Get the visible rows.
                var visible_rows = _this._row_renderer.get_visible_rows();
                // If a cursor doesn't have a position, render it at the
                // beginning of the document.
                var row_index = cursor.primary_row || 0;
                var char_index = cursor.primary_char || 0;
                // Draw the cursor.
                var height = _this._row_renderer.get_row_height(row_index);
                var multiplier = _this.style.get('cursor_height', 1.0);
                var offset = (height - (multiplier * height)) / 2;
                height *= multiplier;
                if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                    var cursor_box = {
                        x: char_index === 0 ? _this._row_renderer.margin_left : _this._row_renderer.measure_partial_row_width(row_index, char_index) + _this._row_renderer.margin_left,
                        y: _this._row_renderer.get_row_top(row_index) + offset,
                        width: _this.style.get('cursor_width', 1.0),
                        height: height,
                    };
                    _this._last_drawn_cursors.push(cursor_box);
                    _this._canvas.draw_rectangle(cursor_box.x, cursor_box.y, cursor_box.width, cursor_box.height, {
                        fill_color: _this.style.get('cursor', 'back'),
                    });
                }
            });
        }
        this._last_rendered = Date.now();
    };
    /**
     * Clock for rendering the cursor.
     */
    CursorsRenderer.prototype._render_clock = function () {
        // If the canvas is focused, redraw.
        if (this._has_focus()) {
            var first_render = !this._was_focused;
            this._was_focused = true;
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
            if (first_render)
                this.trigger('toggle');
        }
        else if (this._was_focused) {
            this._was_focused = false;
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
            this.trigger('toggle');
        }
        // Timer.
        setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
    };
    return CursorsRenderer;
})(renderer.RendererBase);
exports.CursorsRenderer = CursorsRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/cursors.js","/draw/renderers")
},{"../../utils/utils":41,"../animator":16,"./renderer":22,"buffer":1,"oMfpAn":4}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../../utils/utils');
var row = require('./row');
var config_mod = require('../../utils/config');
var config = config_mod.config;
;
/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var HighlightedRowRenderer = (function (_super) {
    __extends(HighlightedRowRenderer, _super);
    function HighlightedRowRenderer(model, scrolling_canvas, style) {
        var _this = this;
        _super.call(this, model, scrolling_canvas);
        this.style = style;
        model.on('tags_changed', function (rows) {
            var row_visible = false;
            if (rows) {
                var visible_rows = _this.get_visible_rows();
                for (var i = 0; i < rows.length; i++) {
                    if (visible_rows.top_row <= rows[i] && rows[i] <= visible_rows.bottom_row) {
                        row_visible = true;
                        break;
                    }
                }
            }
            // If at least one of the rows whos tags changed is visible,
            // re-render.
            if (row_visible) {
                _this.render();
                _this.trigger('changed');
            }
        });
    }
    /**
     * Render a single row
     */
    HighlightedRowRenderer.prototype._render_row = function (index, x, y) {
        if (index < 0 || this._model._rows.length <= index)
            return;
        var groups = this._get_groups(index);
        var left = x;
        for (var i = 0; i < groups.length; i++) {
            var width = this._text_canvas.measure_text(groups[i].text, groups[i].options);
            if (config.highlight_draw) {
                this._text_canvas.draw_rectangle(left, y, width, this.get_row_height(i), {
                    fill_color: utils.random_color(),
                });
            }
            this._text_canvas.draw_text(left, y, groups[i].text, groups[i].options);
            left += width;
        }
    };
    /**
     * Get render groups for a row.
     * @param index of the row
     */
    HighlightedRowRenderer.prototype._get_groups = function (index) {
        if (index < 0 || this._model._rows.length <= index)
            return;
        var row_text = this._model._rows[index];
        var groups = [];
        var last_syntax = null;
        var char_index = 0;
        var start = 0;
        for (char_index; char_index < row_text.length; char_index++) {
            var syntax = this._model.get_tag_value('syntax', index, char_index);
            if (!this._compare_syntax(last_syntax, syntax)) {
                if (char_index !== 0) {
                    groups.push({ options: this._get_options(last_syntax), text: row_text.substring(start, char_index) });
                }
                last_syntax = syntax;
                start = char_index;
            }
        }
        groups.push({ options: this._get_options(last_syntax), text: row_text.substring(start) });
        return groups;
    };
    /**
     * Creates a style options dictionary from a syntax tag.
     * @param syntax
     */
    HighlightedRowRenderer.prototype._get_options = function (syntax) {
        var render_options = utils.shallow_copy(this._base_options);
        // Highlight if a sytax item and style are provided.
        if (this.style) {
            // If this is a nested syntax item, use the most specific part
            // which is defined in the active style.
            if (syntax && syntax.indexOf(' ') != -1) {
                var parts = syntax.split(' ');
                for (var i = parts.length - 1; i >= 0; i--) {
                    if (this.style[parts[i]]) {
                        syntax = parts[i];
                        break;
                    }
                }
            }
            // Style if the syntax item is defined in the style.
            if (syntax && this.style[syntax]) {
                render_options.color = this.style.get(syntax);
            }
            else {
                render_options.color = this.style.get('text') || 'black';
            }
        }
        return render_options;
    };
    /**
     * Compare two syntaxs.
     * @return true if a and b are equal
     */
    HighlightedRowRenderer.prototype._compare_syntax = function (a, b) {
        return a === b;
    };
    return HighlightedRowRenderer;
})(row.RowRenderer);
exports.HighlightedRowRenderer = HighlightedRowRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/highlighted_row.js","/draw/renderers")
},{"../../utils/config":39,"../../utils/utils":41,"./row":23,"buffer":1,"oMfpAn":4}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var canvas = require('../canvas');
var utils = require('../../utils/utils');
/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var RendererBase = (function (_super) {
    __extends(RendererBase, _super);
    function RendererBase(default_canvas, options) {
        _super.call(this);
        this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
        this.options = options || {};
    }
    Object.defineProperty(RendererBase.prototype, "canvas", {
        get: function () {
            return this._canvas;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RendererBase.prototype, "width", {
        get: function () {
            return this._canvas.width;
        },
        set: function (value) {
            this._canvas.width = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RendererBase.prototype, "height", {
        get: function () {
            return this._canvas.height;
        },
        set: function (value) {
            this._canvas.height = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RendererBase.prototype, "top", {
        get: function () {
            return -this._canvas.ty(0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RendererBase.prototype, "left", {
        get: function () {
            return -this._canvas.tx(0);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Render to the canvas
     * @param [scroll] - How much the canvas was scrolled
     */
    RendererBase.prototype.render = function (scroll) {
        throw new Error('Not implemented');
    };
    return RendererBase;
})(utils.PosterClass);
exports.RendererBase = RendererBase;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/renderer.js","/draw/renderers")
},{"../../utils/utils":41,"../canvas":17,"buffer":1,"oMfpAn":4}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var canvas = require('../canvas');
var utils = require('../../utils/utils');
var renderer = require('./renderer');
/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var RowRenderer = (function (_super) {
    __extends(RowRenderer, _super);
    function RowRenderer(model, scrolling_canvas) {
        this._model = model;
        this._visible_row_count = 0;
        // Setup canvases
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._scrolling_canvas = scrolling_canvas;
        this._row_width_counts = {}; // Dictionary of widths -> row count 
        // Base
        _super.call(this);
        // Set some basic rendering properties.
        this._base_options = {
            font_family: 'monospace',
            font_size: 14,
        };
        this._line_spacing = 2;
        // Set initial canvas sizes.  These lines may look redundant, but beware
        // because they actually cause an appropriate width and height to be set for
        // the text canvas because of the properties declared above.
        this.width = this._canvas.width;
        this.height = this._canvas.height;
        this._margin_left = 0;
        this._margin_top = 0;
        this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
        this._model.on('rows_added', utils.proxy(this._handle_rows_added, this));
        this._model.on('rows_removed', utils.proxy(this._handle_rows_removed, this));
        this._model.on('row_changed', utils.proxy(this._handle_row_changed, this)); // TODO: Implement my event.
    }
    Object.defineProperty(RowRenderer.prototype, "width", {
        get: function () {
            return this._canvas.width;
        },
        set: function (value) {
            this._canvas.width = value;
            this._text_canvas.width = value;
            this._tmp_canvas.width = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RowRenderer.prototype, "height", {
        get: function () {
            return this._canvas.height;
        },
        set: function (value) {
            this._canvas.height = value;
            // The text canvas should be the right height to fit all of the lines
            // that will be rendered in the base canvas.  This includes the lines
            // that are partially rendered at the top and bottom of the base canvas.
            var row_height = this.get_row_height();
            this._visible_row_count = Math.ceil(value / row_height) + 1;
            this._text_canvas.height = this._visible_row_count * row_height;
            this._tmp_canvas.height = this._text_canvas.height;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RowRenderer.prototype, "margin_left", {
        get: function () {
            return this._margin_left;
        },
        set: function (value) {
            // Update internal value.
            var delta = value - this._margin_left;
            this._margin_left = value;
            // Intelligently change the document's width, without causing
            // a complete O(N) width recalculation.
            var new_counts = {};
            for (var width in this._row_width_counts) {
                if (this._row_width_counts.hasOwnProperty(width)) {
                    new_counts[(parseFloat(width) + delta)] = this._row_width_counts[width];
                }
            }
            this._row_width_counts = new_counts;
            this._scrolling_canvas.scroll_width += delta;
            // Re-render with new margin.
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RowRenderer.prototype, "margin_top", {
        get: function () {
            return this._margin_top;
        },
        set: function (value) {
            // Update the scrollbars.
            this._scrolling_canvas.scroll_height += value - this._margin_top;
            // Update internal value.
            this._margin_top = value;
            // Re-render with new margin.
            this.render();
            // Tell parent layer this one has changed.
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     * @param [scroll] - How much the canvas was scrolled.
     */
    RowRenderer.prototype.render = function (scroll) {
        // If only the y axis was scrolled, blit the good contents and just render
        // what's missing.
        var partial_redraw = (scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height);
        // Update the text rendering
        var visible_rows = this.get_visible_rows();
        this._render_text_canvas(-this._scrolling_canvas.scroll_left + this._margin_left, visible_rows.top_row, !partial_redraw);
        // Copy the text image to this canvas
        this._canvas.clear();
        this._canvas.draw_image(this._text_canvas, this._scrolling_canvas.scroll_left, this.get_row_top(visible_rows.top_row));
    };
    /**
     * Gets the row and character indicies closest to given control space coordinates.
     * @param cursor_x - x value, 0 is the left of the canvas.
     * @param cursor_y - y value, 0 is the top of the canvas.
     */
    RowRenderer.prototype.get_row_char = function (cursor_x, cursor_y) {
        var row_index = Math.floor((cursor_y - this._margin_top) / this.get_row_height());
        // Find the character index.
        var widths = [0];
        try {
            for (var length = 1; length <= this._model._rows[row_index].length; length++) {
                widths.push(this.measure_partial_row_width(row_index, length));
            }
        }
        catch (e) {
        }
        var coords = this._model.validate_coords(row_index, utils.find_closest(widths, cursor_x - this._margin_left));
        return {
            row_index: coords.start_row,
            char_index: coords.start_char,
        };
    };
    /**
     * Measures the partial width of a text row.
     * @param  index
     * @param  [length] - number of characters
     * @return width
     */
    RowRenderer.prototype.measure_partial_row_width = function (index, length) {
        if (0 > index || index >= this._model._rows.length) {
            return 0;
        }
        var text = this._model._rows[index];
        text = (length === undefined) ? text : text.substring(0, length);
        return this._canvas.measure_text(text, this._base_options);
    };
    /**
     * Measures the height of a text row as if it were rendered.
     */
    RowRenderer.prototype.get_row_height = function (index) {
        return this._base_options.font_size + this._line_spacing;
    };
    /**
     * Gets the top of the row when rendered
     */
    RowRenderer.prototype.get_row_top = function (index) {
        return index * this.get_row_height() + this._margin_top;
    };
    /**
     * Gets the visible rows.
     */
    RowRenderer.prototype.get_visible_rows = function () {
        // Find the row closest to the scroll top.  If that row is below
        // the scroll top, use the partially displayed row above it.
        var top_row = Math.max(0, Math.floor((this._scrolling_canvas.scroll_top - this._margin_top) / this.get_row_height()));
        // Find the row closest to the scroll bottom.  If that row is above
        // the scroll bottom, use the partially displayed row below it.
        var row_count = Math.ceil(this._canvas.height / this.get_row_height());
        var bottom_row = top_row + row_count;
        // Row count + 1 to include first row.
        return { top_row: top_row, bottom_row: bottom_row, row_count: row_count + 1 };
    };
    /**
     * Render a single row
     */
    RowRenderer.prototype._render_row = function (index, x, y) {
        this._text_canvas.draw_text(x, y, this._model._rows[index], this._base_options);
    };
    /**
     * Render text to the text canvas.
     *
     * Later, the main rendering function can use this rendered text to draw the
     * base canvas.
     * @param x_offset - horizontal offset of the text
     * @param top_row
     * @param force_redraw - redraw the contents even if they are
     *                       the same as the cached contents.
     */
    RowRenderer.prototype._render_text_canvas = function (x_offset, top_row, force_redraw) {
        // Try to reuse some of the already rendered text if possible.
        var rendered = false;
        var row_height = this.get_row_height();
        var i;
        if (!force_redraw && this._last_rendered_offset === x_offset) {
            var last_top = this._last_rendered_row;
            var scroll = top_row - last_top; // Positive = user scrolling downward.
            if (scroll < this._last_rendered_row_count) {
                // Get a snapshot of the text before the scroll.
                this._tmp_canvas.clear();
                this._tmp_canvas.draw_image(this._text_canvas, 0, 0);
                // Render the new text.
                var saved_rows = this._last_rendered_row_count - Math.abs(scroll);
                var new_rows = this._visible_row_count - saved_rows;
                if (scroll > 0) {
                    // Render the bottom.
                    this._text_canvas.clear();
                    for (i = top_row + saved_rows; i < top_row + this._visible_row_count; i++) {
                        this._render_row(i, x_offset, (i - top_row) * row_height);
                    }
                }
                else if (scroll < 0) {
                    // Render the top.
                    this._text_canvas.clear();
                    for (i = top_row; i < top_row + new_rows; i++) {
                        this._render_row(i, x_offset, (i - top_row) * row_height);
                    }
                }
                else {
                    // Nothing has changed.
                    return;
                }
                // Use the old content to fill in the rest.
                this._text_canvas.draw_image(this._tmp_canvas, 0, -scroll * this.get_row_height());
                this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
                rendered = true;
            }
        }
        // Full rendering.
        if (!rendered) {
            this._text_canvas.clear();
            for (i = top_row; i < top_row + this._visible_row_count; i++) {
                this._render_row(i, x_offset, (i - top_row) * row_height);
            }
            this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
        }
        // Remember for delta rendering.
        this._last_rendered_row = top_row;
        this._last_rendered_row_count = this._visible_row_count;
        this._last_rendered_offset = x_offset;
    };
    /**
     * Measures a strings width.
     * @param text - text to measure the width of
     * @param [index] - row index, can be used to apply size sensitive
     *        formatting to the text.
     */
    RowRenderer.prototype._measure_text_width = function (text, index) {
        return this._canvas.measure_text(text, this._base_options);
    };
    /**
     * Handles when the model's value changes
     * Complexity: O(N) for N rows of text.
     */
    RowRenderer.prototype._handle_value_changed = function () {
        // Calculate the document width.
        this._row_width_counts = {};
        var document_width = 0;
        for (var i = 0; i < this._model._rows.length; i++) {
            var width = this._measure_row_width(i) + this._margin_left;
            document_width = Math.max(width, document_width);
            if (this._row_width_counts[width] === undefined) {
                this._row_width_counts[width] = 1;
            }
            else {
                this._row_width_counts[width]++;
            }
        }
        this._scrolling_canvas.scroll_width = document_width;
        this._scrolling_canvas.scroll_height = this._model._rows.length * this.get_row_height() + this._margin_top;
    };
    /**
     * Handles when one of the model's rows change
     */
    RowRenderer.prototype._handle_row_changed = function (text, index) {
        var new_width = this._measure_row_width(index) + this._margin_left;
        var old_width = this._measure_text_width(text, index) + this._margin_left;
        if (this._row_width_counts[old_width] == 1) {
            delete this._row_width_counts[old_width];
        }
        else {
            this._row_width_counts[old_width]--;
        }
        if (this._row_width_counts[new_width] !== undefined) {
            this._row_width_counts[new_width]++;
        }
        else {
            this._row_width_counts[new_width] = 1;
        }
        this._scrolling_canvas.scroll_width = this._find_largest_width();
    };
    /**
     * Handles when one or more rows are added to the model
     *
     * Assumes constant row height.
     */
    RowRenderer.prototype._handle_rows_added = function (start, end) {
        this._scrolling_canvas.scroll_height += (end - start + 1) * this.get_row_height();
        for (var i = start; i <= end; i++) {
            var new_width = this._measure_row_width(i) + this._margin_left;
            if (this._row_width_counts[new_width] !== undefined) {
                this._row_width_counts[new_width]++;
            }
            else {
                this._row_width_counts[new_width] = 1;
            }
        }
        this._scrolling_canvas.scroll_width = this._find_largest_width();
    };
    /**
     * Handles when one or more rows are removed from the model
     *
     * Assumes constant row height.
     * @param  rows - indicies
     * @param  [index]
     */
    RowRenderer.prototype._handle_rows_removed = function (rows, index) {
        // Decrease the scrolling height based on the number of rows removed.
        this._scrolling_canvas.scroll_height -= rows.length * this.get_row_height();
        for (var i = 0; i < rows.length; i++) {
            var old_width = this._measure_text_width(rows[i], i + index) + this._margin_left;
            if (this._row_width_counts[old_width] == 1) {
                delete this._row_width_counts[old_width];
            }
            else {
                this._row_width_counts[old_width]--;
            }
        }
        this._scrolling_canvas.scroll_width = this._find_largest_width();
    };
    /**
     * Measures the width of a text row as if it were rendered.
     */
    RowRenderer.prototype._measure_row_width = function (index) {
        return this.measure_partial_row_width(index, this._model._rows[index].length);
    };
    /**
     * Find the largest width in the width row count dictionary.
     */
    RowRenderer.prototype._find_largest_width = function () {
        var values = Object.keys(this._row_width_counts);
        values.sort(function (a, b) { return parseFloat(b) - parseFloat(a); });
        return parseFloat(values[0]);
    };
    return RowRenderer;
})(renderer.RendererBase);
exports.RowRenderer = RowRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/row.js","/draw/renderers")
},{"../../utils/utils":41,"../canvas":17,"./renderer":22,"buffer":1,"oMfpAn":4}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var renderer = require('./renderer');
var config_mod = require('../../utils/config');
var config = config_mod.config;
/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
var SelectionsRenderer = (function (_super) {
    __extends(SelectionsRenderer, _super);
    function SelectionsRenderer(cursors, style, row_renderer, has_focus, cursors_renderer) {
        var _this = this;
        _super.call(this);
        this._dirty = null;
        this.style = style;
        this._has_focus = has_focus;
        // When the cursors change, redraw the selection box(es).
        this._cursors = cursors;
        var rerender = function () {
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger('changed');
        };
        this._cursors.on('change', rerender);
        // When the style is changed, redraw the selection box(es).
        this.style.on('change', rerender);
        config.on('change', rerender);
        this._row_renderer = row_renderer;
        // When the cursor is hidden/shown, redraw the selection.
        cursors_renderer.on('toggle', function () {
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger('changed');
        });
    }
    /**
     * Render to the canvas
     * Note: This method is called often, so it's important that it's
     * optimized for speed.
     */
    SelectionsRenderer.prototype.render = function (scroll) {
        var _this = this;
        // If old contents exist, remove them.
        if (this._dirty === null || scroll !== undefined) {
            this._canvas.clear();
            this._dirty = null;
        }
        else {
            this._canvas.clear({
                x: this._dirty.x1 - 1,
                y: this._dirty.y1 - 1,
                width: this._dirty.x2 - this._dirty.x1 + 2,
                height: this._dirty.y2 - this._dirty.y1 + 2,
            });
            this._dirty = null;
        }
        // Get newline width.
        var newline_width = config.newline_width;
        if (newline_width === undefined || newline_width === null) {
            newline_width = 2;
        }
        // Only render if the canvas has focus.
        this._cursors.cursors.forEach(function (cursor) {
            // Get the visible rows.
            var visible_rows = _this._row_renderer.get_visible_rows();
            // Draw the selection box.
            if (cursor.start_row !== null && cursor.start_char !== null && cursor.end_row !== null && cursor.end_char !== null) {
                for (var i = Math.max(cursor.start_row, visible_rows.top_row); i <= Math.min(cursor.end_row, visible_rows.bottom_row); i++) {
                    var left = _this._row_renderer.margin_left;
                    if (i == cursor.start_row && cursor.start_char > 0) {
                        left += _this._row_renderer.measure_partial_row_width(i, cursor.start_char);
                    }
                    var selection_color;
                    if (_this._has_focus()) {
                        selection_color = _this.style.get('selection', 'skyblue');
                    }
                    else {
                        selection_color = _this.style.get('selection_unfocused', 'gray');
                    }
                    var width;
                    if (i !== cursor.end_row) {
                        width = _this._row_renderer.measure_partial_row_width(i) - left + _this._row_renderer.margin_left + newline_width;
                    }
                    else {
                        width = _this._row_renderer.measure_partial_row_width(i, cursor.end_char);
                        // If this isn't the first selected row, make sure atleast the newline
                        // is visibily selected at the beginning of the row by making sure that
                        // the selection box is atleast the size of a newline character (as
                        // defined by the user config).
                        if (i !== cursor.start_row) {
                            width = Math.max(newline_width, width);
                        }
                        width = width - left + _this._row_renderer.margin_left;
                    }
                    var block = {
                        x: left,
                        y: _this._row_renderer.get_row_top(i),
                        width: width,
                        height: _this._row_renderer.get_row_height(i)
                    };
                    _this._canvas.draw_rectangle(block.x, block.y, block.width, block.height, {
                        fill_color: selection_color,
                    });
                    if (_this._dirty === null) {
                        _this._dirty = {
                            x1: block.x,
                            y1: block.y,
                            x2: block.x + block.width,
                            y2: block.y + block.height
                        };
                    }
                    else {
                        _this._dirty.x1 = Math.min(block.x, _this._dirty.x1);
                        _this._dirty.y1 = Math.min(block.y, _this._dirty.y1);
                        _this._dirty.x2 = Math.max(block.x + block.width, _this._dirty.x2);
                        _this._dirty.y2 = Math.max(block.y + block.height, _this._dirty.y2);
                    }
                }
            }
        });
    };
    return SelectionsRenderer;
})(renderer.RendererBase);
exports.SelectionsRenderer = SelectionsRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/renderers/selections.js","/draw/renderers")
},{"../../utils/config":39,"./renderer":22,"buffer":1,"oMfpAn":4}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var canvas = require('./canvas');
var utils = require('../utils/utils');
/**
 * HTML canvas with drawing convinience functions.
 */
var ScrollingCanvas = (function (_super) {
    __extends(ScrollingCanvas, _super);
    function ScrollingCanvas() {
        _super.call(this);
        this._bind_events();
        this._old_scroll_left = 0;
        this._old_scroll_top = 0;
        // Set default size.
        this.width = 400;
        this.height = 300;
    }
    Object.defineProperty(ScrollingCanvas.prototype, "scroll_width", {
        /**
         * Width of the scrollable canvas area
         */
        get: function () {
            // Get
            return this._scroll_width || 0;
        },
        set: function (value) {
            // Set
            this._scroll_width = value;
            this._move_dummy(this._scroll_width, this._scroll_height || 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "scroll_height", {
        /**
         * Height of the scrollable canvas area.
         */
        get: function () {
            // Get
            return this._scroll_height || 0;
        },
        set: function (value) {
            // Set
            this._scroll_height = value;
            this._move_dummy(this._scroll_width || 0, this._scroll_height);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "scroll_top", {
        /**
         * Top most pixel in the scrolled window.
         */
        get: function () {
            // Get
            return this._scroll_bars.scrollTop;
        },
        set: function (value) {
            // Set
            this._scroll_bars.scrollTop = value;
            this._handle_scroll();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "scroll_left", {
        /**
         * Left most pixel in the scrolled window.
         */
        get: function () {
            // Get
            return this._scroll_bars.scrollLeft;
        },
        set: function (value) {
            // Set
            this._scroll_bars.scrollLeft = value;
            this._handle_scroll();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "height", {
        /**
         * Height of the canvas
         */
        get: function () {
            return this._canvas.height / 2;
        },
        set: function (value) {
            this._canvas.setAttribute('height', String(value * 2));
            this.el.setAttribute('style', 'width: ' + this.width + 'px; height: ' + value + 'px;');
            this.trigger('resize', { height: value });
            this._try_redraw();
            // Stretch the image for retina support.
            this.scale(2, 2);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "width", {
        /**
         * Width of the canvas
         */
        get: function () {
            return this._canvas.width / 2;
        },
        set: function (value) {
            this._canvas.setAttribute('width', String(value * 2));
            this.el.setAttribute('style', 'width: ' + value + 'px; height: ' + this.height + 'px;');
            this.trigger('resize', { width: value });
            this._try_redraw();
            // Stretch the image for retina support.
            this.scale(2, 2);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScrollingCanvas.prototype, "focused", {
        /**
         * Is the canvas or related elements focused?
         */
        get: function () {
            return document.activeElement === this.el || document.activeElement === this._scroll_bars || document.activeElement === this._dummy || document.activeElement === this._canvas;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Causes the canvas contents to be redrawn.
     */
    ScrollingCanvas.prototype.redraw = function (scroll) {
        this.clear();
        this.trigger('redraw', scroll);
    };
    /**
     * Transform an x value based on scroll position.
     * @param x
     * @param [inverse] - perform inverse transformation
     */
    ScrollingCanvas.prototype.tx = function (x, inverse) {
        return x - (inverse ? -1 : 1) * this.scroll_left;
    };
    /**
     * Transform a y value based on scroll position.
     * @param y
     * @param [inverse] - perform inverse transformation
     */
    ScrollingCanvas.prototype.ty = function (y, inverse) {
        return y - (inverse ? -1 : 1) * this.scroll_top;
    };
    /**
     * Layout the elements for the canvas.
     * Creates `this.el`
     */
    ScrollingCanvas.prototype._layout = function () {
        _super.prototype._layout.call(this);
        // Change the canvas class so it's not hidden.
        this._canvas.setAttribute('class', 'canvas');
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'poster scroll-window');
        this.el.setAttribute('tabindex', '0');
        this._scroll_bars = document.createElement('div');
        this._scroll_bars.setAttribute('class', 'scroll-bars');
        this._touch_pane = document.createElement('div');
        this._touch_pane.setAttribute('class', 'touch-pane');
        this._dummy = document.createElement('div');
        this._dummy.setAttribute('class', 'scroll-dummy');
        this.el.appendChild(this._canvas);
        this.el.appendChild(this._scroll_bars);
        this._scroll_bars.appendChild(this._dummy);
        this._scroll_bars.appendChild(this._touch_pane);
    };
    /**
     * Bind to the events of the canvas.
     */
    ScrollingCanvas.prototype._bind_events = function () {
        var _this = this;
        // Trigger scroll and redraw events on scroll.
        this._scroll_bars.onscroll = function (e) {
            _this.trigger('scroll', e);
            _this._handle_scroll();
        };
        // Prevent scroll bar handled mouse events from bubbling.
        var scrollbar_event = function (e) {
            if (e.target !== _this._touch_pane) {
                utils.cancel_bubble(e);
            }
        };
        this._scroll_bars.onmousedown = scrollbar_event;
        this._scroll_bars.onmouseup = scrollbar_event;
        this._scroll_bars.onclick = scrollbar_event;
        this._scroll_bars.ondblclick = scrollbar_event;
    };
    /**
     * Handles when the canvas is scrolled.
     */
    ScrollingCanvas.prototype._handle_scroll = function () {
        if (this._old_scroll_top !== undefined && this._old_scroll_left !== undefined) {
            var scroll = {
                x: this.scroll_left - this._old_scroll_left,
                y: this.scroll_top - this._old_scroll_top,
            };
            this._try_redraw(scroll);
        }
        else {
            this._try_redraw();
        }
        this._old_scroll_left = this.scroll_left;
        this._old_scroll_top = this.scroll_top;
    };
    /**
     * Queries to see if redraw is okay, and then redraws if it is.
     * @return true if redraw happened.
     */
    ScrollingCanvas.prototype._try_redraw = function (scroll) {
        if (this._query_redraw()) {
            this.redraw(scroll);
            return true;
        }
        return false;
    };
    /**
     * Trigger the 'query_redraw' event.
     * @return true if control should redraw itself.
     */
    ScrollingCanvas.prototype._query_redraw = function () {
        return this.trigger('query_redraw').every(function (x) { return x; });
    };
    /**
     * Moves the dummy element that causes the scrollbar to appear.
     */
    ScrollingCanvas.prototype._move_dummy = function (x, y) {
        this._dummy.setAttribute('style', 'left: ' + String(x) + 'px; top: ' + String(y) + 'px;');
        this._touch_pane.setAttribute('style', 'width: ' + String(Math.max(x, this._scroll_bars.clientWidth)) + 'px; ' + 'height: ' + String(Math.max(y, this._scroll_bars.clientHeight)) + 'px;');
    };
    return ScrollingCanvas;
})(canvas.Canvas);
exports.ScrollingCanvas = ScrollingCanvas;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/draw/scrolling_canvas.js","/draw")
},{"../utils/utils":41,"./canvas":17,"buffer":1,"oMfpAn":4}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var scrolling_canvas = require('./draw/scrolling_canvas');
var document_controller = require('./document_controller');
var document_model = require('./document_model');
var document_view = require('./document_view');
var pluginmanager = require('./plugins/manager');
var plugin = require('./plugins/plugin');
var renderer = require('./draw/renderers/renderer');
var style = require('./styles/style');
var utils = require('./utils/utils');
var config_mod = require('./utils/config');
var prism = require('prismjs');
var config = config_mod.config;
/**
 * Canvas based text editor
 */
var Poster = (function (_super) {
    __extends(Poster, _super);
    function Poster() {
        var _this = this;
        _super.call(this);
        // Create canvas
        this.canvas = new scrolling_canvas.ScrollingCanvas();
        this.el = this.canvas.el; // Convenience
        this._style = new style.Style();
        // Create model, controller, and view.
        this.model = new document_model.DocumentModel();
        this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
        this.view = new document_view.DocumentView(this.canvas, this.model, this.controller.cursors, this._style, function () {
            return _this.controller.clipboard.hidden_input === document.activeElement || _this.canvas.focused;
        }, function (x, y) { return _this.controller.clipboard.set_position(x, y); });
        // Load plugins.
        this.plugins = new pluginmanager.PluginManager(this);
        this.plugins.load('gutter');
        this.plugins.load('linenumbers');
        this.plugins.load('commenthotkey');
    }
    Object.defineProperty(Poster.prototype, "style", {
        get: function () {
            return this._style;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poster.prototype, "config", {
        get: function () {
            return config;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poster.prototype, "value", {
        get: function () {
            return this.model.text;
        },
        set: function (value) {
            this.model.text = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poster.prototype, "width", {
        get: function () {
            return this.view.width;
        },
        set: function (value) {
            this.view.width = value;
            this.trigger('resized');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poster.prototype, "height", {
        get: function () {
            return this.view.height;
        },
        set: function (value) {
            this.view.height = value;
            this.trigger('resized');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Poster.prototype, "language", {
        get: function () {
            return this.view.language;
        },
        set: function (value) {
            this.view.language = value;
        },
        enumerable: true,
        configurable: true
    });
    return Poster;
})(utils.PosterClass);
window.poster = {
    Poster: Poster,
    Canvas: plugin.PluginBase,
    PluginBase: plugin.PluginBase,
    RendererBase: renderer.RendererBase,
    utils: utils
};
// Expose prism so the user can load custom language files.
window.Prism = prism;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_6048566a.js","/")
},{"./document_controller":13,"./document_model":14,"./document_view":15,"./draw/renderers/renderer":22,"./draw/scrolling_canvas":25,"./plugins/manager":32,"./plugins/plugin":33,"./styles/style":36,"./utils/config":39,"./utils/utils":41,"buffer":1,"oMfpAn":4,"prismjs":5}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin');
var utils = require('../../utils/utils');
/**
 * CommentHotKey
 */
var CommentHotKey = (function (_super) {
    __extends(CommentHotKey, _super);
    function CommentHotKey() {
        _super.call(this);
        this.on('load', this._handle_load, this);
    }
    /**
     * Handles when the plugin is loaded.
     */
    CommentHotKey.prototype._handle_load = function () {
        var _this = this;
        // Register actions.
        if (navigator.appVersion.indexOf("Mac") != -1) {
            this.poster.controller.map.map({
                'meta-fowardslash': 'cursor.comment'
            });
        }
        else {
            this.poster.controller.map.map({
                'ctrl-fowardslash': 'cursor.comment'
            });
        }
        this.poster.controller.map.register('cursor.comment', function () {
            var comment_prefix = _this._get_comment_prefix();
            var cursors = _this.poster.controller.cursors.cursors;
            for (var i = 0; i < cursors.length; i++) {
                _this._comment(cursors[i], comment_prefix);
            }
            return true;
        });
    };
    /**
     * Comment the rows selected by the cursor.
     */
    CommentHotKey.prototype._comment = function (cursor, comment) {
        var _this = this;
        var comment_block;
        var comment_prefix;
        if (utils.is_array(comment)) {
            comment_block = comment;
        }
        else {
            comment_prefix = comment;
        }
        var commented = true;
        var least_indented = null;
        for (var i = cursor.start_row; i <= cursor.end_row; i++) {
            var row = this.poster.model._rows[i];
            var indent = row.length - utils.ltrim(row).length;
            if (least_indented === null || indent < least_indented)
                least_indented = indent;
            if (comment_block) {
                if (utils.ltrim(row).substr(0, comment_block[0].length) !== comment_block[0] || utils.rtrim(row).substr(-comment_block[1].length) !== comment_block[1]) {
                    commented = false;
                }
            }
            else {
                if (utils.ltrim(row).substr(0, comment_prefix.length) !== comment_prefix) {
                    commented = false;
                }
            }
        }
        // If the lines are already commented, remove the comments.
        cursor.historical(function () {
            if (commented) {
                for (var i = cursor.start_row; i <= cursor.end_row; i++) {
                    var row = _this.poster.model._rows[i];
                    var indent_size = row.length - utils.ltrim(row).length;
                    var indent = row.substr(0, indent_size);
                    if (comment_block) {
                        var right_indent_size = row.length - utils.rtrim(row).length;
                        _this._model_replace_row(cursor, i, row.substr(0, indent_size) + row.substr(indent_size + comment_block[0].length, row.length - (indent_size + right_indent_size + comment_block[0].length + comment_block[1].length)) + (right_indent_size > 0 ? row.substr(-right_indent_size) : ''));
                        cursor.primary_char -= comment_block[0].length;
                        cursor.secondary_char -= comment_block[0].length;
                    }
                    else {
                        _this._model_replace_row(cursor, i, row.substr(0, indent_size) + row.substr(indent_size + comment_prefix.length));
                        cursor.primary_char -= comment_prefix.length;
                        cursor.secondary_char -= comment_prefix.length;
                    }
                }
            }
            else {
                for (var i = cursor.start_row; i <= cursor.end_row; i++) {
                    var row = _this.poster.model._rows[i];
                    if (comment_block) {
                        var right_indent_size = row.length - utils.rtrim(row).length;
                        _this._model_replace_row(cursor, i, row.substr(0, least_indented) + comment_block[0] + row.substr(least_indented, row.length - least_indented - right_indent_size) + comment_block[1] + (right_indent_size > 0 ? row.substr(-right_indent_size) : ''));
                        cursor.primary_char += comment_block[0].length;
                        cursor.secondary_char += comment_block[0].length;
                    }
                    else {
                        _this._model_replace_row(cursor, i, row.substr(0, least_indented) + comment_prefix + row.substr(least_indented));
                        cursor.primary_char += comment_prefix.length;
                        cursor.secondary_char += comment_prefix.length;
                    }
                }
            }
        });
        cursor.trigger('change');
    };
    /**
     * Replace a row's text.
     */
    CommentHotKey.prototype._model_replace_row = function (cursor, row, text) {
        cursor.model_remove_row(row);
        cursor.model_add_row(row, text);
    };
    /**
     * Get the comment identifier for the current language.
     */
    CommentHotKey.prototype._get_comment_prefix = function () {
        switch (this.poster.language) {
            case 'actionscript':
            case 'c':
            case 'clike':
            case 'cpp':
            case 'csharp':
            case 'dart':
            case 'fsharp':
            case 'go':
            case 'groovy':
            case 'jade':
            case 'java':
            case 'javascript':
            case 'jsx':
            case 'less':
            case 'objectivec':
            case 'pascal':
            case 'php - extras':
            case 'php':
            case 'rust':
            case 'scala':
            case 'swift':
            case 'stylus':
            case 'typescript':
                return '// ';
            case 'apacheconf':
            case 'bash':
            case 'coffeescript':
            case 'gherkin':
            case 'git':
            case 'julia':
            case 'nsis':
            case 'perl':
            case 'powershell':
            case 'python':
            case 'r':
            case 'rip':
            case 'ruby':
            case 'yaml':
                return '# ';
            case 'applescript':
            case 'eiffel':
            case 'haskell':
            case 'sql':
                return '-- ';
            case 'aspnet':
                return "'";
            case 'autohotkey':
            case 'ini':
            case 'nasm':
            case 'scheme':
                return '; ';
            case 'css':
            case 'sas':
            case 'scss':
                return ['/* ', ' */'];
            case 'erlang':
            case 'latex':
            case 'matlab':
                return '% ';
            case 'fortran':
                return '! ';
            case 'haml':
                return '-# ';
            case 'handlebars':
            case 'markdown':
            case 'wiki':
                return ['<!-- ', ' -->'];
            case 'lolcode':
                return 'BTW ';
            case 'rest':
                return '.. ';
            case 'smalltalk':
                return ['"', '"'];
            case 'smarty':
                return ['{* ', ' *}'];
            case 'twig':
                return ['{# ', ' #}'];
            default:
                return null;
        }
    };
    return CommentHotKey;
})(plugin.PluginBase);
exports.CommentHotKey = CommentHotKey;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/commenthotkey/commenthotkey.js","/plugins/commenthotkey")
},{"../../utils/utils":41,"../plugin":33,"buffer":1,"oMfpAn":4}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin');
var renderer = require('./renderer');
/**
 * Gutter plugin.
 */
var Gutter = (function (_super) {
    __extends(Gutter, _super);
    function Gutter() {
        _super.call(this);
        this.on('load', this._handle_load, this);
        this.on('unload', this._handle_unload, this);
        this._gutter_width = 50;
    }
    Object.defineProperty(Gutter.prototype, "gutter_width", {
        // Create a gutter_width property that is adjustable.
        get: function () {
            return this._gutter_width;
        },
        set: function (value) {
            this._set_width(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Gutter.prototype, "renderer", {
        get: function () {
            return this._renderer;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Sets the gutter's width.
     * @param value - width in pixels
     */
    Gutter.prototype._set_width = function (value) {
        if (this._gutter_width !== value) {
            if (this.loaded) {
                this.poster.view.row_renderer.margin_left += value - this._gutter_width;
            }
            this._gutter_width = value;
            this.trigger('changed');
        }
    };
    /**
     * Handles when the plugin is loaded.
     */
    Gutter.prototype._handle_load = function () {
        this.poster.view.row_renderer.margin_left += this._gutter_width;
        this._renderer = new renderer.GutterRenderer(this);
        this.register_renderer(this._renderer);
    };
    /**
     * Handles when the plugin is unloaded.
     */
    Gutter.prototype._handle_unload = function () {
        // Remove all listeners to this plugin's changed event.
        this._renderer.unregister();
        this.poster.view.row_renderer.margin_left -= this._gutter_width;
    };
    return Gutter;
})(plugin.PluginBase);
exports.Gutter = Gutter;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/gutter/gutter.js","/plugins/gutter")
},{"../plugin":33,"./renderer":29,"buffer":1,"oMfpAn":4}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../draw/renderers/renderer');
/**
 * Renderers the gutter.
 */
var GutterRenderer = (function (_super) {
    __extends(GutterRenderer, _super);
    function GutterRenderer(gutter) {
        var _this = this;
        _super.call(this, undefined, { parent_independent: true });
        this._gutter = gutter;
        this._gutter.on('changed', function () {
            _this._render();
            _this.trigger('changed');
        });
        this._hovering = false;
    }
    /**
     * Handles rendering
     * Only re-render when scrolled horizontally.
     */
    GutterRenderer.prototype.render = function (scroll) {
        // Scrolled right xor hovering
        var left = this._gutter.poster.canvas.scroll_left;
        if ((left > 0) !== this._hovering) {
            this._hovering = left > 0;
            this._render();
        }
    };
    /**
     * Unregister the event listeners
     */
    GutterRenderer.prototype.unregister = function () {
        this._gutter.off('changed', this._render);
    };
    /**
     * Renders the gutter
     */
    GutterRenderer.prototype._render = function () {
        this._canvas.clear();
        var width = this._gutter.gutter_width;
        this._canvas.draw_rectangle(0, 0, width, this.height, {
            fill_color: this._gutter.poster.style.gutter,
        });
        // If the gutter is hovering over content, draw a drop shadow.
        if (this._hovering) {
            var shadow_width = 15;
            var gradient = this._canvas.gradient(width, 0, width + shadow_width, 0, this._gutter.poster.style.gutter_shadow || [
                [0, 'black'],
                [1, 'transparent']
            ]);
            this._canvas.draw_rectangle(width, 0, shadow_width, this.height, {
                fill_color: gradient,
                alpha: 0.35,
            });
        }
    };
    return GutterRenderer;
})(renderer.RendererBase);
exports.GutterRenderer = GutterRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/gutter/renderer.js","/plugins/gutter")
},{"../../draw/renderers/renderer":22,"buffer":1,"oMfpAn":4}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin');
var renderer = require('./renderer');
/**
 * Line numbers plugin.
 */
var LineNumbers = (function (_super) {
    __extends(LineNumbers, _super);
    function LineNumbers() {
        _super.call(this);
        this.on('load', this._handle_load, this);
        this.on('unload', this._handle_unload, this);
    }
    /**
     * Handles when the plugin is loaded.
     */
    LineNumbers.prototype._handle_load = function () {
        this._renderer = new renderer.LineNumbersRenderer(this);
        this.register_renderer(this._renderer);
    };
    /**
     * Handles when the plugin is unloaded.
     */
    LineNumbers.prototype._handle_unload = function () {
        // Remove all listeners to this plugin's changed event.
        this._renderer.unregister();
    };
    return LineNumbers;
})(plugin.PluginBase);
exports.LineNumbers = LineNumbers;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/linenumbers/linenumbers.js","/plugins/linenumbers")
},{"../plugin":33,"./renderer":31,"buffer":1,"oMfpAn":4}],31:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../draw/renderers/renderer');
var canvas = require('../../draw/canvas');
var utils = require('../../utils/utils');
/**
 * Renderers the line numbers.
 */
var LineNumbersRenderer = (function (_super) {
    __extends(LineNumbersRenderer, _super);
    function LineNumbersRenderer(plugin) {
        _super.call(this, undefined, { parent_independent: true });
        this._plugin = plugin;
        this._top = null;
        this._top_row = null;
        this._character_width = null;
        this._last_row_count = null;
        // Find gutter plugin, listen to its change event.
        var manager = this._plugin.poster.plugins;
        this._gutter = manager.find('gutter')[0];
        this._gutter.renderer.on('changed', this._gutter_resize, this);
        // Get row renderer.
        this._row_renderer = this._plugin.poster.view.row_renderer;
        // Double buffer.
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._text_canvas.width = this._gutter.gutter_width;
        this._tmp_canvas.width = this._gutter.gutter_width;
        this.height = this.height;
        // Adjust the gutter size when the number of lines in the document changes.
        this._plugin.poster.model.on('text_changed', utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on('rows_added', utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on('rows_removed', utils.proxy(this._handle_text_change, this));
        this._handle_text_change();
    }
    Object.defineProperty(LineNumbersRenderer.prototype, "height", {
        get: function () {
            return this._canvas.height;
        },
        set: function (value) {
            // Adjust every buffer's size when the height changes.
            this._canvas.height = value;
            // The text canvas should be the right height to fit all of the lines
            // that will be rendered in the base canvas.  This includes the lines
            // that are partially rendered at the top and bottom of the base canvas.
            var row_height = this._row_renderer.get_row_height();
            this._row_height = row_height;
            this._visible_row_count = Math.ceil(value / row_height) + 1;
            this._text_canvas.height = this._visible_row_count * row_height;
            this._tmp_canvas.height = this._text_canvas.height;
            this.rerender();
            this.trigger('changed');
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Handles rendering
     * Only re-render when scrolled vertically.
     */
    LineNumbersRenderer.prototype.render = function (scroll) {
        var top = this._gutter.poster.canvas.scroll_top;
        if (this._top === null || this._top !== top) {
            this._top = top;
            this._render();
        }
    };
    LineNumbersRenderer.prototype.rerender = function () {
        // Draw everything.
        this._character_width = null;
        this._text_canvas.erase_options_cache();
        this._text_canvas.clear();
        this._render_rows(this._top_row, this._visible_row_count);
        // Render the buffer at the correct offset.
        this._canvas.clear();
        this._canvas.draw_image(this._text_canvas, 0, this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
    };
    /**
     * Unregister the event listeners
     */
    LineNumbersRenderer.prototype.unregister = function () {
        this._gutter.off('changed', this._render);
    };
    /**
     * Renders the line numbers
     */
    LineNumbersRenderer.prototype._render = function () {
        // Measure the width of numerical characters if not done yet.
        if (this._character_width === null) {
            this._character_width = this._text_canvas.measure_text('0123456789', {
                font_family: 'monospace',
                font_size: 14,
            }) / 10.0;
            this._handle_text_change();
        }
        // Update the text buffer if needed.
        var top_row = this._row_renderer.get_row_char(0, this._top).row_index;
        var lines = this._plugin.poster.model._rows.length;
        if (this._top_row !== top_row) {
            this._last_row_count = lines;
            var last_top_row = this._top_row;
            this._top_row = top_row;
            // Recycle rows if possible.
            var row_scroll = this._top_row - last_top_row;
            var row_delta = Math.abs(row_scroll);
            if (this._top_row !== null && row_delta < this._visible_row_count) {
                // Get a snapshot of the text before the scroll.
                this._tmp_canvas.clear();
                this._tmp_canvas.draw_image(this._text_canvas, 0, 0);
                // Render the new rows.
                this._text_canvas.clear();
                if (this._top_row < last_top_row) {
                    // Scrolled up the document (the scrollbar moved up, page down)
                    this._render_rows(this._top_row, row_delta);
                }
                else {
                    // Scrolled down the document (the scrollbar moved down, page up)
                    this._render_rows(this._top_row + this._visible_row_count - row_delta, row_delta);
                }
                // Use the old content to fill in the rest.
                this._text_canvas.draw_image(this._tmp_canvas, 0, -row_scroll * this._row_height);
            }
            else {
                // Draw everything.
                this._text_canvas.clear();
                this._render_rows(this._top_row, this._visible_row_count);
            }
        }
        // Render the buffer at the correct offset.
        this._canvas.clear();
        this._canvas.draw_image(this._text_canvas, 0, this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
    };
    /**
     * Renders a set of line numbers.
     */
    LineNumbersRenderer.prototype._render_rows = function (start_row, num_rows) {
        var lines = this._plugin.poster.model._rows.length;
        for (var i = start_row; i < start_row + num_rows; i++) {
            if (i < lines) {
                var y = (i - this._top_row) * this._row_height;
                if (this._plugin.poster.config.highlight_draw) {
                    this._text_canvas.draw_rectangle(0, y, this._text_canvas.width, this._row_height, {
                        fill_color: utils.random_color(),
                    });
                }
                this._text_canvas.draw_text(10, y, String(i + 1), {
                    font_family: 'monospace',
                    font_size: 14,
                    color: this._plugin.poster.style.get('gutter_text', 'black'),
                });
            }
        }
    };
    /**
     * Handles when the number of lines in the editor changes.
     */
    LineNumbersRenderer.prototype._handle_text_change = function () {
        var lines = this._plugin.poster.model._rows.length;
        var digit_width = Math.max(2, Math.ceil(Math.log(lines + 1) / Math.log(10)) + 1);
        var char_width = this._character_width || 10.0;
        this._gutter.gutter_width = digit_width * char_width + 8.0;
        if (lines !== this._last_row_count) {
            this.rerender();
            this.trigger('changed');
        }
    };
    /**
     * Handles when the gutter is resized
     */
    LineNumbersRenderer.prototype._gutter_resize = function () {
        this._text_canvas.width = this._gutter.gutter_width;
        this._tmp_canvas.width = this._gutter.gutter_width;
        this.rerender();
        this.trigger('changed');
    };
    return LineNumbersRenderer;
})(renderer.RendererBase);
exports.LineNumbersRenderer = LineNumbersRenderer;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/linenumbers/renderer.js","/plugins/linenumbers")
},{"../../draw/canvas":17,"../../draw/renderers/renderer":22,"../../utils/utils":41,"buffer":1,"oMfpAn":4}],32:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
var pluginbase = require('./plugin');
var gutter = require('./gutter/gutter');
var linenumbers = require('./linenumbers/linenumbers');
var commenthotkey = require('./commenthotkey/commenthotkey');
/**
 * Plugin manager class
 */
var PluginManager = (function (_super) {
    __extends(PluginManager, _super);
    function PluginManager(poster) {
        _super.call(this);
        this._poster = poster;
        this._plugins = [];
        // Populate built-in plugin list.
        this._internal_plugins = {};
        this._internal_plugins['gutter'] = gutter.Gutter;
        this._internal_plugins['linenumbers'] = linenumbers.LineNumbers;
        this._internal_plugins['commenthotkey'] = commenthotkey.CommentHotKey;
    }
    Object.defineProperty(PluginManager.prototype, "plugins", {
        /**
         * Get a readonly copy of the loaded plugins.
         */
        get: function () {
            return [].concat(this._plugins);
        },
        enumerable: true,
        configurable: true
    });
    PluginManager.prototype.load = function (plugin) {
        if (!(plugin instanceof pluginbase.PluginBase)) {
            var plugin_class = this._internal_plugins[plugin];
            if (plugin_class !== undefined) {
                plugin = new plugin_class();
            }
        }
        if (plugin instanceof pluginbase.PluginBase) {
            this._plugins.push(plugin);
            plugin.handle_load(this, this._poster);
            return true;
        }
        return false;
    };
    /**
     * Unloads a plugin
     * @returns success
     */
    PluginManager.prototype.unload = function (plugin) {
        var index = this._plugins.indexOf(plugin);
        if (index != -1) {
            this._plugins.splice(index, 1);
            plugin.handle_unload();
            return true;
        }
        return false;
    };
    PluginManager.prototype.find = function (plugin_class) {
        if (this._internal_plugins[plugin_class] !== undefined) {
            plugin_class = this._internal_plugins[plugin_class];
        }
        var found = [];
        for (var i = 0; i < this._plugins.length; i++) {
            if (this._plugins[i] instanceof plugin_class) {
                found.push(this._plugins[i]);
            }
        }
        return found;
    };
    return PluginManager;
})(utils.PosterClass);
exports.PluginManager = PluginManager;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/manager.js","/plugins")
},{"../utils/utils":41,"./commenthotkey/commenthotkey":27,"./gutter/gutter":28,"./linenumbers/linenumbers":30,"./plugin":33,"buffer":1,"oMfpAn":4}],33:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
/**
 * Plugin base class
 */
var PluginBase = (function (_super) {
    __extends(PluginBase, _super);
    function PluginBase() {
        _super.call(this);
        this.loaded = false;
        this._renderers = [];
        this._poster = null;
    }
    Object.defineProperty(PluginBase.prototype, "poster", {
        get: function () {
            return this._poster;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Unloads this plugin
     */
    PluginBase.prototype.unload = function () {
        this._manager.unload(this);
    };
    /**
     * Registers a renderer
     */
    PluginBase.prototype.register_renderer = function (renderer) {
        this._renderers.push(renderer);
        this.poster.view.add_renderer(renderer);
    };
    /**
     * Unregisters a renderer and removes it from the internal list.
     */
    PluginBase.prototype.unregister_renderer = function (renderer) {
        var index = this._renderers.indexOf(renderer);
        if (index !== -1) {
            this._renderers.splice(index, 1);
        }
        this._unregister_renderer(renderer);
    };
    /**
     * Loads the plugin
     */
    PluginBase.prototype.handle_load = function (manager, poster) {
        this._poster = poster;
        this._manager = manager;
        this.loaded = true;
        this.trigger('load');
    };
    /**
     * Trigger unload event
     */
    PluginBase.prototype.handle_unload = function () {
        for (var i = 0; i < this._renderers.length; i++) {
            this._unregister_renderer(this._renderers[i]);
        }
        this.loaded = false;
        this.trigger('unload');
    };
    /**
     * Unregisters a renderer
     */
    PluginBase.prototype._unregister_renderer = function (renderer) {
        this.poster.view.remove_renderer(renderer);
    };
    return PluginBase;
})(utils.PosterClass);
exports.PluginBase = PluginBase;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/plugins/plugin.js","/plugins")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],34:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var peacock = require('./peacock');
exports.styles = {
    "peacock": peacock,
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/styles/init.js","/styles")
},{"./peacock":35,"buffer":1,"oMfpAn":4}],35:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.style = {
    comment: '#7a7267',
    string: '#bcd42a',
    'class-name': '#ede0ce',
    keyword: '#26A6A6',
    boolean: '#bcd42a',
    function: '#ff5d38',
    operator: '#26A6A6',
    number: '#bcd42a',
    ignore: '#cccccc',
    punctuation: '#ede0ce',
    cursor: '#f8f8f0',
    cursor_width: 1.0,
    cursor_height: 1.1,
    selection: '#df3d18',
    selection_unfocused: '#4f1d08',
    text: '#ede0ce',
    background: '#2b2a27',
    gutter: '#2b2a27',
    gutter_text: '#7a7267',
    gutter_shadow: [
        [0, 'black'],
        [1, 'transparent']
    ],
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/styles/peacock.js","/styles")
},{"buffer":1,"oMfpAn":4}],36:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils/utils');
var styles = require('./init');
/**
 * Style
 */
var Style = (function (_super) {
    __extends(Style, _super);
    function Style() {
        _super.call(this, [
            'comment',
            'string',
            'class_name',
            'keyword',
            'boolean',
            'function',
            'operator',
            'number',
            'ignore',
            'punctuation',
            'cursor',
            'cursor_width',
            'cursor_height',
            'selection',
            'selection_unfocused',
            'text',
            'background',
            'gutter',
            'gutter_text',
            'gutter_shadow'
        ]);
        // Load the default style.
        this.load('peacock');
    }
    /**
     * Get the value of a property of this instance.
     */
    Style.prototype.get = function (name, default_value) {
        name = name.replace(/-/g, '_');
        return this[name] !== undefined ? this[name] : default_value;
    };
    Style.prototype.load = function (style) {
        try {
            // Load the style if it's built-in.
            if (styles.styles[style]) {
                style = styles.styles[style].style;
            }
            for (var key in style) {
                if (style.hasOwnProperty(key)) {
                    this[key] = style[key];
                }
            }
            return true;
        }
        catch (e) {
            console.error('Error loading style', e);
            return false;
        }
    };
    return Style;
})(utils.PosterClass);
exports.Style = Style;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/styles/style.js","/styles")
},{"../utils/utils":41,"./init":34,"buffer":1,"oMfpAn":4}],37:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('../utils/utils');
/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var HighlighterBase = (function (_super) {
    __extends(HighlighterBase, _super);
    function HighlighterBase(model, row_renderer) {
        _super.call(this);
        this._model = model;
        this._row_renderer = row_renderer;
        this._queued = null;
        this.delay = 15; //ms
        // Bind events.
        this._row_renderer.on('rows_changed', utils.proxy(this._handle_scroll, this));
        this._model.on('text_changed', utils.proxy(this._handle_text_change, this));
        this._model.on('row_changed', utils.proxy(this._handle_text_change, this));
    }
    /**
     * Highlight the document
     */
    HighlighterBase.prototype.highlight = function (start_row, end_row) {
        throw new Error('Not implemented');
    };
    /**
     * Queues a highlight operation.
     *
     * If a highlight operation is already queued, don't queue
     * another one.  This ensures that the highlighting is
     * frame rate locked.  Highlighting is an expensive operation.
     */
    HighlighterBase.prototype._queue_highlighter = function () {
        var _this = this;
        if (this._queued === null) {
            this._queued = setTimeout(function () {
                _this._model.acquire_tag_event_lock();
                try {
                    var visible_rows = _this._row_renderer.get_visible_rows();
                    var top_row = visible_rows.top_row;
                    var bottom_row = visible_rows.bottom_row;
                    _this.highlight(top_row, bottom_row);
                }
                finally {
                    _this._model.release_tag_event_lock();
                    _this._queued = null;
                }
            }, this.delay);
        }
    };
    /**
     * Handles when the visible row indicies are changed.
     */
    HighlighterBase.prototype._handle_scroll = function (start_row, end_row) {
        this._queue_highlighter();
    };
    /**
     * Handles when the text changes.
     */
    HighlighterBase.prototype._handle_text_change = function () {
        this._queue_highlighter();
    };
    return HighlighterBase;
})(utils.PosterClass);
exports.HighlighterBase = HighlighterBase;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/syntax/highlighter.js","/syntax")
},{"../utils/utils":41,"buffer":1,"oMfpAn":4}],38:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var superset = require('../utils/superset');
var highlighter = require('./highlighter');
var prism = require('prismjs');
/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */
var PrismHighlighter = (function (_super) {
    __extends(PrismHighlighter, _super);
    function PrismHighlighter(model, row_renderer) {
        _super.call(this, model, row_renderer);
        // Look back and forward this many rows for contextually 
        // sensitive highlighting.
        this._row_padding = 30;
        this._language = null;
    }
    Object.defineProperty(PrismHighlighter.prototype, "languages", {
        get: function () {
            var languages = [];
            for (var l in prism.languages) {
                if (["extend", "insertBefore", "DFS"].indexOf(l) == -1) {
                    languages.push(l);
                }
            }
            return languages;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Highlight the document
     */
    PrismHighlighter.prototype.highlight = function (start_row, end_row) {
        var _this = this;
        // Get the first and last rows that should be highlighted.
        start_row = Math.max(0, start_row - this._row_padding);
        end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);
        // Abort if language isn't specified.
        if (!this._language)
            return;
        // Get the text of the rows.
        var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);
        // Figure out where each tag belongs.
        var highlights = this._highlight(text); // [start_index, end_index, tag]
        // Calculate Poster tags
        highlights.forEach(function (highlight) {
            // Translate tag character indicies to row, char coordinates.
            var before_rows = text.substring(0, highlight[0]).split('\n');
            var group_start_row = start_row + before_rows.length - 1;
            var group_start_char = before_rows[before_rows.length - 1].length;
            var after_rows = text.substring(0, highlight[1]).split('\n');
            var group_end_row = start_row + after_rows.length - 1;
            var group_end_char = after_rows[after_rows.length - 1].length;
            while (group_start_char === _this._model._rows[group_start_row].length) {
                if (group_start_row < group_end_row) {
                    group_start_row++;
                    group_start_char = 0;
                }
                else {
                    return;
                }
            }
            while (group_end_char === 0) {
                if (group_end_row > group_start_row) {
                    group_end_row--;
                    group_end_char = _this._model._rows[group_end_row].length;
                }
                else {
                    return;
                }
            }
            // Apply tag if it's not already applied.
            var tag = highlight[2].toLowerCase();
            var existing_tags = _this._model.get_tags('syntax', group_start_row, group_start_char, group_end_row, group_end_char);
            // Make sure the number of tags = number of rows.
            var correct_count = (existing_tags.length === group_end_row - group_start_row + 1);
            // Make sure every tag value equals the new value.
            var correct_values = true;
            var i;
            if (correct_count) {
                for (i = 0; i < existing_tags.length; i++) {
                    if (existing_tags[i][3] !== tag) {
                        correct_values = false;
                        break;
                    }
                }
            }
            // Check that the start and ends of tags are correct.
            var correct_ranges = true;
            if (correct_count && correct_values) {
                if (existing_tags.length == 1) {
                    correct_ranges = existing_tags[0][1] === group_start_char && existing_tags[0][2] === group_end_char;
                }
                else {
                    correct_ranges = existing_tags[0][1] <= group_start_char && existing_tags[0][2] >= _this._model._rows[group_start_row].length - 1;
                    correct_ranges = correct_ranges && existing_tags[existing_tags.length - 1][1] === 0 && existing_tags[existing_tags.length - 1][2] >= group_end_char;
                    for (i = 1; i < existing_tags.length - 1; i++) {
                        correct_ranges = correct_ranges && existing_tags[i][1] === 0 && existing_tags[i][2] >= _this._model._rows[existing_tags[i][0]].length - 1;
                        if (!correct_ranges)
                            break;
                    }
                }
            }
            if (!(correct_count && correct_values && correct_ranges)) {
                _this._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag);
            }
        });
    };
    PrismHighlighter.prototype.load = function (language) {
        try {
            // Check if the language exists.
            if (prism.languages[language] === undefined) {
                throw new Error('Language does not exist!');
            }
            this._language = prism.languages[language];
            this._queue_highlighter();
            return true;
        }
        catch (e) {
            console.error('Error loading language', e);
            this._language = null;
            return false;
        }
    };
    /**
     * Find each part of text that needs to be highlighted.
     * @return list containing items of the form [start_index, end_index, tag]
     */
    PrismHighlighter.prototype._highlight = function (text) {
        // Tokenize using prism.js
        var tokens = prism.tokenize(text, this._language);
        // Convert the tokens into [start_index, end_index, tag]
        var left = 0;
        var flatten = function (tokens, prefix) {
            if (!prefix) {
                prefix = [];
            }
            var flat = [];
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (token.content) {
                    flat = flat.concat(flatten([].concat(token.content), prefix.concat(token.type)));
                }
                else {
                    if (prefix.length > 0) {
                        flat.push([left, left + token.length, prefix.join(' ')]);
                    }
                    left += token.length;
                }
            }
            return flat;
        };
        var tags = flatten(tokens);
        // Use a superset to reduce overlapping tags.
        var set = new superset.Superset();
        set.set(0, text.length - 1, '');
        tags.forEach(function (tag) { return set.set(tag[0], tag[1] - 1, tag[2]); });
        return set.array;
    };
    return PrismHighlighter;
})(highlighter.HighlighterBase);
exports.PrismHighlighter = PrismHighlighter;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/syntax/prism.js","/syntax")
},{"../utils/superset":40,"./highlighter":37,"buffer":1,"oMfpAn":4,"prismjs":5}],39:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils');
var Config = (function (_super) {
    __extends(Config, _super);
    function Config() {
        _super.call(this, [
            'highlight_draw',
            'highlight_blit',
            'newline_width',
            'tab_width',
            'use_spaces',
            'history_group_delay',
        ]);
    }
    return Config;
})(utils.PosterClass);
exports.Config = Config;
exports.config = new Config();
// Set defaults
exports.config.tab_width = 4;
exports.config.use_spaces = true;
exports.config.history_group_delay = 100;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/utils/config.js","/utils")
},{"./utils":41,"buffer":1,"oMfpAn":4}],40:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var utils = require('./utils');
/**
 * Superset
 */
var Superset = (function (_super) {
    __extends(Superset, _super);
    function Superset() {
        _super.call(this);
        this._array = [];
    }
    Object.defineProperty(Superset.prototype, "array", {
        get: function () {
            this._clean();
            return this._array;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Clears the set
     */
    Superset.prototype.clear = function () {
        utils.clear_array(this._array);
    };
    /**
     * Set the state of a region.
     * @param start - index, inclusive
     * @param stop - index, inclusive
     * @param state
     */
    Superset.prototype.set = function (start, stop, state) {
        this._set(start, stop, state, 0);
    };
    /**
     * Set the state of a region.
     * @param start - index, inclusive
     * @param stop - index, inclusive
     * @param state
     * @param index - current recursion index
     */
    Superset.prototype._set = function (start, stop, state, index) {
        // Make sure start and stop are in correct order.
        if (start > stop) {
            return;
        }
        var ns = start;
        var ne = stop;
        for (; index < this._array.length; index++) {
            var s = this._array[index][0];
            var e = this._array[index][1];
            var old_state = this._array[index][2];
            if (ns <= e && ne >= s) {
                this._array.splice(index, 1);
                // keep
                this._insert(index, s, ns - 1, old_state);
                // replace
                this._insert(index, Math.max(s, ns), Math.min(e, ne), state);
                // keep
                this._insert(index, ne + 1, e, old_state);
                // new
                this._set(ns, s - 1, state, index);
                this._set(e + 1, ne, state, index);
                return;
            }
        }
        // Doesn't intersect with anything.
        this._array.push([ns, ne, state]);
    };
    /**
     * Inserts an entry.
     */
    Superset.prototype._insert = function (index, start, end, state) {
        if (start > end)
            return;
        this._array.splice(index, 0, [start, end, state]);
    };
    /**
     * Joins consequtive states.
     */
    Superset.prototype._clean = function () {
        // Sort.
        this._array.sort(function (a, b) { return a[0] - b[0]; });
        for (var i = 0; i < this._array.length - 1; i++) {
            if (this._array[i][1] === this._array[i + 1][0] - 1 && this._array[i][2] === this._array[i + 1][2]) {
                this._array[i][1] = this._array[i + 1][1];
                this._array.splice(i + 1, 1);
                i--;
            }
        }
    };
    return Superset;
})(utils.PosterClass);
exports.Superset = Superset;

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/utils/superset.js","/utils")
},{"./utils":41,"buffer":1,"oMfpAn":4}],41:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
;
/**
 * Base class with helpful utilities
 * @param [eventful_properties] list of property names (strings)
 *        to create and wire change events to.
 */
var PosterClass = (function () {
    function PosterClass(eventful_properties) {
        var _this = this;
        this._events = {};
        this._on_all = [];
        // Construct eventful properties.
        if (eventful_properties && eventful_properties.length > 0) {
            for (var i = 0; i < eventful_properties.length; i++) {
                (function (name) {
                    _this.property(name, function () {
                        return this['_' + name];
                    }, function (value) {
                        this.trigger('change:' + name, value);
                        this.trigger('change', name, value);
                        this['_' + name] = value;
                        this.trigger('changed:' + name);
                        this.trigger('changed', name);
                    });
                })(eventful_properties[i]);
            }
        }
    }
    /**
     * Define a property for the class
     */
    PosterClass.prototype.property = function (name, getter, setter) {
        Object.defineProperty(this, name, {
            get: getter,
            set: setter,
            configurable: true
        });
    };
    /**
     * Register an event listener
     */
    PosterClass.prototype.on = function (event, handler, context) {
        event = event.trim().toLowerCase();
        // Make sure a list for the event exists.
        if (!this._events[event]) {
            this._events[event] = [];
        }
        // Push the handler and the context to the event's callback list.
        this._events[event].push([handler, context]);
    };
    /**
     * Unregister one or all event listeners for a specific event
     */
    PosterClass.prototype.off = function (event, handler) {
        event = event.trim().toLowerCase();
        // If a handler is specified, remove all the callbacks
        // with that handler.  Otherwise, just remove all of
        // the registered callbacks.
        if (handler) {
            this._events[event] = this._events[event].filter(function (callback) { return callback[0] !== handler; });
        }
        else {
            this._events[event] = [];
        }
    };
    /**
     * Register a global event handler.
     *
     * A global event handler fires for any event that's
     * triggered.
     * @param handler - function that accepts one argument,
     *        the name of the event.
     */
    PosterClass.prototype.on_all = function (handler) {
        var index = this._on_all.indexOf(handler);
        if (index === -1) {
            this._on_all.push(handler);
        }
    };
    /**
     * Unregister a global event handler.
     * @return true if a handler was removed
     */
    PosterClass.prototype.off_all = function (handler) {
        var index = this._on_all.indexOf(handler);
        if (index != -1) {
            this._on_all.splice(index, 1);
            return true;
        }
        return false;
    };
    /**
     * Triggers the callbacks of an event to fire.
     * @return array of return values
     */
    PosterClass.prototype.trigger = function (event) {
        var _this = this;
        var pargs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            pargs[_i - 1] = arguments[_i];
        }
        event = event.trim().toLowerCase();
        // Convert arguments to an array and call callbacks.
        var args = Array.prototype.slice.call(arguments);
        args.splice(0, 1);
        // Trigger global handlers first.
        this._on_all.forEach(function (handler) { return handler.apply(_this, [event].concat(args)); });
        // Trigger individual handlers second.
        var events = this._events[event];
        if (events) {
            var returns = [];
            events.forEach(function (callback) { return returns.push(callback[0].apply(callback[1], args)); });
            return returns;
        }
        return [];
    };
    return PosterClass;
})();
exports.PosterClass = PosterClass;
/**
 * Checks if a value is callable
 */
exports.callable = function (value) {
    return typeof value == 'function';
};
/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 */
exports.resolve_callable = function (value) {
    if (exports.callable(value)) {
        return value.call(this);
    }
    else {
        return value;
    }
};
/**
 * Creates a proxy to a function so it is called in the correct context.
 */
exports.proxy = function (f, context) {
    if (f === undefined) {
        throw new Error('f cannot be undefined');
    }
    return function () {
        return f.apply(context, arguments);
    };
};
/**
 * Clears an array in place.
 *
 * Despite an O(N) complexity, this seems to be the fastest way to clear
 * a list in place in Javascript.
 * Benchmark: http://jsperf.com/empty-javascript-array
 * Complexity: O(N)
 */
exports.clear_array = function (array) {
    while (array.length > 0) {
        array.pop();
    }
};
/**
 * Checks if a value is an array
 */
exports.is_array = function (x) {
    return x instanceof Array;
};
/**
 * Find the closest value in a list
 *
 * Interpolation search algorithm.
 * Complexity: O(lg(lg(N)))
 * @param sorted - sorted array of numbers
 * @param x - number to try to find
 * @return index of the value that's closest to x
 */
exports.find_closest = function (sorted, x) {
    var min = sorted[0];
    var max = sorted[sorted.length - 1];
    if (x < min)
        return 0;
    if (x > max)
        return sorted.length - 1;
    if (sorted.length == 2) {
        if (max - x > x - min) {
            return 0;
        }
        else {
            return 1;
        }
    }
    var rate = (max - min) / sorted.length;
    if (rate === 0)
        return 0;
    var guess = Math.floor(x / rate);
    if (sorted[guess] == x) {
        return guess;
    }
    else if (guess > 0 && sorted[guess - 1] < x && x < sorted[guess]) {
        return exports.find_closest(sorted.slice(guess - 1, guess + 1), x) + guess - 1;
    }
    else if (guess < sorted.length - 1 && sorted[guess] < x && x < sorted[guess + 1]) {
        return exports.find_closest(sorted.slice(guess, guess + 2), x) + guess;
    }
    else if (sorted[guess] > x) {
        return exports.find_closest(sorted.slice(0, guess), x);
    }
    else if (sorted[guess] < x) {
        return exports.find_closest(sorted.slice(guess + 1), x) + guess + 1;
    }
};
/**
 * Make a shallow copy of an object.
 */
exports.shallow_copy = function (x) {
    var y = {};
    for (var key in x) {
        if (x.hasOwnProperty(key)) {
            y[key] = x[key];
        }
    }
    return y;
};
/**
 * Hooks a function.
 * @param obj - object to hook
 * @param method - name of the function to hook
 * @param hook - function to call before the original
 * @return hook reference, object with an `unhook` method
 */
exports.hook = function (obj, method, hook) {
    // If the original has already been hooked, add this hook to the list 
    // of hooks.
    if (obj[method] && obj[method].original && obj[method].hooks) {
        obj[method].hooks.push(hook);
    }
    else {
        // Create the hooked function
        var hooks = [hook];
        var original = obj[method];
        var hooked = function () {
            var args = arguments;
            var ret;
            var results;
            var that = this;
            hooks.forEach(function (hook) {
                results = hook.apply(that, args);
                ret = ret !== undefined ? ret : results;
            });
            if (original) {
                results = original.apply(this, args);
            }
            return ret !== undefined ? ret : results;
        };
        hooked.original = original;
        hooked.hooks = hooks;
        obj[method] = hooked;
    }
    // Return unhook method.
    return {
        unhook: function () {
            var index = obj[method].hooks.indexOf(hook);
            if (index != -1) {
                obj[method].hooks.splice(index, 1);
            }
            if (obj[method].hooks.length === 0) {
                obj[method] = obj[method].original;
            }
        },
    };
};
/**
 * Cancels event bubbling.
 */
exports.cancel_bubble = function (e) {
    if (e.stopPropagation)
        e.stopPropagation();
    if (e.cancelBubble !== null)
        e.cancelBubble = true;
    if (e.preventDefault)
        e.preventDefault();
};
/**
 * Generates a random color string
 * @return hexadecimal color string
 */
exports.random_color = function () {
    var random_byte = function () {
        var b = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? '0' + b : b;
    };
    return '#' + random_byte() + random_byte() + random_byte();
};
/**
 * Compare two arrays by contents for equality.
 */
exports.compare_arrays = function (x, y) {
    if (x.length != y.length)
        return false;
    for (var i = 0; i < x.length; i++) {
        if (x[i] !== y[i])
            return false;
    }
    return true;
};
/**
 * Compare two objects by contents for equality.
 */
exports.compare_objects = function (x, y) {
    // Make sure the objects have the same keys.
    var keys = Object.keys(x);
    if (!exports.compare_arrays(keys, Object.keys(y)))
        return false;
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (x[key] !== y[key])
            return false;
    }
    return true;
};
/**
 * Find all the occurances of a regular expression inside a string.
 * @param text - string to look in
 * @param regular_expression - regular expression to find
 * @return array of [start_index, end_index] pairs
 */
exports.findall = function (text, regular_expression, flags) {
    var re = new RegExp(regular_expression, flags || 'gm');
    var results;
    var found = [];
    while ((results = re.exec(text)) !== null) {
        var end_index = results.index + (results[0].length || 1);
        found.push([results.index, end_index]);
        re.lastIndex = Math.max(end_index, re.lastIndex);
    }
    return found;
};
/**
 * Checks if the character isn't text.
 * @return true if the character is not text.
 */
exports.not_text = function (c) {
    return 'abcdefghijklmnopqrstuvwxyz1234567890_'.indexOf(c.toLowerCase()) == -1;
};
/**
 * Merges objects
 * @return new object, result of merged objects
 */
exports.merge = function (objects) {
    var result = {};
    for (var i = 0; i < objects.length; i++) {
        for (var key in objects[i]) {
            if (objects[i].hasOwnProperty(key)) {
                result[key] = objects[i][key];
            }
        }
    }
    return result;
};
/**
 * Convert arguments object to an array of arguments.
 * @param  arguments_obj - `arguments`
 */
exports.args = function (arguments_obj) {
    return Array.prototype.slice.call(arguments_obj);
};
var _hashed_objects = 0;
/**
 * Generates a unique hash for an object.
 */
exports.hash = function (x) {
    if (x.__hash__ === undefined) {
        x.__hash__ = String(_hashed_objects++);
    }
    return x.__hash__;
};
/**
 * Left trim a string.
 */
exports.ltrim = function (x) {
    return x.replace(/^\s+/g, '');
};
/**
 * Right trim a string.
 */
exports.rtrim = function (x) {
    return x.replace(/\s+$/g, '');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/utils/utils.js","/utils")
},{"buffer":1,"oMfpAn":4}]},{},[26])