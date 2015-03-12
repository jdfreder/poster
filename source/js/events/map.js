// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import * as utils from '../utils.js';

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
export class Map extends utils.PosterClass {
    constructor(normalizer) {
        super.constructor();
        this._map = {};

        // Create normalizer property
        this._normalizer = null;
        this._proxy_handle_event = utils.proxy(this._handle_event, this);

        // If defined, set the normalizer.
        if (normalizer) this.normalizer = normalizer;
    }

    get normalizer() {
        return this._normalizer;
    }
    set normalizer(value) {
        // Remove event handler.
        if (this._normalizer) this._normalizer.off_all(this._proxy_handle_event);
        // Set, and add event handler.
        this._normalizer = value;
        if (value) value.on_all(this._proxy_handle_event);
    }

    /**
     * Append event actions to the map.
     *
     * This method has two signatures.  If a single argument
     * is passed to it, that argument is treated like a
     * dictionary.  If more than one argument is passed to it,
     * each argument is treated as alternating key, value
     * pairs of a dictionary.
     *
     * The map allows you to register actions for keys.
     * Example:
     *     map.append_map({
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
     *     map.append_map({
     *         'alt-v': ['action_a', 'action_b'],
     *     });
     * 
     * @return {null}
     */
    append_map() {
        var parsed = this._parse_map_arguments(arguments);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] === undefined) {
                this._map[key] = parsed[key];
            } else {
                this._map[key] = this._map[key].concat(parsed[key]);
            }
        });
    };

    /**
     * Prepend event actions to the map.
     *
     * See the doc for `append_map` for a detailed description of
     * possible input values.
     * @return {null}
     */
    prepend_map() {
        var parsed = this._parse_map_arguments(arguments);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] === undefined) {
                this._map[key] = parsed[key];
            } else {
                this._map[key] = parsed[key].concat(this._map[key]);
            }
        });
    };

    /**
     * Unmap event actions in the map.
     *
     * See the doc for `append_map` for a detailed description of
     * possible input values.
     * @return {null}
     */
    unmap() {
        var parsed = this._parse_map_arguments(arguments);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] !== undefined) {
                parsed[key].forEach(function(value) {
                    var index = this._map[key].indexOf(value);
                    if (index != -1) {
                        this._map[key].splice(index, 1);
                    }
                });
            }
        });
    };

    /**
     * Get a modifiable array of the actions for a particular event.
     * @param  {string} event
     * @return {array} by ref copy of the actions registered to an event.
     */
    get_mapping(event) {
        return this._map[this._normalize_event_name(event)];
    };

    /**
     * Invokes the callbacks of an action by name.
     * @param  {string} name
     * @param  {array} [args] - arguments to pass to the action callback[s]
     * @return {boolean} true if one or more of the actions returned true
     */
    invoke(name, args) {
        var action_callbacks = Map.registry[name];
        if (action_callbacks) {
            if (utils.is_array(action_callbacks)) {
                var returns = [];
                action_callbacks.forEach(function(action_callback) {
                    returns.append(action_callback.apply(undefined, args)===true);
                });

                // If one of the action callbacks returned true, cancel bubbling.
                if (returns.some(function(x) {return x;})) {
                    return true;
                }
            } else {
                if (action_callbacks.apply(undefined, args)===true) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Parse the arguments to a map function.
     * @param  {arguments array} args
     * @return {dictionary} parsed results
     */
    _parse_map_arguments(args) {
        var parsed = {};

        // One arument, treat it as a dictionary of event names and
        // actions.
        if (args.length == 1) {
            Object.keys(args[0]).forEach(key => {
                var value = args[0][key];
                var normalized_key = this._normalize_event_name(key);

                // If the value is not an array, wrap it in one.
                if (!utils.is_array(value)) {
                    value = [value];
                }

                // If the key is already defined, concat the values to
                // it.  Otherwise, set it.
                if (parsed[normalized_key] === undefined) {
                    parsed[normalized_key] = value;
                } else {
                    parsed[normalized_key] = parsed[normalized_key].concat(value);
                }
            });

        // More than one argument.  Treat as the format:
        // event_name1, action1, event_name2, action2, ..., event_nameN, actionN
        } else {
            for (var i=0; i<Math.floor(args.length/2); i++) {
                var key = this._normalize_event_name(args[2*i]);
                var value = args[2*i + 1];
                if (parsed[key]===undefined) {
                    parsed[key] = [value];
                } else {
                    parsed[key].push(value);
                }
            }
        }
        return parsed;
    };

    /**
     * Handles a normalized event.
     * @param  {string} name - name of the event
     * @param  {Event} e - browser Event object
     * @return {null}
     */
    _handle_event(name, e) {
        var normalized_event = this._normalize_event_name(name);
        var actions = this._map[normalized_event];
        if (actions) {
            actions.forEach(action => {
                if (this.invoke(action, [e])) {
                    utils.cancel_bubble(e);
                }
            });
        }
        return false;
    };

    /**
     * Alphabetically sorts keys in event name, so
     * @param  {string} name - event name
     * @return {string} normalized event name
     */
    _normalize_event_name(name) {
        return name.toLowerCase().trim().split('-').sort().join('-');
    }
}

/**
 * Alias for `append_map`.
 * @type {function}
 */
Map.prototype.map = Map.prototype.append_map;

/**
 * Map of API methods by name.
 * @type {dictionary}
 */
Map.registry = {};
Map._registry_tags = {};

/**
 * Registers an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @param  {Object} (optional) tag - allows you to specify a tag
 *                  which can be used with the `unregister_by_tag`
 *                  method to quickly unregister actions with
 *                  the tag specified.
 * @return {null}
 */
Map.register = function(name, f, tag) {
    if (utils.is_array(Map.registry[name])) {
        Map.registry[name].push(f);
    } else {
        if (Map.registry[name]===undefined) {
            Map.registry[name] = f;
        } else {
            Map.registry[name] = [Map.registry[name], f];
        }
    }

    if (tag) {
        if (Map._registry_tags[tag] === undefined) {
            Map._registry_tags[tag] = [];
        }
        Map._registry_tags[tag].push({name: name, f: f});
    }
};

/**
 * Unregister an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @return {boolean} true if action was found and unregistered
 */
Map.unregister = function(name, f) {
    if (utils.is_array(Map.registry[name])) {
        var index = Map.registry[name].indexOf(f);
        if (index != -1) {
            Map.registry[name].splice(index, 1);
            return true;
        }
    } else if (Map.registry[name] == f) {
        delete Map.registry[name];
        return true;
    }
    return false;
};

/**
 * Unregisters all of the actions registered with a given tag.
 * @param  {Object} tag - specified in Map.register.
 * @return {boolean} true if the tag was found and deleted.
 */
Map.unregister_by_tag = function(tag) {
    if (Map._registry_tags[tag]) {
        Map._registry_tags[tag].forEach(registration => {
            Map.unregister(registration.name, registration.f);
        });
        delete Map._registry_tags[tag];
        return true;
    }
};
