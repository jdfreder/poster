// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import keymap = require('./map');
var register = keymap.Map.register;

import cursor = require('./cursor');
import utils = require('../utils/utils');
import document_model = require('../document_model');
import row_renderer = require('../draw/renderers/row'); // interfaces only
import clipboard = require('./clipboard');
import history = require('./history'); // interfaces only

/**
 * Manages one or more cursors
 */
export class Cursors extends utils.PosterClass {
    public get_row_char: row_renderer.IGetRowChar;
    public cursors: cursor.Cursor[];

    private _model: document_model.DocumentModel;
    private _selecting_text: boolean;
    private _clipboard: clipboard.Clipboard;
    private _history: history.IHistory;
    private _el: HTMLElement;
    
    public constructor(el: HTMLElement, model: document_model.DocumentModel, clipboard: clipboard.Clipboard, history: history.IHistory) {
        super();
        this._el = el;
        this._model = model;
        this.get_row_char = undefined;
        this.cursors = [];
        this._selecting_text = false;
        this._clipboard = clipboard;
        this._history = history;

        // Create initial cursor.
        this.create(undefined, false);

        // Register actions.
        register('cursors._cursor_proxy', utils.proxy(this._cursor_proxy, this));
        register('cursors.create', utils.proxy(this.create, this));
        register('cursors.single', utils.proxy(this.single, this));
        register('cursors.pop', utils.proxy(this.pop, this));
        register('cursors.start_selection', utils.proxy(this.start_selection, this));
        register('cursors.set_selection', utils.proxy(this.set_selection, this));
        register('cursors.start_set_selection', utils.proxy(this.start_set_selection, this));
        register('cursors.end_selection', utils.proxy(this.end_selection, this));
        register('cursors.select_word', utils.proxy(this.select_word, this));

        // Bind clipboard events.
        this._clipboard.on('cut', utils.proxy(this._handle_cut, this));
        this._clipboard.on('copy', utils.proxy(this._handle_copy, this));
        this._clipboard.on('paste', utils.proxy(this._handle_paste, this));
    }

    /**
     * Creates a cursor and manages it.
     * @param [state] state to apply to the new cursor.
     * @param [reversable] - defaults to true, is action reversable.
     */
    public create(state?: cursor.ICursorState, reversable?: boolean): cursor.Cursor {
        // Record this action in history.
        if (reversable === undefined || reversable === true) {
            this._history.push_action('cursors.create', utils.args(arguments), 'cursors.pop', []);
        }

        // Create a proxying history method for the cursor itself.
        var index: number = this.cursors.length;
        var history_proxy = (forward_name, forward_params, backward_name, backward_params, autogroup_delay) => {
            this._history.push_action(
                'cursors._cursor_proxy', [index, forward_name, forward_params],
                'cursors._cursor_proxy', [index, backward_name, backward_params],
                autogroup_delay);
        };

        // Create the cursor.
        var new_cursor = new cursor.Cursor(this._model, history_proxy);
        this.cursors.push(new_cursor);

        // Set the initial properties of the cursor.
        if (state) new_cursor.set_state(state, false);

        // Listen for cursor change events.
        new_cursor.on('change', () => {
            this.trigger('change', new_cursor);
            this._update_selection();
        });
        this.trigger('change', new_cursor);

        return new_cursor;
    }

    /**
     * Remove every cursor except for the first one.
     */
    public single(): void {
        while (this.cursors.length > 1) {
            this.pop();
        }
    }

    /**
     * Remove the last cursor.
     * @returns last cursor or null
     */
    public pop(): cursor.Cursor {
        if (this.cursors.length > 1) {

            // Remove the last cursor and unregister it.
            var cursor: cursor.Cursor = this.cursors.pop();
            cursor.unregister();
            cursor.off('change');

            // Record this action in history.
            this._history.push_action('cursors.pop', [], 'cursors.create', [cursor.get_state()]);

            // Alert listeners of changes.
            this.trigger('change');
            return cursor;
        }
        return null;
    }

    /**
     * Starts selecting text from mouse coordinates.
     * @param e - mouse event containing the coordinates.
     */
    public start_selection(e: MouseEvent): void {
        var x: number = e.offsetX;
        var y: number = e.offsetY;

        this._selecting_text = true;
        if (this.get_row_char) {
            var location: row_renderer.ICharacterCoords = this.get_row_char(x, y);
            this.cursors[0].set_both(location.row_index, location.char_index);
        }
    }

    /**
     * Finalizes the selection of text.
     */
    public end_selection(): void {
        this._selecting_text = false;
    }

    /**
     * Sets the endpoint of text selection from mouse coordinates.
     * @param  e - mouse event containing the coordinates.
     */
    public set_selection(e: MouseEvent): void {
        var touchpane: ClientRect = this._el.getBoundingClientRect();
        var x: number = e.clientX - touchpane.left;
        var y: number = e.clientY - touchpane.top;
        if (this._selecting_text && this.get_row_char) {
            var location: row_renderer.ICharacterCoords = this.get_row_char(x, y);
            this.cursors[this.cursors.length-1].set_primary(location.row_index, location.char_index);
        }
    }

    /**
     * Sets the endpoint of text selection from mouse coordinates.
     * Different than set_selection because it doesn't need a call
     * to start_selection to work.
     * @param e - mouse event containing the coordinates.
     */
    public start_set_selection(e: MouseEvent): void {
        this._selecting_text = true;
        this.set_selection(e);
    }

    /**
     * Selects a word at the given mouse coordinates.
     * @param e - mouse event containing the coordinates.
     */
    public select_word(e: MouseEvent): void {
        var x: number = e.offsetX;
        var y: number = e.offsetY;
        if (this.get_row_char) {
            var location: row_renderer.ICharacterCoords = this.get_row_char(x, y);
            this.cursors[this.cursors.length-1].select_word(location.row_index, location.char_index);
        }
    }

    /**
     * Handles history proxy events for individual cursors.
     * @param cursor_index
     * @param function_name
     * @param function_params
     */
    private _cursor_proxy(cursor_index: number, function_name: string, function_params: any[]): void {
        if (cursor_index < this.cursors.length) {
            var cursor = this.cursors[cursor_index];
            cursor[function_name].apply(cursor, function_params);
        }
    }

    /**
     * Handles when the selected text is copied to the clipboard.
     * @param text - by val text that was cut
     */
    private _handle_copy(text: string): void {
        this.cursors.forEach(cursor =>cursor.copy());
    }

    /**
     * Handles when the selected text is cut to the clipboard.
     * @param text - by val text that was cut
     */
    private _handle_cut(text: string): void {
        this.cursors.forEach(cursor =>cursor.cut());
    }

    /**
     * Handles when text is pasted into the document.
     */
    private _handle_paste(text: string): void {

        // If the modulus of the number of cursors and the number of pasted lines
        // of text is zero, split the cut lines among the cursors.
        var lines: string[] = text.split('\n');
        if (this.cursors.length > 1 && lines.length > 1 && lines.length % this.cursors.length === 0) {
            var lines_per_cursor: number = lines.length / this.cursors.length;
            this.cursors.forEach((cursor, index) => {
                cursor.insert_text(lines.slice(
                    index * lines_per_cursor, 
                    index * lines_per_cursor + lines_per_cursor).join('\n'));
            });
        } else {
            this.cursors.forEach(cursor => cursor.paste(text));
        }
    }

    /**
     * Update the clippable text based on new selection.
     */
    private _update_selection(): void {
        
        // Copy all of the selected text.
        var selections = [];
        this.cursors.forEach(cursor => selections.push(cursor.get()));

        // Make the copied text clippable.
        this._clipboard.set_clippable(selections.join('\n'));
    }
}
