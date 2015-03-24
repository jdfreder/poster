// OSX bindings
var _map;
if (navigator.appVersion.indexOf("Mac") != -1) {
    _map = {
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
    _map = {
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
_map['keypress'] = 'cursor.keypress';
_map['enter'] = 'cursor.newline';
_map['delete'] = 'cursor.delete_forward';
_map['backspace'] = 'cursor.delete_backward';
_map['leftarrow'] = 'cursor.left';
_map['rightarrow'] = 'cursor.right';
_map['uparrow'] = 'cursor.up';
_map['downarrow'] = 'cursor.down';
_map['shift-leftarrow'] = 'cursor.select_left';
_map['shift-rightarrow'] = 'cursor.select_right';
_map['shift-uparrow'] = 'cursor.select_up';
_map['shift-downarrow'] = 'cursor.select_down';
_map['mouse0-dblclick'] = 'cursors.select_word';
_map['mouse0-down'] = 'cursors.start_selection';
_map['mouse-move'] = 'cursors.set_selection';
_map['mouse0-up'] = 'cursors.end_selection';
_map['shift-mouse0-up'] = 'cursors.end_selection';
_map['shift-mouse0-down'] = 'cursors.start_set_selection';
_map['shift-mouse-move'] = 'cursors.set_selection';
_map['tab'] = 'cursor.indent';
_map['shift-tab'] = 'cursor.unindent';
_map['escape'] = 'cursors.single';
export var map = _map;
