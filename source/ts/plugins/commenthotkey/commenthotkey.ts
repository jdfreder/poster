// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
import plugin = require('../plugin');
import cursor = require('../../control/cursor');
import utils = require('../../utils/utils');
/**
 * CommentHotKey
 */
export class CommentHotKey extends plugin.PluginBase {
    public constructor() {
        super();
        this.on('load', this._handle_load, this);
    }

    /**
     * Handles when the plugin is loaded.
     */
    private _handle_load(): void {

        // Register actions.
        if (navigator.appVersion.indexOf("Mac") != -1) {
            this.poster.controller.map.map({
                'meta-fowardslash': 'cursor.comment'
            })
        } else {
            this.poster.controller.map.map({
                'ctrl-fowardslash': 'cursor.comment'
            })
        }

        this.poster.controller.map.register('cursor.comment', () => {
            var comment_prefix: string | string[] = this._get_comment_prefix();
            var cursors = this.poster.controller.cursors.cursors;
            for (var i: number = 0; i < cursors.length; i++) {
                this._comment(cursors[i], comment_prefix);
            }
            return true;
        });
    }

    /**
     * Comment the rows selected by the cursor.
     */
    private _comment(cursor: cursor.Cursor, comment: string | string[]): void {
        var comment_block: string[];
        var comment_prefix: string;
        if (utils.is_array(comment)) {
            comment_block = <string[]>comment;
        } else {
            comment_prefix = <string>comment;
        }

        var commented: boolean = true;
        var least_indented: number = null;

        // Run through each line, checking if the line is prefixed with a
        // comment string and suffixed with an end string, if applicable.  Also
        // keep track of the least indented line.
        for (var i: number = cursor.start_row; i <= cursor.end_row; i++) {
            var row: string = this.poster.model._rows[i];
            var indent: number = row.length - utils.ltrim(row).length;
            if (least_indented === null || indent < least_indented) least_indented = indent;

            if (comment_block) {
                if (utils.ltrim(row).substr(0, comment_block[0].length) !== comment_block[0] ||
                    utils.rtrim(row).substr(-comment_block[1].length) !== comment_block[1]) {
                    commented = false;
                }
            } else {
                if (utils.ltrim(row).substr(0, comment_prefix.length) !== comment_prefix) {
                    commented = false;
                }
            }         
        }

        // If the lines are already commented, remove the comments.
        cursor.historical(() => {
            if (commented) {
                for (var i: number = cursor.start_row; i <= cursor.end_row; i++) {
                    var row: string = this.poster.model._rows[i];
                    var indent_size: number = row.length - utils.ltrim(row).length;
                    var indent: string = row.substr(0, indent_size);

                    if (comment_block) {
                        var right_indent_size: number = row.length - utils.rtrim(row).length;
                        this._model_replace_row(cursor, i, row.substr(0, indent_size) +
                            row.substr(indent_size + comment_block[0].length, row.length - (indent_size + right_indent_size + comment_block[0].length + comment_block[1].length)) +
                            (right_indent_size>0?row.substr(-right_indent_size):''));
                        cursor.primary_char -= comment_block[0].length;
                        cursor.secondary_char -= comment_block[0].length;
                    } else {
                        this._model_replace_row(cursor, i, row.substr(0, indent_size) +
                            row.substr(indent_size + comment_prefix.length));
                        cursor.primary_char -= comment_prefix.length;
                        cursor.secondary_char -= comment_prefix.length;
                    }
                }

                // The lines aren't commented yet, add comments.
            } else {
                for (var i: number = cursor.start_row; i <= cursor.end_row; i++) {
                    var row: string = this.poster.model._rows[i];
                    if (comment_block) {
                        var right_indent_size: number = row.length - utils.rtrim(row).length;
                        this._model_replace_row(cursor, i, row.substr(0, least_indented) +
                            comment_block[0] +
                            row.substr(least_indented, row.length - least_indented - right_indent_size) +
                            comment_block[1] +
                            (right_indent_size>0?row.substr(-right_indent_size):''))
                        cursor.primary_char += comment_block[0].length;
                        cursor.secondary_char += comment_block[0].length;
                } else {
                        this._model_replace_row(cursor, i, row.substr(0, least_indented) +
                            comment_prefix +
                            row.substr(least_indented));
                        cursor.primary_char += comment_prefix.length;
                        cursor.secondary_char += comment_prefix.length;
                    }
                }
            }
        });
        cursor.trigger('change');
    }

    /**
     * Replace a row's text.
     */
    private _model_replace_row(cursor: cursor.Cursor, row: number, text: string): void {
        cursor.model_remove_row(row);
        cursor.model_add_row(row, text);
    }

    /**
     * Get the comment identifier for the current language.
     */
    private _get_comment_prefix(): string | string[] {
        switch (this.poster.language) {    
            case 'actionscript':
            case 'c':
            case 'clike':
            case 'cpp':
            case 'csharp':
            case 'dart':
            case 'fsharp':
            case 'go':
            case 'groovy':
            case 'jade':
            case 'java':
            case 'javascript':
            case 'jsx':
            case 'less':
            case 'objectivec':
            case 'pascal':
            case 'php - extras':
            case 'php':
            case 'rust':
            case 'scala':
            case 'swift':
            case 'stylus':
            case 'typescript':
                return '// ';
                
            case 'apacheconf':
            case 'bash':
            case 'coffeescript':
            case 'gherkin':
            case 'git':
            case 'julia':
            case 'nsis':
            case 'perl':
            case 'powershell':
            case 'python':
            case 'r':
            case 'rip':
            case 'ruby':
            case 'yaml':
                return '# ';

            case 'applescript':
            case 'eiffel':
            case 'haskell':
            case 'sql':
                return '-- ';

            case 'aspnet':
                return "'";

            case 'autohotkey':
            case 'ini':
            case 'nasm':
            case 'scheme':
                return '; ';

            case 'css':
            case 'sas':
            case 'scss':
                return ['/* ', ' */'];
                
            case 'erlang':
            case 'latex':
            case 'matlab':
                return '% ';
                
            case 'fortran':
                return '! ';

            case 'haml':
                return '-# ';

            case 'handlebars':
            case 'markdown':
            case 'wiki':
                return ['<!-- ', ' -->']

            case 'lolcode':
                return 'BTW ';

            case 'rest':
                return '.. ';

            case 'smalltalk':
                return ['"', '"'];

            case 'smarty':
                return ['{* ', ' *}'];

            case 'twig':
                return ['{# ', ' #}'];

            default:
                return null;
        }
    }
}
