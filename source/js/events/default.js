// OSX bindings
var map;
if (navigator.appVersion.indexOf("Mac") != -1) {
    map = {
        'alt-leftarrow' : 'cursor.word_left',
        'alt-rightarrow' : 'cursor.word_right',
        'shift-alt-leftarrow' : 'cursor.select_word_left',
        'shift-alt-rightarrow' : 'cursor.select_word_right',
        'alt-backspace' : 'cursor.delete_word_left',
        'alt-delete' : 'cursor.delete_word_right',
        'meta-leftarrow' : 'cursor.line_start',
        'meta-rightarrow' : 'cursor.line_end',
        'shift-meta-leftarrow' : 'cursor.select_line_start',
        'shift-meta-rightarrow' : 'cursor.select_line_end',
        'meta-a' : 'cursor.select_all',
        'meta-z' : 'history.undo',
        'meta-y' : 'history.redo',
    };

// Non OSX bindings
} else {
    map = {
        'ctrl-leftarrow' : 'cursor.word_left',
        'ctrl-rightarrow' : 'cursor.word_right',
        'ctrl-backspace' : 'cursor.delete_word_left',
        'ctrl-delete' : 'cursor.delete_word_right',
        'shift-ctrl-leftarrow' : 'cursor.select_word_left',
        'shift-ctrl-rightarrow' : 'cursor.select_word_right',
        'home' : 'cursor.line_start',
        'end' : 'cursor.line_end',
        'shift-home' : 'cursor.select_line_start',
        'shift-end' : 'cursor.select_line_end',
        'ctrl-a' : 'cursor.select_all',
        'ctrl-z' : 'history.undo',
        'ctrl-y' : 'history.redo',
    };

}

// Common bindings
map['keypress'] = 'cursor.keypress';
map['enter'] = 'cursor.newline';
map['delete'] = 'cursor.delete_forward';
map['backspace'] = 'cursor.delete_backward';
map['leftarrow'] = 'cursor.left';
map['rightarrow'] = 'cursor.right';
map['uparrow'] = 'cursor.up';
map['downarrow'] = 'cursor.down';
map['shift-leftarrow'] = 'cursor.select_left';
map['shift-rightarrow'] = 'cursor.select_right';
map['shift-uparrow'] = 'cursor.select_up';
map['shift-downarrow'] = 'cursor.select_down';
map['mouse0-dblclick'] = 'cursors.select_word';
map['mouse0-down'] = 'cursors.start_selection';
map['mouse-move'] = 'cursors.set_selection';
map['mouse0-up'] = 'cursors.end_selection';
map['shift-mouse0-up'] = 'cursors.end_selection';
map['shift-mouse0-down'] = 'cursors.start_set_selection';
map['shift-mouse-move'] = 'cursors.set_selection';
map['tab'] = 'cursor.indent';
map['shift-tab'] = 'cursor.unindent';
map['escape'] = 'cursors.single';
exports.map = map;
