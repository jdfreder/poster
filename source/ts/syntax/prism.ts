// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
///<reference path="./prism.d.ts"/>
import utils = require('../utils/utils');
import superset = require('../utils/superset');
import document_model = require('../document_model');
import row = require('../draw/renderers/row');
import highlighter = require('./highlighter');
import prism = require('prismjs');

interface IToken {
    content: string;
    type: string;
    length: number;
}

/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */
export class PrismHighlighter extends highlighter.HighlighterBase {
    private _row_padding: number;
    private _language: any;

    public constructor(model: document_model.DocumentModel, row_renderer: row.RowRenderer) {
        super(model, row_renderer);

        // Look back and forward this many rows for contextually 
        // sensitive highlighting.
        this._row_padding = 30;
        this._language = null;
    }

    public get languages(): string[] {
        var languages = [];
        for (var l in prism.languages) {
            if (["extend", "insertBefore", "DFS"].indexOf(l) == -1) {
                languages.push(l);
            }
        }
        return languages;
    }

    /**
     * Highlight the document
     */
    public highlight(start_row: number, end_row: number): void {
        // Get the first and last rows that should be highlighted.
        start_row = Math.max(0, start_row - this._row_padding);
        end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

        // Abort if language isn't specified.
        if (!this._language) return;
        
        // Get the text of the rows.
        var text: string = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

        // Figure out where each tag belongs.
        var highlights: ([number, number, string])[] = this._highlight(text); // [start_index, end_index, tag]
        
        // Calculate Poster tags
        highlights.forEach(highlight => {

            // Translate tag character indicies to row, char coordinates.
            var before_rows: string[] = text.substring(0, highlight[0]).split('\n');
            var group_start_row: number = start_row + before_rows.length - 1;
            var group_start_char: number = before_rows[before_rows.length - 1].length;
            var after_rows: string[] = text.substring(0, highlight[1]).split('\n');
            var group_end_row: number = start_row + after_rows.length - 1;
            var group_end_char: number = after_rows[after_rows.length - 1].length;

            // New lines can't be highlighted.
            while (group_start_char === this._model._rows[group_start_row].length) {
                if (group_start_row < group_end_row) {
                    group_start_row++;
                    group_start_char = 0;
                } else {
                    return;
                }
            }
            while (group_end_char === 0) {
                if (group_end_row > group_start_row) {
                    group_end_row--;
                    group_end_char = this._model._rows[group_end_row].length;
                } else {
                    return;
                }
            }

            // Apply tag if it's not already applied.
            var tag: string = highlight[2].toLowerCase();
            var existing_tags: ([number, number, number, string])[] = this._model.get_tags('syntax', group_start_row, group_start_char, group_end_row, group_end_char);
            
            // Make sure the number of tags = number of rows.
            var correct_count: boolean = (existing_tags.length === group_end_row - group_start_row + 1);

            // Make sure every tag value equals the new value.
            var correct_values: boolean = true;
            var i: number;
            if (correct_count) {
                for (i = 0; i < existing_tags.length; i++) {
                    if (existing_tags[i][3] !== tag) {
                        correct_values = false;
                        break;
                    }
                }
            }

            // Check that the start and ends of tags are correct.
            var correct_ranges: boolean = true;
            if (correct_count&&correct_values) {
                if (existing_tags.length==1) {
                    correct_ranges = existing_tags[0][1] === group_start_char && existing_tags[0][2] === group_end_char;
                } else {
                    correct_ranges = existing_tags[0][1] <= group_start_char && 
                                     existing_tags[0][2] >= this._model._rows[group_start_row].length-1;
                    correct_ranges = correct_ranges &&
                                     existing_tags[existing_tags.length-1][1] === 0 && 
                                     existing_tags[existing_tags.length-1][2] >= group_end_char;
                    for (i = 1; i < existing_tags.length - 1; i++) {
                        correct_ranges = correct_ranges &&
                                         existing_tags[i][1] === 0 && 
                                         existing_tags[i][2] >= this._model._rows[existing_tags[i][0]].length-1;
                        if (!correct_ranges) break;
                    }
                }
            }

            if (!(correct_count&&correct_values&&correct_ranges)) {
                this._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag);
            }
        });
    }

    /**
     * Loads a syntax by language name.
     * @return success
     */
    public load(language: string): boolean;
    public load(language: any): boolean {
        try {
            // Check if the language exists.
            if (prism.languages[language] === undefined) {
                throw new Error('Language does not exist!');
            }
            this._language = prism.languages[language];
            this._queue_highlighter();
            return true;
        } catch (e) {
            console.error('Error loading language', e);
            this._language = null;
            return false;
        }
    }

    /**
     * Find each part of text that needs to be highlighted.
     * @return list containing items of the form [start_index, end_index, tag]
     */
    private _highlight(text: string): ([number, number, string])[] {

        // Tokenize using prism.js
        var tokens: IToken[] = prism.tokenize(text, this._language);

        // Convert the tokens into [start_index, end_index, tag]
        var left: number = 0;
        var flatten = function(tokens, prefix?) {
            if (!prefix) { prefix = []; }
            var flat: ([number, number, string])[] = [];
            for (var i = 0; i < tokens.length; i++) {
                var token: IToken = tokens[i];
                if (token.content) {
                    flat = flat.concat(flatten([].concat(token.content), prefix.concat(token.type)));
                } else {
                    if (prefix.length > 0) {
                        flat.push([left, left + token.length, prefix.join(' ')]);
                    }
                    left += token.length;
                }
            }
            return flat;
        };
        var tags = flatten(tokens);

        // Use a superset to reduce overlapping tags.
        var set = new superset.Superset();
        set.set(0, text.length-1, '');
        tags.forEach(tag => set.set(tag[0], tag[1]-1, tag[2]));
        return set.array;
    }
}
