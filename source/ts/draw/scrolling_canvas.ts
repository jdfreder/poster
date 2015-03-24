// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import canvas = require('./canvas');
import utils = require('../utils/utils');

/**
 * HTML canvas with drawing convinience functions.
 */
export class ScrollingCanvas extends canvas.Canvas {
    public el;

    private _old_scroll_left;
    private _old_scroll_top;
    private _scroll_width;
    private _scroll_height;
    private _scroll_bars;
    private _dummy;
    private _touch_pane;

    constructor() {
        super();
        this._bind_events();
        this._old_scroll_left = 0;
        this._old_scroll_top = 0;

        // Set default size.
        this.width = 400;
        this.height = 300;
    }


    /**
     * Width of the scrollable canvas area
     */
    get scroll_width() {
        // Get
        return this._scroll_width || 0;
    }
    set scroll_width(value) {
        // Set
        this._scroll_width = value;
        this._move_dummy(this._scroll_width, this._scroll_height || 0);
    }

    /**
     * Height of the scrollable canvas area.
     */
    get scroll_height() {
        // Get
        return this._scroll_height || 0;
    }
    set scroll_height(value) {
        // Set
        this._scroll_height = value;
        this._move_dummy(this._scroll_width || 0, this._scroll_height);
    }

    /**
     * Top most pixel in the scrolled window.
     */
    get scroll_top() {
        // Get
        return this._scroll_bars.scrollTop;
    }
    set scroll_top(value) {
        // Set
        this._scroll_bars.scrollTop = value;
        this._handle_scroll();
    }

    /**
     * Left most pixel in the scrolled window.
     */
    get scroll_left() {
        // Get
        return this._scroll_bars.scrollLeft;
    }
    set scroll_left(value) {
        // Set
        this._scroll_bars.scrollLeft = value;
        this._handle_scroll();
    }

    /**
     * Height of the canvas
     * @return {float}
     */
    get height() { 
        return this._canvas.height / 2; 
    }
    set height(value) {
        this._canvas.setAttribute('height', value * 2);
        this.el.setAttribute('style', 'width: ' + this.width + 'px; height: ' + value + 'px;');

        this.trigger('resize', {height: value});
        this._try_redraw();
        
        // Stretch the image for retina support.
        this.scale(2,2);
    }

    /**
     * Width of the canvas
     * @return {float}
     */
    get width() { 
        return this._canvas.width / 2; 
    }
    set width(value) {
        this._canvas.setAttribute('width', value * 2);
        this.el.setAttribute('style', 'width: ' + value + 'px; height: ' + this.height + 'px;');

        this.trigger('resize', {width: value});
        this._try_redraw();
        
        // Stretch the image for retina support.
        this.scale(2,2);
    }

    /**
     * Is the canvas or related elements focused?
     * @return {boolean}
     */
    get focused() {
        return document.activeElement === this.el ||
            document.activeElement === this._scroll_bars ||
            document.activeElement === this._dummy ||
            document.activeElement === this._canvas;
    }

    /**
     * Causes the canvas contents to be redrawn.
     * @return {null}
     */
    redraw(scroll?) {
        this.clear();
        this.trigger('redraw', scroll);
    }

    /**
     * Layout the elements for the canvas.
     * Creates `this.el`
     * 
     * @return {null}
     */
    _layout() {
        canvas.Canvas.prototype._layout.call(this);
        // Change the canvas class so it's not hidden.
        this._canvas.setAttribute('class', 'canvas');

        this.el = document.createElement('div');
        this.el.setAttribute('class', 'poster scroll-window');
        this.el.setAttribute('tabindex', 0);
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
    }

    /**
     * Bind to the events of the canvas.
     * @return {null}
     */
    _bind_events() {

        // Trigger scroll and redraw events on scroll.
        this._scroll_bars.onscroll = e => {
            this.trigger('scroll', e);
            this._handle_scroll();
        };

        // Prevent scroll bar handled mouse events from bubbling.
        var scrollbar_event = e => {
            if (e.target !== this._touch_pane) {
                utils.cancel_bubble(e);
            }
        };
        this._scroll_bars.onmousedown = scrollbar_event;
        this._scroll_bars.onmouseup = scrollbar_event;
        this._scroll_bars.onclick = scrollbar_event;
        this._scroll_bars.ondblclick = scrollbar_event;
    }

    /**
     * Handles when the canvas is scrolled.
     */
    _handle_scroll() {
        if (this._old_scroll_top !== undefined && this._old_scroll_left !== undefined) {
            var scroll = {
                x: this.scroll_left - this._old_scroll_left,
                y: this.scroll_top - this._old_scroll_top,
            };
            this._try_redraw(scroll);
        } else {
            this._try_redraw();
        }
        this._old_scroll_left = this.scroll_left;
        this._old_scroll_top = this.scroll_top;
    }

    /**
     * Queries to see if redraw is okay, and then redraws if it is.
     * @return {boolean} true if redraw happened.
     */
    _try_redraw(scroll?) {
        if (this._query_redraw()) {
            this.redraw(scroll);
            return true;
        }
        return false;
    }

    /**
     * Trigger the 'query_redraw' event.
     * @return {boolean} true if control should redraw itself.
     */
    _query_redraw() {
        return this.trigger('query_redraw').every(x => x); 
    }

    /**
     * Moves the dummy element that causes the scrollbar to appear.
     * @param  {float} x
     * @param  {float} y
     * @return {null}
     */
    _move_dummy(x, y) {
        this._dummy.setAttribute('style', 'left: ' + String(x) + 'px; top: ' + String(y) + 'px;');
        this._touch_pane.setAttribute('style', 
            'width: ' + String(Math.max(x, this._scroll_bars.clientWidth)) + 'px; ' +
            'height: ' + String(Math.max(y, this._scroll_bars.clientHeight)) + 'px;');
    }

    /**
     * Transform an x value based on scroll position.
     * @param  {float} x
     * @param  {boolean} inverse - perform inverse transformation
     * @return {float}
     */
    _tx(x, inverse) { return x - (inverse?-1:1) * this.scroll_left; }

    /**
     * Transform a y value based on scroll position.
     * @param  {float} y
     * @param  {boolean} inverse - perform inverse transformation
     * @return {float}
     */
    _ty(y, inverse) { return y - (inverse?-1:1) * this.scroll_top; }
}