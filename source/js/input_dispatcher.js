// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Maps inputs to actions and then routes the actions 
 * to controllers.
 * @param {[type]} el - element to listen to.
 */
var InputDispatcher = function(el) {
    utils.PosterClass.call(this);
    var that = this;
    el.onkeypress = function(evt) { 
        evt = evt || window.event;
        var char_code = evt.which || evt.keyCode;
        var char_typed = String.fromCharCode(char_code);
        that.trigger('keypress', char_typed); 
    };
    el.onkeydown = function(evt) {
        evt = evt || window.event;

        // Cancel special key combinations from reaching the document.
        if (evt.ctrlKey || evt.metaKey || evt.altKey) {
            that._cancel_bubble(evt);
        }

        if (evt.keyCode == 13) { // Return
            that._cancel_bubble(evt);
            that.trigger('keypress', '\n');
        } else if (evt.keyCode == 8) {
            that._cancel_bubble(evt);
            that.trigger('backspace');
        } else if (evt.keyCode == 46) {
            that._cancel_bubble(evt);
            that.trigger('delete');
        } else if (evt.keyCode == 27) {
            that._cancel_bubble(evt);
            that.trigger('escape');
        } else if (evt.keyCode == 37) {
            that._cancel_bubble(evt);
            if (evt.shiftKey) {
                that.trigger('select_left');
            } else {
                that.trigger('left');
            }
        } else if (evt.keyCode == 38) {
            that._cancel_bubble(evt);
            if (evt.shiftKey) {
                that.trigger('select_up');
            } else {
                that.trigger('up');
            }
        } else if (evt.keyCode == 39) {
            that._cancel_bubble(evt);
            if (evt.shiftKey) {
                that.trigger('select_right');
            } else {
                that.trigger('right');
            }
        } else if (evt.keyCode == 40) {
            that._cancel_bubble(evt);
            if (evt.shiftKey) {
                console.log('select down');
                that.trigger('select_down');
            } else {
                that.trigger('down');
            }
        }
    };
    el.ondblclick = function() { };
    el.onclick = function(evt) { 
        evt = evt || window.event;
        var coords = that._calculate_coordinates(evt);
        that.trigger('click', coords.x, coords.y);
    };
    el.onmousedown = function(evt) { 
        evt = evt || window.event;
        var coords = that._calculate_coordinates(evt);
        that.trigger('mousedown', coords.x, coords.y);
    };
    el.onmouseup = function(evt) { 
        evt = evt || window.event;
        var coords = that._calculate_coordinates(evt);
        that.trigger('mouseup', coords.x, coords.y);
    };
    el.onmousemove = function(evt) { 
        evt = evt || window.event;
        var coords = that._calculate_coordinates(evt);
        that.trigger('mousemove', coords.x, coords.y);
    };
};
utils.inherit(InputDispatcher, utils.PosterClass);

/**
 * Cancels event bubbling.
 * @param  {event} e
 * @return {null}
 */
InputDispatcher.prototype._cancel_bubble = function(e) {
    e = e ? e : window.event;
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

/**
 * Calculates element relative coordinates
 * @param  {MouseEvent} e - event 
 * @return {dictionary} dictionary of the form {x, y}
 */
InputDispatcher.prototype._calculate_coordinates = function(e) {
    return {x: e.offsetX, y: e.offsetY};
};

// Exports
exports.InputDispatcher = InputDispatcher;