// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import keymap = require('./map');
var register = keymap.Map.register;

import document_model = require('../document_model');
import utils = require('../utils/utils');
import config_mod = require('../utils/config');
import history = require('./history'); // interfaces only
var config = config_mod.config;

export interface ICursorState {
    primary_row: number;
    primary_char: number;
    secondary_row: number;
    secondary_char: number;
    _memory_char: number;
};

/**
 * Input cursor.
 */
export class Cursor extends utils.PosterClass {
    public primary_row: number;
    public primary_char: number;
    public secondary_row: number;
    public secondary_char: number;
    

    private _model: document_model.DocumentModel;
    private _push_history: history.IHistoryPush;
    private _memory_char: number;
    private _copied_row: string;
    private _historical_start: ICursorState;

    public constructor(model: document_model.DocumentModel, push_history: history.IHistoryPush) {
        super();
        this._model = model;
        this._push_history = push_history;

        this.primary_row = 0;
        this.primary_char = 0;
        this.secondary_row = 0;
        this.secondary_char = 0;

        this._register_api();
    }

    public get start_row(): number {
        return Math.min(this.primary_row, this.secondary_row);
    }

    public get end_row(): number {
        return Math.max(this.primary_row, this.secondary_row);
    }

    public get start_char(): number {
        if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
            return this.primary_char;
        } else {
            return this.secondary_char;
        }
    }

    public get end_char(): number {
        if (this.primary_row < this.secondary_row || (this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char)) {
            return this.secondary_char;
        } else {
            return this.primary_char;
        }
    }

    /**
     * Unregister the actions and event listeners of this cursor.
     */
    public unregister(): void {
        keymap.Map.unregister_by_tag(this);
    }

    /**
     * Gets the state of the cursor.
     */
    public get_state(): ICursorState {
        return {
            primary_row: this.primary_row,
            primary_char: this.primary_char,
            secondary_row: this.secondary_row,
            secondary_char: this.secondary_char,
            _memory_char: this._memory_char
        };
    }

    /**
     * Sets the state of the cursor.
     * @param state
     * @param [historical] - Defaults to true.  Whether this should be recorded in history.
     */
    public set_state(state: ICursorState, historical?: boolean): void {
        if (state) {
            var old_state: ICursorState = <ICursorState>{};
            for (var key in state) {
                if (state.hasOwnProperty(key)) {
                    old_state[key] = this[key];
                    this[key] = state[key];
                }
            }

            if (historical === undefined || historical === true) {
                this._push_history('set_state', [state], 'set_state', [old_state]);
            }
            this.trigger('change');
        }
    }

    /**
     * Moves the primary cursor a given offset.
     * @param  x
     * @param  y
     * @param  (optional) hop=false - hop to the other side of the
     *                   selected region if the primary is on the opposite of the
     *                   direction of motion.
     */
    public move_primary(x: number, y: number, hop?: boolean): void {
        if (hop) {
            if (this.primary_row != this.secondary_row || this.primary_char != this.secondary_char) {
                var start_row: number = this.start_row;
                var start_char: number = this.start_char;
                var end_row: number = this.end_row;
                var end_char: number = this.end_char;
                if (x<0 || y<0) {
                    this.primary_row = start_row;
                    this.primary_char = start_char;
                    this.secondary_row = end_row;
                    this.secondary_char = end_char;
                } else {
                    this.primary_row = end_row;
                    this.primary_char = end_char;
                    this.secondary_row = start_row;
                    this.secondary_char = start_char;
                }
            }
        }

        if (x < 0) {
            if (this.primary_char + x < 0) {
                if (this.primary_row === 0) {
                    this.primary_char = 0;
                } else {
                    this.primary_row -= 1;
                    this.primary_char = this._model._rows[this.primary_row].length;
                }
            } else {
                this.primary_char += x;
            }
        } else if (x > 0) {
            if (this.primary_char + x > this._model._rows[this.primary_row].length) {
                if (this.primary_row === this._model._rows.length - 1) {
                    this.primary_char = this._model._rows[this.primary_row].length;
                } else {
                    this.primary_row += 1;
                    this.primary_char = 0;
                }
            } else {
                this.primary_char += x;
            }
        }

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        if (x !== 0) {
            this._memory_char = this.primary_char;
        }

        if (y !== 0) {
            this.primary_row += y;
            this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length-1);
            if (this._memory_char !== undefined) {
                this.primary_char = this._memory_char;
            }
            if (this.primary_char > this._model._rows[this.primary_row].length) {
                this.primary_char = this._model._rows[this.primary_row].length;
            }
        }

        this.trigger('change'); 
    }

    /**
     * Walk the primary cursor in a direction until a not-text character is found.
     */
    word_primary(direction: number): void {
        // Make sure direction is 1 or -1.
        direction = direction < 0 ? -1 : 1;

        // If moving left and at end of row, move up a row if possible.
        if (this.primary_char === 0 && direction == -1) {
            if (this.primary_row !== 0) {
                this.primary_row--;
                this.primary_char = this._model._rows[this.primary_row].length;
                this._memory_char = this.primary_char;
                this.trigger('change'); 
            }
            return;
        }

        // If moving right and at end of row, move down a row if possible.
        if (this.primary_char >= this._model._rows[this.primary_row].length && direction == 1) {
            if (this.primary_row < this._model._rows.length-1) {
                this.primary_row++;
                this.primary_char = 0;
                this._memory_char = this.primary_char;
                this.trigger('change'); 
            }
            return;
        }

        var i: number = this.primary_char;
        var hit_text: boolean = false;
        var row_text: string = this._model._rows[this.primary_row];
        if (direction == -1) {
            while (0 < i && !(hit_text && utils.not_text(row_text[i-1]))) {
                hit_text = hit_text || !utils.not_text(row_text[i-1]);
                i += direction;
            }
        } else {
            while (i < row_text.length && !(hit_text && utils.not_text(row_text[i]))) {
                hit_text = hit_text || !utils.not_text(row_text[i]);
                i += direction;
            }
        }

        this.primary_char = i;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Select all of the text.
     */
    public select_all(): void {
        this.primary_row = this._model._rows.length-1;
        this.primary_char = this._model._rows[this.primary_row].length;
        this.secondary_row = 0;
        this.secondary_char = 0;
        this.trigger('change'); 
    }

    /**
     * Move the primary cursor to the line end.
     */
    public primary_goto_end(): void {
        // Get the start of the actual content, skipping the whitespace.
        var row_text: string = this._model._rows[this.primary_row];
        var trimmed: string = row_text.trim();
        var start: number = row_text.indexOf(trimmed);
        var target: number = row_text.length;
        if (0 < start && start < row_text.length && this.primary_char !== start + trimmed.length) {
            target = start + trimmed.length;
        }

        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Move the primary cursor to the line start.
     */
    public primary_goto_start(): void {
        // Get the start of the actual content, skipping the whitespace.
        var row_text: string = this._model._rows[this.primary_row];
        var start: number = row_text.indexOf(row_text.trim());
        var target: number = 0;
        if (0 < start && start < row_text.length && this.primary_char !== start) {
            target = start;
        }

        // Move the cursor.
        this.primary_char = target;
        this._memory_char = this.primary_char;
        this.trigger('change'); 
    }

    /**
     * Selects a word at the given location.
     */
    public select_word(row_index: number, char_index: number): void {
        this.set_both(row_index, char_index);
        this.word_primary(-1);
        this._reset_secondary();
        this.word_primary(1);
    }

    /**
     * Set the primary cursor position
     */
    public set_primary(row_index: number, char_index: number): void {
        this.primary_row = row_index;
        this.primary_char = char_index;

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Set the secondary cursor position
     */
    public set_secondary(row_index: number, char_index: number): void {
        this.secondary_row = row_index;
        this.secondary_char = char_index;
        this.trigger('change'); 
    }

    /**
     * Sets both the primary and secondary cursor positions
     */
    public set_both(row_index: number, char_index: number): void {
        this.primary_row = row_index;
        this.primary_char = char_index;
        this.secondary_row = row_index;
        this.secondary_char = char_index;

        // Remember the character position, vertical navigation across empty lines
        // shouldn't cause the horizontal position to be lost.
        this._memory_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Handles when a key is pressed.
     * @param  e - original event.
     * @return was the event handled.
     */
    public keypress(e: KeyboardEvent): boolean {
        var char_code: number = e.which || e.keyCode;
        var char_typed: string = String.fromCharCode(char_code);
        this.remove_selected();
        this._historical(() => {
            this._model_add_text(this.primary_row, this.primary_char, char_typed);
        });
        this.move_primary(1, 0);
        this._reset_secondary();
        return true;
    }

    /**
     * Indent
     * @param  e - original event.
     * @return was the event handled.
     */
    public indent(e: Event): boolean {
        var indent: string = this._make_indents()[0];
        this._historical(() => {
            if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                this._model_add_text(this.primary_row, this.primary_char, indent);
            } else {
                for (var row = this.start_row; row <= this.end_row; row++) {
                    this._model_add_text(row, 0, indent);
                }
            }
        });
        this.primary_char += indent.length;
        this._memory_char = this.primary_char;
        this.secondary_char += indent.length;
        this.trigger('change');
        return true;
    }

    /**
     * Unindent
     * @param  e - original event.
     * @return was the event handled.
     */
    public unindent(e: Event): boolean {
        var indents: string[] = this._make_indents();
        var removed_start: number = 0;
        var removed_end: number = 0;

        // If no text is selected, remove the indent preceding the
        // cursor if it exists.
        this._historical(() => {
            if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                for (var i: number = 0; i < indents.length; i++) {
                    var indent = indents[i];
                    if (this.primary_char >= indent.length) {
                        var before = this._model.get_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                        if (before == indent) {
                            this._model_remove_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                            removed_start = indent.length;
                            removed_end = indent.length;
                            break;
                        }
                    }
                }

            // Text is selected.  Remove the an indent from the begining
            // of each row if it exists.
            } else {
                for (var row: number = this.start_row; row <= this.end_row; row++) {
                    for (var i: number = 0; i < indents.length; i++) {
                        var indent = indents[i];
                        if (this._model._rows[row].length >= indent.length) {
                            if (this._model._rows[row].substring(0, indent.length) == indent) {
                                this._model_remove_text(row, 0, row, indent.length);
                                if (row == this.start_row) removed_start = indent.length;
                                if (row == this.end_row) removed_end = indent.length;
                                break;
                            }
                        };
                    }
                }
            }
        });
        
        // Move the selected characters backwards if indents were removed.
        var start_is_primary = (this.primary_row == this.start_row && this.primary_char == this.start_char);
        if (start_is_primary) {
            this.primary_char -= removed_start;
            this.secondary_char -= removed_end;
        } else {
            this.primary_char -= removed_end;
            this.secondary_char -= removed_start;
        }
        this._memory_char = this.primary_char;
        if (removed_end || removed_start) this.trigger('change');
        return true;
    }

    /**
     * Insert a newline
     * @param  e - original event.
     * @return was the event handled.
     */
    public newline(e: Event): boolean {
        this.remove_selected();

        // Get the blank space at the begining of the line.
        var line_text: string = this._model.get_text(this.primary_row, 0, this.primary_row, this.primary_char);
        var spaceless: string = line_text.trim();
        var left: number = line_text.length;
        if (spaceless.length > 0) {
            left = line_text.indexOf(spaceless);
        }
        var indent: string = line_text.substring(0, left);
        
        this._historical(() => {
            this._model_add_text(this.primary_row, this.primary_char, '\n' + indent);
        });
        this.primary_row += 1;
        this.primary_char = indent.length;
        this._memory_char = this.primary_char;
        this._reset_secondary();
        return true;
    }

    /**
     * Insert text
     * @param text
     * @return successful.
     */
    public insert_text(text: string): boolean {
        this.remove_selected();
        this._historical(() => {
            this._model_add_text(this.primary_row, this.primary_char, text);
        });
        
        // Move cursor to the end.
        if (text.indexOf('\n')==-1) {
            this.primary_char = this.start_char + text.length;
        } else {
            var lines: string[] = text.split('\n');
            this.primary_row += lines.length - 1;
            this.primary_char = lines[lines.length-1].length;
        }
        this._reset_secondary();

        this.trigger('change'); 
        return true;
    }

    /**
     * Paste text
     */
    public paste(text: string): void {
        if (this._copied_row === text) {
            this._historical(() => {
                this._model_add_row(this.primary_row, text);
            });
            this.primary_row++;
            this.secondary_row++;
            this.trigger('change'); 
        } else {
            this.insert_text(text);
        }
    }

    /**
     * Remove the selected text
     * @return true if text was removed.
     */
    public remove_selected(): boolean {
        if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
            var row_index: number = this.start_row;
            var char_index: number = this.start_char;
            this._historical(() => {
                this._model_remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
            });
            this.primary_row = row_index;
            this.primary_char = char_index;
            this._reset_secondary();
            this.trigger('change'); 
            return true;
        }
        return false;
    }

    /**
     * Gets the selected text.
     * @return selected text
     */
    public get(): string {
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            return this._model._rows[this.primary_row];
        } else {
            return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
        }
    }

    /**
     * Cuts the selected text.
     * @return selected text
     */
    public cut(): string {
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];    
            this._historical(function() {
                this._model_remove_row(this.primary_row);
            });
        } else {
            this._copied_row = null;
            this.remove_selected();
        }
        return text;
    }

    /**
     * Copies the selected text.
     * @return selected text
     */
    public copy(): string {
        var text = this.get();
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._copied_row = this._model._rows[this.primary_row];
        } else {
            this._copied_row = null;
        }
        return text;
    }

    /**
     * Delete forward, typically called by `delete` keypress.
     * @return success
     */
    public delete_forward(): boolean {
        if (!this.remove_selected()) {
            this.move_primary(1, 0);
            this.remove_selected();
        }
        return true;
    }

    /**
     * Delete backward, typically called by `backspace` keypress.
     * @return success
     */
    public delete_backward(): boolean {
        if (!this.remove_selected()) {
            this.move_primary(-1, 0);
            this.remove_selected();
        }
        return true;
    }

    /**
     * Delete one word backwards.
     * @return success
     */
    public delete_word_left(): boolean {
        if (!this.remove_selected()) {
            if (this.primary_char === 0) {
                this.word_primary(-1); 
                this.remove_selected();
            } else {
                // Walk backwards until char index is 0 or
                // a different type of character is hit.
                var row: string = this._model._rows[this.primary_row];
                var i: number = this.primary_char - 1;
                var start_not_text: boolean = utils.not_text(row[i]);
                while (i >= 0 && utils.not_text(row[i]) == start_not_text) {
                    i--;
                }
                this.secondary_char = i+1;
                this.remove_selected();
            }
        }
        return true;
    }

    /**
     * Delete one word forwards.
     * @return success
     */
    public delete_word_right(): boolean {
        if (!this.remove_selected()) {
            var row: string = this._model._rows[this.primary_row];
            if (this.primary_char === row.length) {
                this.word_primary(1); 
                this.remove_selected();
            } else {
                // Walk forwards until char index is at end or
                // a different type of character is hit.
                var i: number = this.primary_char;
                var start_not_text: boolean = utils.not_text(row[i]);
                while (i < row.length && utils.not_text(row[i]) == start_not_text) {
                    i++;
                }
                this.secondary_char = i;
                this.remove_selected();
            }
        }
        this._end_historical_move();
        return true;
    }

    /**
     * Reset the secondary cursor to the value of the primary.
     */
    private _reset_secondary(): void {
        this.secondary_row = this.primary_row;
        this.secondary_char = this.primary_char;

        this.trigger('change'); 
    }

    /**
     * Adds text to the model while keeping track of the history.
     */
    private _model_add_text(row_index: number, char_index: number, text: string): void {
        var lines: string[] = text.split('\n');
        this._push_history(
            '_model_add_text', 
            [row_index, char_index, text], 
            '_model_remove_text', 
            [row_index, char_index, row_index + lines.length - 1, lines.length > 1 ? lines[lines.length-1].length : char_index + text.length], 
            config.history_group_delay || 100);
        this._model.add_text(row_index, char_index, text);
    }

    /**
     * Removes text from the model while keeping track of the history.
     */
    private _model_remove_text(start_row: number, start_char: number, end_row: number, end_char: number): void {
        var text: string = this._model.get_text(start_row, start_char, end_row, end_char);
        this._push_history(
            '_model_remove_text', 
            [start_row, start_char, end_row, end_char], 
            '_model_add_text', 
            [start_row, start_char, text], 
            config.history_group_delay || 100);
        this._model.remove_text(start_row, start_char, end_row, end_char);
    }

    /**
     * Adds a row of text while keeping track of the history.
     */
    private _model_add_row(row_index: number, text: string): void {
        this._push_history(
            '_model_add_row', 
            [row_index, text], 
            '_model_remove_row', 
            [row_index], 
            config.history_group_delay || 100);
        this._model.add_row(row_index, text);
    }

    /**
     * Removes a row of text while keeping track of the history.
     */
    private _model_remove_row(row_index: number): void {
        this._push_history(
            '_model_remove_row', 
            [row_index], 
            '_model_add_row', 
            [row_index, this._model._rows[row_index]], 
            config.history_group_delay || 100);
        this._model.remove_row(row_index);
    }

    /**
     * Record the before and after positions of the cursor for history.
     * @param  f - executes with `this` context
     */
    private _historical(f: utils.ICallback): any {
        this._start_historical_move();
        var ret: any = f.apply(this);
        this._end_historical_move();
        return ret;
    }

    /**
     * Record the starting state of the cursor for the history buffer.
     */
    private _start_historical_move(): void {
        if (!this._historical_start) {
            this._historical_start = this.get_state();
        }
    }

    /**
     * Record the ending state of the cursor for the history buffer, then
     * push a reversable action describing the change of the cursor.
     */
    private _end_historical_move(): void {
        this._push_history(
            'set_state', 
            [this.get_state()], 
            'set_state', 
            [this._historical_start], 
            config.history_group_delay || 100);
        this._historical_start = null;
    }

    /**
     * Makes a list of indentation strings used to indent one level,
     * ordered by usage preference.
     */
    private _make_indents(): string[] {
        var indents: string[] = [];
        if (config.use_spaces) {
            var indent: string = '';
            for (var i: number = 0; i < config.tab_width; i++) {
                indent += ' ';
                indents.push(indent);
            }
            indents.reverse();
        }
        indents.push('\t');
        return indents;
    }

    /**
     * Registers an action API with the map
     */
    private _register_api(): void {
        register('cursor.set_state', utils.proxy(this.set_state, this), this);
        register('cursor.remove_selected', utils.proxy(this.remove_selected, this), this);
        register('cursor.keypress', utils.proxy(this.keypress, this), this);
        register('cursor.indent', utils.proxy(this.indent, this), this);
        register('cursor.unindent', utils.proxy(this.unindent, this), this);
        register('cursor.newline', utils.proxy(this.newline, this), this);
        register('cursor.insert_text', utils.proxy(this.insert_text, this), this);
        register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
        register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
        register('cursor.delete_word_left', utils.proxy(this.delete_word_left, this), this);
        register('cursor.delete_word_right', utils.proxy(this.delete_word_right, this), this);
        register('cursor.select_all', utils.proxy(this.select_all, this), this);
        register('cursor.left', () => { this.move_primary(-1, 0, true); this._reset_secondary(); return true; });
        register('cursor.right', () => { this.move_primary(1, 0, true); this._reset_secondary(); return true; });
        register('cursor.up', () => { this.move_primary(0, -1, true); this._reset_secondary(); return true; });
        register('cursor.down', () => { this.move_primary(0, 1, true); this._reset_secondary(); return true; });
        register('cursor.select_left', () => { this.move_primary(-1, 0); return true; });
        register('cursor.select_right', () => { this.move_primary(1, 0); return true; });
        register('cursor.select_up', () => { this.move_primary(0, -1); return true; });
        register('cursor.select_down', () => { this.move_primary(0, 1); return true; });
        register('cursor.word_left', () => { this.word_primary(-1); this._reset_secondary(); return true; });
        register('cursor.word_right', () => { this.word_primary(1); this._reset_secondary(); return true; });
        register('cursor.select_word_left', () => { this.word_primary(-1); return true; });
        register('cursor.select_word_right', () => { this.word_primary(1); return true; });
        register('cursor.line_start', () => { this.primary_goto_start(); this._reset_secondary(); return true; });
        register('cursor.line_end', () => { this.primary_goto_end(); this._reset_secondary(); return true; });
        register('cursor.select_line_start', () => { this.primary_goto_start(); return true; });
        register('cursor.select_line_end', () => { this.primary_goto_end(); return true; });
    }
}
