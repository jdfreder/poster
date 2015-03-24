// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
export class Normalizer extends utils.PosterClass {
    private _el_hooks;

    constructor() {
        super();
        this._el_hooks = {};
    }

    /**
     * Listen to the events of an element.
     * @param  {HTMLElement} el
     * @return {null}
     */
    listen_to(el) {
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
    }

    /**
     * Stops listening to an element.
     * @param  {HTMLElement} el
     * @return {null}
     */
    stop_listening_to(el) {
        if (this._el_hooks[el] !== undefined) {
            this._el_hooks[el].forEach(hook => hook.unhook());
            delete this._el_hooks[el];
        }
    }

    /**
     * Handles when a mouse event occurs
     * @param  {HTMLElement} el
     * @param  {Event} e
     * @return {null}
     */
    _handle_mouse_event(el, event_name, e) {
        e = e || window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
    }

    /**
     * Handles when a mouse event occurs
     * @param  {HTMLElement} el
     * @param  {Event} e
     * @return {null}
     */
    _handle_mousemove_event(el, event_name, e) {
        e = e || window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
    }

    /**
     * Handles when a keyboard event occurs
     * @param  {HTMLElement} el
     * @param  {Event} e
     * @return {null}
     */
    _handle_keyboard_event(el, event_name, e) {
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
    }

    /**
     * Handles when a keypress event occurs
     * @param  {HTMLElement} el
     * @param  {Event} e
     * @return {null}
     */
    _handle_keypress_event(el, event_name, e) {
        this.trigger('keypress', e);
    }

    /**
     * Creates an element event proxy.
     * @param  {function} f
     * @param  {string} event_name
     * @param  {HTMLElement} el
     * @return {null}
     */
    _proxy(event_name, f, el) {
        var that = this;
        return function() {
            var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
            return f.apply(that, args);
        };
    }

    /**
     * Create a modifiers string from an event.
     * @param  {Event} e
     * @return {string} dash separated modifier string
     */
    _modifier_string(e) {
        var modifiers = [];
        if (e.ctrlKey) modifiers.push('ctrl');
        if (e.altKey) modifiers.push('alt');
        if (e.metaKey) modifiers.push('meta');
        if (e.shiftKey) modifiers.push('shift');
        var string = modifiers.sort().join('-');
        if (string.length > 0) string = string + '-';
        return string;
    }

    /**
     * Lookup the human friendly name for a keycode.
     * @param  {integer} keycode
     * @return {string} key name
     */
    _lookup_keycode(keycode) {
        if (112 <= keycode && keycode <= 123) { // F1-F12
            return 'f' + (keycode-111);
        } else if (48 <= keycode && keycode <= 57) { // 0-9
            return String(keycode-48);
        } else if (65 <= keycode && keycode <= 90) { // A-Z
            return 'abcdefghijklmnopqrstuvwxyz'.substring(keycode-65, keycode-64);
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
    }
}
