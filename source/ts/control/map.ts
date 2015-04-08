// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import utils = require('../utils/utils');
import generics = require('../utils/generics');
import normalizer = require('./normalizer');

export interface IRegistryTag {
    name: string;
    f: utils.ICallback;
}

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
export class Map extends utils.PosterClass {
    public static registry: generics.IDictionary<utils.ICallback[]> = {};
    
    private static _registry_tags: generics.IDictionary<IRegistryTag[]> = {};

    private _map: generics.IDictionary<string[]>;
    private _normalizer: normalizer.Normalizer;
    private _proxy_handle_event: utils.ICallback;

    /**
     * Registers an action.
     * @param name - name of the action
     * @param f
     * @param (optional) tag - allows you to specify a tag
     *                  which can be used with the `unregister_by_tag`
     *                  method to quickly unregister actions with
     *                  the tag specified.
     */
    public static register = function(name: string, f: utils.ICallback, tag?: any): void {
        if (utils.is_array(Map.registry[name])) {
            Map.registry[name].push(f);
        } else {
            Map.registry[name] = [f];
        }

        if (tag) {
            if (Map._registry_tags[tag] === undefined) {
                Map._registry_tags[tag] = [];
            }
            Map._registry_tags[tag].push({name: name, f: f});
        }
    }

    /**
     * Unregister an action.
     * @param name - name of the action
     * @param f
     * @return true if action was found and unregistered
     */
    public static unregister = function(name: string, f: utils.ICallback): boolean {
        var index: number = Map.registry[name].indexOf(f);
        if (index != -1) {
            Map.registry[name].splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Unregisters all of the actions registered with a given tag.
     * @param tag - specified in Map.register.
     * @return true if the tag was found and deleted.
     */
    public static unregister_by_tag = function(tag: any): boolean {
        if (Map._registry_tags[tag]) {
            Map._registry_tags[tag].forEach(registration => {
                Map.unregister(registration.name, registration.f);
            });
            delete Map._registry_tags[tag];
            return true;
        }
    }

    public constructor(normalizer) {
        super();
        this._map = {};

        // Create normalizer property
        this._normalizer = null;
        this._proxy_handle_event = utils.proxy(this._handle_event, this);

        // If defined, set the normalizer.
        if (normalizer) this.normalizer = normalizer;
    }

    public get normalizer(): normalizer.Normalizer {
        return this._normalizer;
    }
    public set normalizer(value: normalizer.Normalizer) {
        // Remove event handler.
        if (this._normalizer) this._normalizer.off_all(this._proxy_handle_event);
        // Set, and add event handler.
        this._normalizer = value;
        if (value) value.on_all(this._proxy_handle_event);
    }

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
    public map(keyactions: generics.IDictionary<string|string[]>): void {
        var parsed: generics.IDictionary<string[]> = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] === undefined) {
                this._map[key] = parsed[key];
            } else {
                this._map[key] = this._map[key].concat(parsed[key]);
            }
        });
    }

    /**
     * Prepend event actions to the map.
     *
     * See the doc for `map` for a detailed description of
     * possible input values.
     */
    public prepend_map(keyactions: generics.IDictionary<string|string[]>): void {
        var parsed: generics.IDictionary<string[]> = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] === undefined) {
                this._map[key] = parsed[key];
            } else {
                this._map[key] = parsed[key].concat(this._map[key]);
            }
        });
    }

    /**
     * Unmap event actions in the map.
     *
     * See the doc for `map` for a detailed description of
     * possible input values.
     */
    public unmap(keyactions: generics.IDictionary<string|string[]>): void {
        var parsed: generics.IDictionary<string[]> = this._parse_map_arguments(keyactions);
        Object.keys(parsed).forEach(key => {
            if (this._map[key] !== undefined) {
                parsed[key].forEach(value => {
                    var index: number = this._map[key].indexOf(value);
                    if (index != -1) {
                        this._map[key].splice(index, 1);
                    }
                });
            }
        });
    }

    /**
     * Get a modifiable array of the actions for a particular event.
     * @return by ref copy of the actions registered to an event.
     */
    public get_mapping(event: string): string[] {
        return this._map[this._normalize_event_name(event)];
    }

    /**
     * Invokes the callbacks of an action by name.
     * @param name
     * @param [args] - arguments to pass to the action callback[s]
     * @return true if one or more of the actions returned true
     */
    public invoke(name: string, args: any[]): boolean {
        var action_callbacks: utils.ICallback[] = Map.registry[name];
        if (action_callbacks) {
            var returns = [];
            action_callbacks.forEach(action_callback => {
                returns.push(action_callback.apply(undefined, args)===true);
            });

            // If one of the action callbacks returned true, cancel bubbling.
            if (returns.some(function(x) {return x;})) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parse the arguments to a map function.
     */
    private _parse_map_arguments(keyactions: generics.IDictionary<string|string[]>): generics.IDictionary<string[]> {
        var parsed: generics.IDictionary<string[]> = {};
        Object.keys(keyactions).forEach(key => {
            var normalized_key: string = this._normalize_event_name(key);

            // If the value is not an array, wrap it in one.
            var value: string[];
            if (!utils.is_array(keyactions[key])) {
                value = [<string>keyactions[key]];
            } else {
                value = <string[]>keyactions[key];
            }

            // If the key is already defined, concat the values to
            // it.  Otherwise, set it.
            if (parsed[normalized_key] === undefined) {
                parsed[normalized_key] = value;
            } else {
                parsed[normalized_key] = parsed[normalized_key].concat(value);
            }
        });
        return parsed;
    }

    /**
     * Handles a normalized event.
     * @param name - name of the event
     * @param e - browser Event object
     */
    private _handle_event(name: string, e: Event): void {
        var normalized_event: string = this._normalize_event_name(name);
        var action_names: string[] = this._map[normalized_event];
        if (action_names) {
            action_names.forEach(action_name => {
                if (this.invoke(action_name, [e])) {
                    utils.cancel_bubble(e);
                }
            });
        }
    }

    /**
     * Alphabetically sorts keys in event name, so
     * @return normalized event name
     */
    private _normalize_event_name(name: string): string {
        return name.toLowerCase().trim().split('-').sort().join('-');
    }
}
