// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import generics = require('./generics');

export interface IHook {
    unhook: () => void;
}

export interface ICallback { (...args: any[]): any };

/**
 * Base class with helpful utilities
 * @param [eventful_properties] list of property names (strings)
 *        to create and wire change events to.
 */
export class PosterClass {
    private _events: generics.IDictionary<([ICallback, any])[]>;
    private _on_all: ICallback[];

    public constructor(eventful_properties?: string[]) {
        this._events = {};
        this._on_all = [];

        // Construct eventful properties.
        if (eventful_properties && eventful_properties.length>0) {
            for (var i:number=0; i<eventful_properties.length; i++) {
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
     */
    public property(name: string, getter: ICallback, setter: ICallback): void {
        Object.defineProperty(this, name, {
            get: getter,
            set: setter,
            configurable: true
        });
    }
    /**
     * Register an event listener
     */
    public on(event: string, handler: ICallback, context?: any): void {
        event = event.trim().toLowerCase();

        // Make sure a list for the event exists.
        if (!this._events[event]) { this._events[event] = []; }

        // Push the handler and the context to the event's callback list.
        this._events[event].push([handler, context]);
    }

    /**
     * Unregister one or all event listeners for a specific event
     */
    public off(event: string, handler?: ICallback): void {
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
     * @param handler - function that accepts one argument, 
     *        the name of the event.
     */
    public on_all(handler: ICallback): void {
        var index: number = this._on_all.indexOf(handler);
        if (index === -1) {
            this._on_all.push(handler);
        }
    }

    /**
     * Unregister a global event handler.
     * @return true if a handler was removed
     */
    public off_all(handler: ICallback): boolean {
        var index: number = this._on_all.indexOf(handler);
        if (index != -1) {
            this._on_all.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Triggers the callbacks of an event to fire.
     * @return array of return values
     */
    public trigger(event: string, ...pargs: any[]): any[] {
        event = event.trim().toLowerCase();

        // Convert arguments to an array and call callbacks.
        var args = Array.prototype.slice.call(arguments);
        args.splice(0,1);

        // Trigger global handlers first.
        this._on_all.forEach(handler => handler.apply(this, [event].concat(args)));

        // Trigger individual handlers second.
        var events: ([ICallback, any])[] = this._events[event];
        if (events) {
            var returns: any[] = [];
            events.forEach(callback => returns.push(callback[0].apply(callback[1], args)));
            return returns;
        }
        return [];
    }
}

/**
 * Checks if a value is callable
 */
export var callable = function(value: any): boolean {
    return typeof value == 'function';
};

/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 */
export var resolve_callable = function(value: any): any {
    if (callable(value)) {
        return value.call(this);
    } else {
        return value;
    }
};

/**
 * Creates a proxy to a function so it is called in the correct context.
 */
export var proxy = function(f: ICallback, context: any): ICallback {
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
 */
export var clear_array = function(array: any[]): void {
    while (array.length > 0) {
        array.pop();
    }
};

/**
 * Checks if a value is an array
 */
export var is_array = function(x: any): boolean {
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
export var find_closest = function(sorted: number[], x: number): number {
    var min: number = sorted[0];
    var max: number = sorted[sorted.length-1];
    if (x < min) return 0;
    if (x > max) return sorted.length-1;
    if (sorted.length == 2) {
        if (max - x > x - min) {
            return 0;
        } else {
            return 1;
        }
    }
    var rate: number = (max - min) / sorted.length;
    if (rate === 0) return 0;
    var guess: number = Math.floor(x / rate);
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
 * Make a shallow copy of an object.
 */
export var shallow_copy = function(x: any): any {
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
 * @param obj - object to hook
 * @param method - name of the function to hook
 * @param hook - function to call before the original
 * @return hook reference, object with an `unhook` method
 */
export var hook = function(obj: any, method: string, hook: ICallback): IHook {

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
 */
export var cancel_bubble = function(e: Event): void {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

/**
 * Generates a random color string
 * @return hexadecimal color string
 */
export var random_color = function(): string {
    var random_byte = function(): string { 
        var b: string = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? '0' + b : b;
    };
    return '#' + random_byte() + random_byte() + random_byte();
};

/**
 * Compare two arrays by contents for equality.
 */
export var compare_arrays = function(x: any[], y: any[]): boolean {
    if (x.length != y.length) return false;
    for (var i=0; i<x.length; i++) {
        if (x[i]!==y[i]) return false;
    }
    return true;
};

/**
 * Compare two objects by contents for equality.
 */
export var compare_objects = function(x: any, y: any): boolean {
    // Make sure the objects have the same keys.
    var keys: string[] = Object.keys(x); 
    if (!compare_arrays(keys, Object.keys(y))) return false;
    
    // Compare the values.
    for (var i=0; i<keys.length; i++) {
        var key: string = keys[i];
        if (x[key] !== y[key]) return false;
    }
    return true;
};

/**
 * Find all the occurances of a regular expression inside a string.
 * @param text - string to look in
 * @param regular_expression - regular expression to find
 * @return array of [start_index, end_index] pairs
 */
export var findall = function(text: string, regular_expression: string, flags: string): ([number, number])[] {
    var re: RegExp = new RegExp(regular_expression, flags || 'gm');
    var results: any;
    var found: ([number, number])[] = [];
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
export var not_text = function(c: string): boolean {
    return 'abcdefghijklmnopqrstuvwxyz1234567890_'.indexOf(c.toLowerCase()) == -1;
};

/**
 * Merges objects
 * @return new object, result of merged objects
 */
export var merge = function(objects: any[]): any {
    var result: any = {};
    for (var i: number = 0; i < objects.length; i++) {
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
export var args = function(arguments_obj: IArguments): any[] {
    return <any[]>Array.prototype.slice.call(arguments_obj);
};

var _hashed_objects: number = 0;

/**
 * Generates a unique hash for an object.
 */
export var hash = function(x: any): string {
    if (x.__hash__ === undefined) {
        x.__hash__ = _hashed_objects++;
    }
    return x.__hash__;
};

/**
 * Left trim a string.
 */
export var ltrim = function(x: string): string {
    return x.replace(/^\s+/g, '');
};

/**
 * Right trim a string.
 */
export var rtrim = function(x: string): string {
    return x.replace(/\s+$/g, '');
};
