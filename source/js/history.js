// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import * as utils from './utils.js';
import * as keymap from './events/map.js';

/**
 * Reversible action history.
 */
export class History extends utils.PosterClass {
    constructor(map) {
        super.constructor();
        this._map = map;
        this._actions = [];
        this._action_groups = [];
        this._undone = [];
        this._autogroup = null;
        this._action_lock = false;

        keymap.Map.register('history.undo', utils.proxy(this.undo, this));
        keymap.Map.register('history.redo', utils.proxy(this.redo, this));
    }

    /**
     * Push a reversible action to the history.
     * @param  {string} forward_name - name of the forward action
     * @param  {array} forward_params - parameters to use when invoking the forward action
     * @param  {string} backward_name - name of the backward action
     * @param  {array} backward_params - parameters to use when invoking the backward action
     * @param  {float} [autogroup_delay] - time to wait to automatically group the actions.
     *                                     If this is undefined, autogrouping will not occur.
     */
    push_action(forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
        if (this._action_lock) return;

        this._actions.push({
            forward: {
                name: forward_name,
                parameters: forward_params,
            },
            backward: {
                name: backward_name,
                parameters: backward_params,
            }
        });
        this._undone = [];

        // If a delay is defined, prepare a timeout to autogroup.
        if (autogroup_delay !== undefined) {

            // If another timeout was already set, cancel it.
            if (this._autogroup !== null) {
                clearTimeout(this._autogroup);
            }

            // Set a new timeout.
            var that = this;
            this._autogroup = setTimeout(function() {
                that.group_actions();
            }, autogroup_delay);
        }
    }

    /**
     * Commit the pushed actions to one group.
     */
    group_actions() {
        this._autogroup = null;
        if (this._action_lock) return;
        
        this._action_groups.push(this._actions);
        this._actions = [];
        this._undone = [];
    }

    /**
     * Undo one set of actions.
     */
    undo() {
        // If a timeout is set, group now.
        if (this._autogroup !== null) {
            clearTimeout(this._autogroup);
            this.group_actions();
        }

        var undo;
        if (this._actions.length > 0) {
            undo = this._actions;
        } else if (this._action_groups.length > 0) {
            undo = this._action_groups.pop();
            undo.reverse();
        } else {
            return true;
        }

        // Undo the actions.
        if (!this._action_lock) {
            this._action_lock = true;
            try {
                var that = this;
                undo.forEach(function(action) {
                    that._map.invoke(action.backward.name, action.backward.parameters);
                });
            } finally {
                this._action_lock = false;
            }
        }

        // Allow the action to be redone.
        this._undone.push(undo);
        return true;
    }

    /**
     * Redo one set of actions.
     */
    redo() {
        if (this._undone.length > 0) {
            var redo = this._undone.pop();
            
            // Redo the actions.
            if (!this._action_lock) {
                this._action_lock = true;
                try {
                    var that = this;
                    redo.forEach(function(action) {
                        that._map.invoke(action.forward.name, action.forward.parameters);
                    });
                } finally {
                    this._action_lock = false;
                }
            }

            // Allow the action to be undone.
            this._action_groups.push(redo);
        }
        return true;
    }
}