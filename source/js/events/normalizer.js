// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Normalizer = function() {
    utils.PosterClass.call(this);
    this._el_hooks = {};
};
utils.inherit(Normalizer, utils.PosterClass);

/**
 * Listen to the events of an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.listen_to = function(el) {
    var hooks = [];
    hooks.push(utils.hook(el, 'onkeypress', this._proxy('press', this._handle_keypress_event, el)));
    hooks.push(utils.hook(el, 'onkeydown',  this._proxy('down', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'onkeyup',  this._proxy('up', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'ondblclick',  this._proxy('dblclick', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onclick',  this._proxy('click', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousedown',  this._proxy('down', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmouseup',  this._proxy('up', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousemove',  this._proxy('move', this._handle_mousemove_event, el)));
    this._el_hooks[el] = hooks;
};

/**
 * Stops listening to an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.stop_listening_to = function(el) {
    if (this._el_hooks[el] !== undefined) {
        this._el_hooks[el].forEach(function(hook) {
            hook.unhook();
        });
        delete this._el_hooks[el];
    }
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mouse_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mousemove_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
};

/**
 * Handles when a keyboard event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keyboard_event = function(el, event_name, e) {
    e = e || window.event;
    var keyname = this._lookup_keycode(e.keyCode);
    if (keyname !== undefined) {
        this.trigger(this._modifier_string(e) + keyname + '-' + event_name, e);

        if (event_name=='down') {            
            this.trigger(this._modifier_string(e) + keyname, e);
        }
    }
    this.trigger(this._modifier_string(e) + String(e.keyCode) + '-' + event_name, e);
    this.trigger('key' + event_name, e);
};

/**
 * Handles when a keypress event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keypress_event = function(el, event_name, e) {
    this.trigger('keypress', e);
};

/**
 * Creates an element event proxy.
 * @param  {function} f
 * @param  {string} event_name
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype._proxy = function(event_name, f, el) {
    var that = this;
    return function() {
        var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
        return f.apply(that, args);
    };
};

/**
 * Create a modifiers string from an event.
 * @param  {Event} e
 * @return {string} dash separated modifier string
 */
Normalizer.prototype._modifier_string = function(e) {
    var modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.metaKey) modifiers.push('meta');
    if (e.shiftKey) modifiers.push('shift');
    var string = modifiers.sort().join('-');
    if (string.length > 0) string = string + '-';
    return string;
};

/**
 * Lookup the human friendly name for a keycode.
 * @param  {integer} keycode
 * @return {string} key name
 */
Normalizer.prototype._lookup_keycode = function(keycode) {
    if (112 <= keycode && keycode <= 123) { // F1-F12
        return 'f' + (keycode-111);
    } else if (48 <= keycode && keycode <= 57) { // 0-9
        return String(keycode-48);
    } else if (65 <= keycode && keycode <= 90) { // A-Z
        return 'abcdefghijklmnopqrstuvwxyz'.substring(String(keycode-65), String(keycode-64));
    } else {
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

// Exports
exports.Normalizer = Normalizer;
