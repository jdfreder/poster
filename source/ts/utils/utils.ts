// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

export interface IHook {
    unhook: () => void;
}

/**
 * Base class with helpful utilities
 * @param {array} [eventful_properties] list of property names (strings)
 *                to create and wire change events to.
 */
export class PosterClass {
    private _events;
    private _on_all;

    constructor(eventful_properties?) {
        this._events = {};
        this._on_all = [];

        // Construct eventful properties.
        if (eventful_properties && eventful_properties.length>0) {
            for (var i=0; i<eventful_properties.length; i++) {
                (name => {
                    this.property(name, function() {
                        return this['_' + name];
                    }, function(value) {
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
     * @param  {string} name
     * @param  {function} getter
     * @param  {function} setter
     * @return {null}
     */
    property(name, getter, setter) {
        Object.defineProperty(this, name, {
            get: getter,
            set: setter,
            configurable: true
        });
    }

    /**
     * Register an event listener
     * @param  {string} event
     * @param  {function} handler
     * @param  {object} context
     * @return {null}
     */
    on(event, handler, context?) {
        event = event.trim().toLowerCase();

        // Make sure a list for the event exists.
        if (!this._events[event]) { this._events[event] = []; }

        // Push the handler and the context to the event's callback list.
        this._events[event].push([handler, context]);
    }

    /**
     * Unregister one or all event listeners for a specific event
     * @param  {string} event
     * @param  {callback} (optional) handler
     * @return {null}
     */
    off(event, handler?) {
        event = event.trim().toLowerCase();
        
        // If a handler is specified, remove all the callbacks
        // with that handler.  Otherwise, just remove all of
        // the registered callbacks.
        if (handler) {
            this._events[event] = this._events[event].filter(callback => callback[0] !== handler);
        } else {
            this._events[event] = [];
        }
    }

    /**
     * Register a global event handler. 
     * 
     * A global event handler fires for any event that's
     * triggered.
     * @param  {string} handler - function that accepts one
     *                            argument, the name of the
     *                            event,
     * @return {null}
     */
    on_all(handler) {
        var index = this._on_all.indexOf(handler);
        if (index === -1) {
            this._on_all.push(handler);
        }
    }

    /**
     * Unregister a global event handler.
     * @param  {[type]} handler
     * @return {boolean} true if a handler was removed
     */
    off_all(handler) {
        var index = this._on_all.indexOf(handler);
        if (index != -1) {
            this._on_all.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Triggers the callbacks of an event to fire.
     * @param  {string} event
     * @return {array} array of return values
     */
    trigger(event, ...pargs) {
        event = event.trim().toLowerCase();

        // Convert arguments to an array and call callbacks.
        var args = Array.prototype.slice.call(arguments);
        args.splice(0,1);

        // Trigger global handlers first.
        this._on_all.forEach(handler => handler.apply(this, [event].concat(args)));

        // Trigger individual handlers second.
        var events = this._events[event];
        if (events) {
            var returns = [];
            events.forEach(callback => returns.push(callback[0].apply(callback[1], args)));
            return returns;
        }
        return [];
    }
}

/**
 * Cause one class to inherit from another
 * @param  {type} child
 * @param  {type} parent
 * @return {null}
 */
export var inherit = function(child, parent) {
    child.prototype = Object.create(parent.prototype, {});
};

/**
 * Checks if a value is callable
 * @param  {any} value
 * @return {boolean}
 */
export var callable = function(value) {
    return typeof value == 'function';
};

/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 * @param  {any} value
 * @return {any}
 */
export var resolve_callable = function(value) {
    if (callable(value)) {
        return value.call(this);
    } else {
        return value;
    }
};

/**
 * Creates a proxy to a function so it is called in the correct context.
 * @return {function} proxied function.
 */
export var proxy = function(f, context) {
    if (f===undefined) { throw new Error('f cannot be undefined'); }
    return function() { return f.apply(context, arguments); };
};

/**
 * Clears an array in place.
 *
 * Despite an O(N) complexity, this seems to be the fastest way to clear
 * a list in place in Javascript. 
 * Benchmark: http://jsperf.com/empty-javascript-array
 * Complexity: O(N)
 * @param  {array} array
 * @return {null}
 */
export var clear_array = function(array) {
    while (array.length > 0) {
        array.pop();
    }
};

/**
 * Checks if a value is an array
 * @param  {any} x
 * @return {boolean} true if value is an array
 */
export var is_array = function(x) {
    return x instanceof Array;
};

/**
 * Find the closest value in a list
 * 
 * Interpolation search algorithm.  
 * Complexity: O(lg(lg(N)))
 * @param  {array} sorted - sorted array of numbers
 * @param  {float} x - number to try to find
 * @return {integer} index of the value that's closest to x
 */
export var find_closest = function(sorted, x) {
    var min = sorted[0];
    var max = sorted[sorted.length-1];
    if (x < min) return 0;
    if (x > max) return sorted.length-1;
    if (sorted.length == 2) {
        if (max - x > x - min) {
            return 0;
        } else {
            return 1;
        }
    }
    var rate = (max - min) / sorted.length;
    if (rate === 0) return 0;
    var guess = Math.floor(x / rate);
    if (sorted[guess] == x) {
        return guess;
    } else if (guess > 0 && sorted[guess-1] < x && x < sorted[guess]) {
        return find_closest(sorted.slice(guess-1, guess+1), x) + guess-1;
    } else if (guess < sorted.length-1 && sorted[guess] < x && x < sorted[guess+1]) {
        return find_closest(sorted.slice(guess, guess+2), x) + guess;
    } else if (sorted[guess] > x) {
        return find_closest(sorted.slice(0, guess), x);
    } else if (sorted[guess] < x) {
        return find_closest(sorted.slice(guess+1), x) + guess+1;
    }
};

/**
 * Make a shallow copy of a dictionary.
 * @param  {dictionary} x
 * @return {dictionary}
 */
export var shallow_copy = function(x) {
    var y: any = {};
    for (var key in x) {
        if (x.hasOwnProperty(key)) {
            y[key] = x[key];
        }
    }
    return y;
};

/**
 * Hooks a function.
 * @param  {object} obj - object to hook
 * @param  {string} method - name of the function to hook
 * @param  {function} hook - function to call before the original
 * @return hook reference, object with an `unhook` method
 */
export var hook = function(obj, method, hook): IHook {

    // If the original has already been hooked, add this hook to the list 
    // of hooks.
    if (obj[method] && obj[method].original && obj[method].hooks) {
        obj[method].hooks.push(hook);
    } else {
        // Create the hooked function
        var hooks = [hook];
        var original = obj[method];
        var hooked: any = function() {
            var args = arguments;
            var ret;
            var results;
            var that = this;
            hooks.forEach(function(hook) {
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
        unhook: function() {
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
 * @param  {event} e
 * @return {null}
 */
export var cancel_bubble = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

/**
 * Generates a random color string
 * @return {string} hexadecimal color string
 */
export var random_color = function() {
    var random_byte = function() { 
        var b = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? '0' + b : b;
    };
    return '#' + random_byte() + random_byte() + random_byte();
};

/**
 * Compare two arrays by contents for equality.
 * @param  {array} x
 * @param  {array} y
 * @return {boolean}
 */
export var compare_arrays = function(x, y) {
    if (x.length != y.length) return false;
    for (var i=0; i<x.length; i++) {
        if (x[i]!==y[i]) return false;
    }
    return true;
};

/**
 * Find all the occurances of a regular expression inside a string.
 * @param  {string} text - string to look in
 * @param  {string} re - regular expression to find
 * @return {array} array of [start_index, end_index] pairs
 */
export var findall = function(text, re, flags) {
    re = new RegExp(re, flags || 'gm');
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
 * @param  {char} c - character
 * @return {boolean} true if the character is not text.
 */
export var not_text = function(c) {
    return 'abcdefghijklmnopqrstuvwxyz1234567890_'.indexOf(c.toLowerCase()) == -1;
};

/**
 * Merges objects
 * @param  {array} objects
 * @return {object} new object, result of merged objects
 */
export var merge = function(objects) {
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
 * @param  {IArguments} arguments_obj - `arguments`
 */
export var args = function(arguments_obj: IArguments): any[] {
    return <any[]>Array.prototype.slice.call(arguments_obj);
};

/**
 * Generic callback interface.
 */
export interface ICallback{
    (...params: any[]): any;
};
