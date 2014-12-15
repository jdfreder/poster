// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
// 
// This file contains logic that converts VIM regular  expressions
// into Javascript regular expressions.

/**
 * Convert a VIM regular expression to a Javascript one.
 * @param  {string} s - VIM regular expression string
 * @return {string} Javascript regular expression string
 */
var convert_vim_regex = function(s) {
    if (_find_unescaped(s.toLowerCase(), '\\v')!=-1) throw new Error('Changing magic-ness not supported.');
    if (_find_unescaped(s.toLowerCase(), '\\m')!=-1) throw new Error('Changing magic-ness not supported.');
    if (_find_unescaped(s, '\\%^')!=-1) throw new Error('Start of string atom not supported.');
    if (_find_unescaped(s, '\\%$')!=-1) throw new Error('End of string atom not supported.');
    if (_find_unescaped(s, '\\_')!=-1) throw new Error('Match newline modifier not supported.');

    case_insesitive = _find_unescaped(s, '\\c')!=-1;

    s = _replace_unescaped(s, '\\|', '|');
    s = _replace_unescaped(s, '\\&', '');
    s = _replace_unescaped(s, '\\C', '');
    s = _replace_unescaped(s, '\\c', '');

    // Parse.
    var i = 0;
    var escaped = false;
    t = '';
    for (i; i < s.length; i++) {
        if (escaped) {
            if (s[i] == '=') {
                t += '?';
            } else if (s[i] == '@') { // Pass through @
                t += '\\@';
                if (i < s.length-1) {
                    if (i < s.length-2) {
                        if (s.substring(i+1,i+3) == '<=') {
                            t += '<=';
                            i += 2;
                        } else if (s.substring(i+1,i+3) == '<!') {
                            t += '<!';
                            i += 2;
                        }
                    }
                    if ('=!>'.indexOf(s[i+1]) != -1) {
                        t += s[i+1];
                        i += 1;
                    }
                }
            } else if (s[i] == '+') {
                t += '+';
            } else if (s[i] == '<' || s[i] == '>') {
                // Handle word boundaries by looking for any non alphabetic or numeric characters.
                t += '[^a-zA-Z0-9]';
            } else if (s.substring(i, i+2) == '%(') {
                t += '(?:';
                i += 1;
            } else if (s[i] == '(') {
                t += '(';
            } else if (s[i] == ')') {
                t += ')';
            } else if (s.substring(i, i+3) == '{-}') {
                t += '*?';
                i += 2;
            } else if (s.substring(i, i+5) == '{-1,}') {
                t += '+?';
                i += 4;
            } else if (s[i] == '{') {
                t += '{';
            } else {
                t += '\\' + s[i]; // Pass through unhandled.
            }
            escaped = false;
        } else {
            if (s[i] == '\\') {
                escaped = true;
            } else if (s[i] == '=') {
                t += '\\?';
            } else if (s[i] == '+') {
                t += '\\+';
            } else if (s[i] == '(') {
                t += '\\(';
            } else if (s[i] == ')') {
                t += '\\)';
            } else if (s[i] == '{') {
                t += '\\{';
            } else {
                t += s[i];
            }
        }
    }
    s = t;

    // Parse backwards acting \@ magic commands
    i = 0;
    while ((i = _find_unescaped(s, '\\@', i)) != -1) {
        if (i < s.length - 2 && '=!<>'.indexOf(s[i+2]) != -1) {
            var symb = null;
            if (s[i+2]=='<') {
                if (i < s.length - 3 && '=!'.indexOf(s[i+3]) != -1) {
                    symb = s[i+2] + s[i+3];
                }
            } else {
                symb = s[i+2];
            }

            if (symb !== null) {
                // Walk backwards to the start of the group or string, whichever comes first.
                var j = i;
                var depth = 1;
                while (j>0 && depth>0) {
                    j--;
                    if (_is_unescaped(j)) {
                        if (s[j] == '(') {
                            depth--;
                        } else if (s[j] == ')') {
                            depth++;
                        }
                    }
                }
                if (s[j]=='(') j++;

                rep_symb = (symb == '<!') ? '!' : symb;
                s = s.substring(0, j) + '(?' + rep_symb + s.substring(j, i) + ')' + s.substring(i + symb.length + 2);
                i += 2 + rep_symb.length + 1 - (symb.length + 2);
            }
        }
        i++;
    }


    return {
        regex: s,
        flags: (case_insesitive ? 'i' : '') + 'mg'
    };
};

/**
 * Check if a character is unescaped.
 * @param  {string} s
 * @param  {integer} index
 * @return {boolean}
 */
var _is_unescaped = function(s, index) {
    if (index === 0) return true;
    backslash_free = s[index-1] != '\\';
    if (index > 1) {
        return backslash_free && (s.substring(index-2, index) != '\\%');
    } else {
        return backslash_free;
    }
};

/**
 * Find an unescaped string.
 * @param  {string} s
 * @param  {string} find
 * @param  {integer} [index]
 * @return {integer} index or -1 if not found
 */
var _find_unescaped = function(s, find, index) {
    s = s.replace(/\\\\/g, '  ');
    while ((index = s.indexOf(find, index)) != -1) {
        if (_is_unescaped(s, index)) return index;
        index++;
    }
    return -1;
};

/**
 * Replace an unescaped string.
 * @param  {string} s
 * @param  {string} find
 * @param  {string} replace
 * @param  {integer} [index]
 */
var _replace_unescaped = function(s, find, replace, index) {
    while ((index = _find_unescaped(s, find, index)) != -1) {
        s = s.substring(0, index) + replace + s.substring(index + find.length);
        index += 1 - (find.length - replace.length);
    }
    return s;
};

// TODO: Make these actual unit tests.
// // TESTS
// var test_it = function(in_s, out) {
//     var res = convert_vim_regex(in_s).regex;
//     if (res != out) {
//         console.log('FAILURE', in_s, res, 'Should be: ' + out);
//     }
// }

// test_it('atom\\@=', '(?=atom)');
// test_it('atom\\@!', '(?!atom)');
// test_it('atom\\@<=', '(?<=atom)');
// test_it('atom\\@<!', '(?!atom)');
// test_it('atom\\@>', '(?>atom)');
// test_it('at\\(om\\@!\\)', 'at((?!om))');
// test_it('at\\(o\\(m\\)\\@!\\)', 'at((?!o(m)))');
// test_it('x\\=', 'x?');
// test_it('x\\+', 'x+');
// test_it('x\\{-}', 'x*?');
// test_it('x\\{-1,}', 'x+?');
// test_it('(xyz)' ,'\\(xyz\\)');
// test_it('\\(xyz\\)' ,'(xyz)');
// test_it('x\\{n,m}' ,'x{n,m}');
// test_it('x{n,m}' ,'x\\{n,m}');

console.log(JSON.stringify(convert_vim_regex(process.argv[2])));
