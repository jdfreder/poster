// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');

/**
 * Eventful clipboard support
 *
 * WARNING:  This class is a hudge kludge that works around the prehistoric
 * clipboard support (lack thereof) in modern webrowsers.  It creates a hidden
 * textbox which is focused.  The programmer must call `set_clippable` to change
 * what will be copied when the user hits keys corresponding to a copy 
 * operation.  Events `copy`, `cut`, and `paste` are raised by this class.
 */
export class Clipboard extends utils.PosterClass {
    public hidden_input: HTMLTextAreaElement;

    private _el: HTMLElement;
    private _clippable: string;

    public constructor(el: HTMLElement) {
        super();
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
    public set_clippable(text: string): void {
        this._clippable = text;
        this.hidden_input.value = this._clippable;
        this._focus();
    }

    /**
     * Move the textarea to a point.
     * @param x
     * @param y
     */
    public set_position(x: number, y: number): void {
        this.hidden_input.setAttribute('style', 'left: ' + String(x) + 'px; top: ' + String(y) + 'px;');
    }

    /**
     * Focus the hidden text area.
     */
    private _focus(): void {
        this.hidden_input.focus();
        this.hidden_input.select();
    }

    /**
     * Handle when the user pastes into the textbox.
     */
    private _handle_paste(e): void {
        var pasted: string = e.clipboardData.getData(e.clipboardData.types[0]);
        utils.cancel_bubble(e);
        this.trigger('paste', pasted);
    }

    /**
     * Bind events of the hidden textbox.
     */
    private _bind_events(): void {

        // Listen to el's focus event.  If el is focused, focus the hidden input
        // instead.
        utils.hook(this._el, 'onfocus', utils.proxy(this._focus, this));

        utils.hook(this.hidden_input, 'onpaste', utils.proxy(this._handle_paste, this));
        utils.hook(this.hidden_input, 'oncut', () => {
            // Trigger the event in a timeout so it fires after the system event.
            setTimeout(() => {
                this.trigger('cut', this._clippable);
            }, 0);
        });
        utils.hook(this.hidden_input, 'oncopy', () => {
            this.trigger('copy', this._clippable);
        });
        utils.hook(this.hidden_input, 'onkeypress', () => {
            setTimeout(() => {
                this.hidden_input.value = this._clippable;
                this._focus();
            }, 0);
        });
        utils.hook(this.hidden_input, 'onkeyup', () => {
            setTimeout(() => {
                this.hidden_input.value = this._clippable;
                this._focus();
            }, 0);
        });
    }
}
