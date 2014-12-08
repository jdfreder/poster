# Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
"""
Script used to import VIM syntax files into Poster.
"""
import sys
import os
import json
import glob

def split_words(line):
    string_delims = ['\'', '"', '+']
    string_delim = None
    word = ''
    words = []
    for char in line.strip():
        if string_delim is not None:
            if string_delim != char:
                word += char
            else:
                string_delim = None
        else:
            if char == ' ' or char == '\t':
                if len(word) > 0:
                    words.append(word)
                    word = ''
            elif char in string_delims:
                string_delim = char
            else:
                word += char
    if len(word) > 0:
        words.append(word)
        word = ''
    return words

def parse_regex(regex):
    # TODO: Do a better job of parsing this.
    delta = 0
    if regex.endswith('me=e-1'):
        delta = -1
        regex = regex[:-6]
    elif regex.endswith('me=e+1'):
        delta = 1
        regex = regex[:-6]
    return {'regex': regex, 'delta': delta}

def convert_vim(file_name, outputdir=None):
    """Import a VIM syntax file."""
    # Read the file's conents.
    print("Importing '%s'" % file)
    with open(file_name) as f:
        contents =  f.read()

    # Process the file line by line.
    groups = {}
    tags = {}
    for line in contents.split('\n'):
        words = split_words(line)
        if len(words) > 1:
            if words[0].lower() == 'syn':
                command = words[1].lower()
                name = words[2]
                arguments = words[3:]
                
                # Import keywords
                if command == 'keyword':
                    if name not in groups:
                        groups[name] = []

                    # Parse each keyword.
                    new_keywords = []
                    skipwhite = False
                    contained = False
                    nextgroup = None
                    for arg in arguments:
                        if arg == 'skipwhite':
                            skipwhite = True
                        elif arg == 'contained':
                            contained = True
                        elif arg.startswith('nextgroup='):
                            # Add everything after the first equal symbol
                            nextgroup = arg.split('=', 1)[1]
                        else:
                            new_keywords.append(arg)

                    groups[name].append({
                        'type': 'keyword',
                        'keywords': new_keywords,
                        'skipwhite': skipwhite,
                        'contained': contained,
                        'nextgroup': nextgroup,
                    })

                # Import matches
                elif command == 'match':
                    if name not in groups:
                        groups[name] = []

                    regex = parse_regex(arguments[0])
                    contains = []
                    skipwhite = False
                    contained = False
                    nextgroup = None
                    for arg in arguments[1:]:
                        if arg.startswith('contains='):
                            contains.extend(arg.split('=', 1)[1].split(','))
                        elif arg == 'skipwhite':
                            skipwhite = True
                        elif arg.startswith('nextgroup='):
                            # Add everything after the first equal symbol
                            nextgroup = arg.split('=', 1)[1]
                        elif arg == 'contained':
                            contained = True

                    groups[name].append({
                        'type': 'match',
                        'regex': regex,
                        'contained': contained,
                        'skipwhite': skipwhite,
                        'contains': contains,
                        'nextgroup': nextgroup,
                    })

                # Import regions
                elif command == 'region':
                    if name not in groups:
                        groups[name] = []

                    start = None
                    skip = None
                    end = None
                    contains = []
                    for arg in arguments:
                        if arg.startswith('contains='):
                            contains.extend(arg.split('=', 1)[1].split(','))
                        elif arg.startswith('start='):
                            start = parse_regex(arg.split('=', 1)[1])
                        elif arg.startswith('end='):
                            end = parse_regex(arg.split('=', 1)[1])
                        elif arg.startswith('skip='):
                            skip = parse_regex(arg.split('=', 1)[1])

                    groups[name].append({
                        'type': 'region',
                        'start': start,
                        'skip': skip,
                        'end': end,
                        'contains': contains,
                    })

            # Import tags definitions.
            elif words[0].lower() == 'hilink':
                tags[words[1]] = words[2]
            elif words[0].lower() == 'hi':
                if words[1] == 'def':
                    if words[2] == 'link':
                        tags[words[3]] = words[4]
                elif words[1] == 'link':
                    tags[words[2]] = words[3]


    # Export the file
    # path/name.ext
    path = os.path.split(file_name)[0]
    name = os.path.split(file_name)[1]
    ext = os.path.splitext(name)[1]
    name = os.path.splitext(name)[0]

    if outputdir is None:
        outputdir = path

    output = os.path.join(outputdir, name + '.js')
    print("Exporting '%s'" % output)
    with open(output, 'w') as f:
        f.write('/*\n{}\n*/\n'.format("""
Syntax file autogenerated from VIM's "{original}" file.
Use poster/tools/import_vim.py to import more syntax files from VIM.
        """.strip().format(original=name+ext)))
        f.write('exports.syntax = ' + json.dumps({
            'groups': groups,
            'tags': tags,
        }, indent=4) + ';')
    return name

if __name__ == '__main__':
    # Get path to vim file from arguments.
    args = sys.argv
    if len(args) < 2:
        print("""At least one VIM syntax file must be specified. 
    i.e. python import_vim.py ~/javascript.vim""")
    files = args[1:]

    outputdir = None
    for arg in args:
        if arg.startswith('-o') or arg.startswith('--outputdir'):
            outputdir = os.path.expanduser(arg.split('=')[1])
        elif arg.startswith('-?') or arg.startswith('-h') or arg.startswith('--help'):
            print("""
Poster VIM syntax file converter.

Converts VIM syntax files into poster syntax files.

Usage
-----
python import_vim.py [--help] [--outputdir=path] inputs

--help or -h or -?:
    Displays this help message.
--outputdir or -o:
    Exports the conversion results to the directory specified.
inputs:
    List of filenames or directory names containing *.vim files.

Example
-------
python import_vim.py --outputdir=~/poster/source/js/highlighters/syntax ~/Desktop/
                """)
            exit()
    # Import each file.
    names = []
    for file in files:
        file = os.path.expanduser(file)
        if os.path.isfile(file):
            names.append(convert_vim(file, outputdir))
        elif os.path.isdir(file):
            for file in glob.glob(os.path.join(file, '*.vim')):
                names.append(convert_vim(file, outputdir))
    if outputdir is not None:
        with open(os.path.join(outputdir, 'init.js'), 'w') as f:
            f.write('exports.languages = {\n' +
                '    ' + '\n    '.join(['"{name}": require("./{name}.js"),'.format(name=name) for name in names]) + '\n'
                '};\n')
