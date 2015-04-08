// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils/utils');
import generics = require('./utils/generics');
import superset = require('./utils/superset');

export interface IRange {
    start_row: number;
    start_char: number;
    end_row: number;
    end_char: number;
}

/**
 * Model containing all of the document's data (text).
 */
export class DocumentModel extends utils.PosterClass {
    public _rows: string[]; // TODO: Rename without prefix underscore.

    private _row_tags: (generics.IDictionary<superset.Superset>)[];
    private _tag_lock: number;
    private _pending_tag_events: boolean;
    private _pending_tag_events_rows: number[];

    public constructor() {
        super();
        this._rows = [];
        this._row_tags = [];
        this._tag_lock = 0;
        this._pending_tag_events = false;
    }
    
    /**
     * Shallow copy of the array.  Modifying this won't modify the 
     * contents of the Poster instance.
     */
    public get rows(): string[] { 
        return [].concat(this._rows); 
    }
    
    /**
     * Gets the text of the Poster instance
     */
    public get text(): string {
        return this._get_text();
    }
    /**
     * Sets the text of the Poster instance
     */
    public set text(value: string) {
        this._set_text(value);
    }

    /**
     * Acquire a lock on tag events
     *
     * Prevents tag events from firing.
     * @return lock count
     */
    public acquire_tag_event_lock(): number {
        return this._tag_lock++;
    }

    /**
     * Release a lock on tag events
     * @return lock count
     */
    public release_tag_event_lock(): number {
        this._tag_lock--;
        if (this._tag_lock < 0) {
            this._tag_lock = 0;
        }
        if (this._tag_lock === 0 && this._pending_tag_events) {
            this._pending_tag_events = false;
            this.trigger_tag_events();
        }
        return this._tag_lock;
    }

    /**
     * Triggers the tag change events.
     */
    public trigger_tag_events(rows?: number[]): void {
        if (this._tag_lock === 0) {
            this.trigger('tags_changed', this._pending_tag_events_rows);
            this._pending_tag_events_rows = undefined;
        } else {
            this._pending_tag_events = true;
            if (this._pending_tag_events_rows) {
                this._pending_tag_events_rows = this._pending_tag_events_rows.concat(rows);
            } else {
                this._pending_tag_events_rows = rows;
            }
        }
    }

    /**
     * Sets a 'tag' on the text specified.
     * @param start_row - row the tag starts on
     * @param start_char - index, in the row, of the first tagged character
     * @param end_row - row the tag ends on
     * @param end_char - index, in the row, of the last tagged character
     * @param tag_name
     * @param tag_value - overrides any previous tags
     */
    public set_tag(start_row: number, start_char: number, end_row: number, end_char: number, tag_name: string, tag_value: any): void {
        var coords: IRange = this.validate_coords.apply(this, arguments);
        var rows: number[] = [];
        for (var row = coords.start_row; row <= coords.end_row; row++) {

            // Make sure the superset is defined for the row/tag_name pair.
            var row_tags: generics.IDictionary<superset.Superset> = this._row_tags[row];
            if (row_tags[tag_name] === undefined) {
                row_tags[tag_name] = new superset.Superset();
            }

            // Get the start and end char indicies.
            var s: number = coords.start_char;
            var e: number = coords.end_char;
            if (row > coords.start_row) s = 0;
            if (row < coords.end_row) e = this._rows[row].length - 1;

            // Set the value for the range.
            row_tags[tag_name].set(s, e, tag_value);
            rows.push(row);
        }
        this.trigger_tag_events(rows);
    }

    /**
     * Removed all of the tags on the document.
     */
    public clear_tags(start_row: number, end_row: number): void {
        start_row = start_row !== undefined ? start_row : 0;
        end_row = end_row !== undefined ? end_row : this._row_tags.length - 1;
        var rows: number[] = [];
        for (var i: number = start_row; i <= end_row; i++) {
            this._row_tags[i] = {};
            rows.push(i);
        }
        this.trigger_tag_events(rows);
    }

    /**
     * Get the tag value applied to the character.
     * @return value or undefined
     */
    public get_tag_value(tag_name: string, row_index: number, char_index: number): any {

        // Loop through the tags on this row.
        var row_tags: superset.Superset = this._row_tags[row_index][tag_name];
        if (row_tags !== undefined) {
            var tag_array = row_tags.array;
            for (var i: number = 0; i < tag_array.length; i++) {
                // Check if within.
                if (tag_array[i][0] <= char_index && char_index <= tag_array[i][1]) {
                    return tag_array[i][2];
                }
            }
        }
        return undefined;
    }

    /**
     * Get the tag value ranges applied to the specific range.
     * @return array of tag value ranges ([row_index, start_char, end_char, tag_value])
     */
    public get_tags(
        tag_name: string,
        start_row: number,
        start_char: number,
        end_row: number,
        end_char: number)
        : ([number, number, number, any])[] {

        var coords: IRange = this.validate_coords.call(this, start_row, start_char, end_row, end_char);
        var values: ([number, number, number, any])[] = [];
        for (var row: number = coords.start_row; row <= coords.end_row; row++) {

            // Get the start and end char indicies.
            var s: number = coords.start_char;
            var e: number = coords.end_char;
            if (row > coords.start_row) s = 0;
            if (row < coords.end_row) e = this._rows[row].length - 1;

            // Loop through the tags on this row.
            var row_tags: superset.Superset = this._row_tags[row][tag_name];
            if (row_tags !== undefined) {
                var tag_array: ([number, number, any])[] = row_tags.array;
                for (var i: number = 0; i < tag_array.length; i++) {
                    var ns: number = tag_array[i][0];
                    var ne: number = tag_array[i][1];

                    // Check if the areas insersect.
                    if (ns <= e && ne >= s) {
                        values.push([row, ns, ne , tag_array[i][2]]);
                    }
                }
            }
        }
        return values;
    }

    /**
     * Adds text efficiently somewhere in the document.
     */
    public add_text(row_index: number, char_index: number, text: string): void {
        var coords: IRange = this.validate_coords.apply(this, Array.prototype.slice.call(arguments, 0,2));
        var old_text: string = this._rows[coords.start_row];
        // If the text has a new line in it, just re-set
        // the rows list.
        if (text.indexOf('\n') != -1) {
            var new_rows: string[] = [];
            if (coords.start_row > 0) {
                new_rows = this._rows.slice(0, coords.start_row);
            }

            var old_row_start: string = old_text.substring(0, coords.start_char);
            var old_row_end: string = old_text.substring(coords.start_char);
            var split_text: string[] = text.split('\n');
            new_rows.push(old_row_start + split_text[0]);

            if (split_text.length > 2) {
                new_rows = new_rows.concat(split_text.slice(1,split_text.length-1));
            }

            new_rows.push(split_text[split_text.length-1] + old_row_end);

            if (coords.start_row+1 < this._rows.length) {
                new_rows = new_rows.concat(this._rows.slice(coords.start_row+1));
            }

            this._rows = new_rows;
            this._resized_rows();
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('rows_added', coords.start_row + 1, coords.start_row + split_text.length - 1);
            this.trigger('changed');

        // Text doesn't have any new lines, just modify the
        // line and then trigger the row changed event.
        } else {
            this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('changed');
        }
    }

    /**
     * Removes a block of text from the document
     */
    public remove_text(start_row: number, start_char: number, end_row: number, end_char: number): void {
        var coords: IRange = this.validate_coords.apply(this, arguments);
        var old_text: string = this._rows[coords.start_row];
        if (coords.start_row == coords.end_row) {
            this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.start_row].substring(coords.end_char);
        } else {
            this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.end_row].substring(coords.end_char);
        }

        if (coords.end_row - coords.start_row > 0) {
            var rows_removed: string[] = this._rows.splice(coords.start_row + 1, coords.end_row - coords.start_row);
            this._resized_rows();

            // If there are more deleted rows than rows remaining, it
            // is faster to run a calculation on the remaining rows than
            // to run it on the rows removed.
            if (rows_removed.length > this._rows.length) {
                this.trigger('text_changed');
                this.trigger('changed');
            } else {
                this.trigger('row_changed', old_text, coords.start_row);
                this.trigger('rows_removed', rows_removed);
                this.trigger('changed');
            }
        } else if (coords.end_row == coords.start_row) {
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('changed');
        }
    }

    /**
     * Remove a row from the document.
     */
    public remove_row(row_index: number): void {
        if (0 < row_index && row_index < this._rows.length) {
            var rows_removed: string[] = this._rows.splice(row_index, 1);
            this._resized_rows();
            this.trigger('rows_removed', rows_removed);
            this.trigger('changed');
        }
    }

    /**
     * Gets a chunk of text.
     */
    public get_text(start_row: number, start_char: number, end_row: number, end_char: number): string {
        var coords: IRange = this.validate_coords.apply(this, arguments);
        if (coords.start_row==coords.end_row) {
            return this._rows[coords.start_row].substring(coords.start_char, coords.end_char);
        } else {
            var text: string[] = [];
            text.push(this._rows[coords.start_row].substring(coords.start_char));
            if (coords.end_row - coords.start_row > 1) {
                for (var i: number = coords.start_row + 1; i < coords.end_row; i++) {
                    text.push(this._rows[i]);
                }
            }
            text.push(this._rows[coords.end_row].substring(0, coords.end_char));
            return text.join('\n');
        }
    }

    /**
     * Add a row to the document
     * @param row_index
     * @param text - new row's text
     */
    public add_row(row_index: number, text: string): void {
        var new_rows: string[] = [];
        if (row_index > 0) {
            new_rows = this._rows.slice(0, row_index);
        }
        new_rows.push(text);
        if (row_index < this._rows.length) {
            new_rows = new_rows.concat(this._rows.slice(row_index));
        }

        this._rows = new_rows;
        this._resized_rows();
        this.trigger('rows_added', row_index, row_index);
        this.trigger('changed');
    }

    /**
     * Validates row, character coordinates in the document.
     * @return dictionary containing validated coordinates {start_row, 
     *         start_char, end_row, end_char}
     */
    public validate_coords(start_row: number, start_char: number, end_row?: number, end_char?: number): IRange {

        // Make sure the values aren't undefined.
        if (start_row === undefined) start_row = 0;
        if (start_char === undefined) start_char = 0;
        if (end_row === undefined) end_row = start_row;
        if (end_char === undefined) end_char = start_char;

        // Make sure the values are within the bounds of the contents.
        if (this._rows.length === 0) {
            start_row = 0;
            start_char = 0;
            end_row = 0;
            end_char = 0;
        } else {
            if (start_row >= this._rows.length) start_row = this._rows.length - 1;
            if (start_row < 0) start_row = 0;
            if (end_row >= this._rows.length) end_row = this._rows.length - 1;
            if (end_row < 0) end_row = 0;

            if (start_char > this._rows[start_row].length) start_char = this._rows[start_row].length;
            if (start_char < 0) start_char = 0;
            if (end_char > this._rows[end_row].length) end_char = this._rows[end_row].length;
            if (end_char < 0) end_char = 0;
        }

        // Make sure the start is before the end.
        if (start_row > end_row || (start_row == end_row && start_char > end_char)) {
            return {
                start_row: end_row,
                start_char: end_char,
                end_row: start_row,
                end_char: start_char,
            };
        } else {
            return {
                start_row: start_row,
                start_char: start_char,
                end_row: end_row,
                end_char: end_char,
            };
        }
    }

    /**
     * Gets the text of the document.
     */
    private _get_text(): string {
        return this._rows.join('\n');
    }

    /**
     * Sets the text of the document.
     * Complexity O(N) for N rows
     */
    private _set_text(value: string): void {
        this._rows = value.split('\n');
        this._resized_rows();
        this.trigger('text_changed');
        this.trigger('changed');
    }

    /**
     * Updates _row's partner arrays.
     */
    private _resized_rows(): void {

        // Make sure there are as many tag rows as there are text rows.
        while (this._row_tags.length < this._rows.length) {
            this._row_tags.push({});
        }
        if (this._row_tags.length > this._rows.length) {
            this._row_tags.splice(this._rows.length, this._row_tags.length - this._rows.length);
        }
    }
}
