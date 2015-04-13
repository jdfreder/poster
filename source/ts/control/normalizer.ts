// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils/utils');
import generics = require('../utils/generics');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
export class Normalizer extends utils.PosterClass {
    private _el_hooks: generics.IDictionary<utils.IHook[]>;

    public constructor() {
        super();
        this._el_hooks = {};
    }

    /**
     * Listen to the events of an element.
     */
    public listen_to(el: HTMLElement): void {
        var hooks = [];
        hooks.push(utils.hook(el, 'onkeypress', this._proxy('press', this._handle_keypress_event, el)));
        hooks.push(utils.hook(el, 'onkeydown',  this._proxy('down', this._handle_keyboard_event, el)));
        hooks.push(utils.hook(el, 'onkeyup',  this._proxy('up', this._handle_keyboard_event, el)));
        hooks.push(utils.hook(el, 'ondblclick',  this._proxy('dblclick', this._handle_mouse_event, el)));
        hooks.push(utils.hook(el, 'onclick',  this._proxy('click', this._handle_mouse_event, el)));
        hooks.push(utils.hook(el, 'onmousedown',  this._proxy('down', this._handle_mouse_event, el)));
        hooks.push(utils.hook(el, 'onmouseup',  this._proxy('up', this._handle_mouse_event, el)));
        hooks.push(utils.hook(el, 'onmousemove',  this._proxy('move', this._handle_mousemove_event, el)));
        this._el_hooks[utils.hash(el)] = hooks;
    }

    /**
     * Stops listening to an element.
     */
    public stop_listening_to(el: HTMLElement): void {
        var key: string = utils.hash(el);
        if (this._el_hooks[key] !== undefined) {
            this._el_hooks[key].forEach(hook => hook.unhook());
            delete this._el_hooks[key];
        }
    }

    /**
     * Handles when a mouse event occurs
     */
    private _handle_mouse_event(el: HTMLElement, event_name: string, e: MouseEvent): void {
        e = e || <MouseEvent><any>window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
    }

    /**
     * Handles when a mouse event occurs
     */
    private _handle_mousemove_event(el: HTMLElement, event_name: string, e: MouseEvent): void {
        e = e || <MouseEvent><any>window.event;
        this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
    }

    /**
     * Handles when a keyboard event occurs
     */
    private _handle_keyboard_event(el: HTMLElement, event_name: string, e: KeyboardEvent): void {
        e = e || <KeyboardEvent><any>window.event;
        var keyname: string = this._lookup_keycode(e.keyCode);
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
     */
    private _handle_keypress_event(el: HTMLElement, event_name: string, e: KeyboardEvent): void {
        this.trigger('keypress', e);
    }

    /**
     * Creates an element event proxy.
     */
    private _proxy(event_name: string, f: utils.ICallback, el: HTMLElement): utils.ICallback {
        var that = this;
        return function() {
            var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
            return f.apply(that, args);
        };
    }

    /**
     * Create a modifiers string from an event.
     * @return dash separated modifier string
     */
    private _modifier_string(e: KeyboardEvent | MouseEvent): string {
        var modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push('ctrl');
        if (e.altKey) modifiers.push('alt');
        if (e.shiftKey) modifiers.push('shift');
        
        // Hack, metaKey not recognized by TypeScript.
        if (<any>e.metaKey) modifiers.push('meta');

        var string = modifiers.sort().join('-');
        if (string.length > 0) string = string + '-';
        return string;
    }

    /**
     * Lookup the human friendly name for a keycode.
     * @return key name
     */
    private _lookup_keycode(keycode: number): string {
        if (112 <= keycode && keycode <= 123) { // F1-F12
            return 'f' + (keycode-111);
        } else if (48 <= keycode && keycode <= 57) { // 0-9
            return String(keycode-48);
        } else if (65 <= keycode && keycode <= 90) { // A-Z
            return 'abcdefghijklmnopqrstuvwxyz'.substring(keycode-65, keycode-64);
        } else {
            var codes: generics.INumericDictionary<string> = {
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
