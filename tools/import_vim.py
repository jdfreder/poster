# Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
"""
Script used to import VIM syntax files into Poster.
"""
import sys
import os

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
    delta = 0
    if regex.endswith('me=e-1'):
        delta = -1
        regex = regex[:-6]
    elif regex.endswith('me=e+1'):
        delta = 1
        regex = regex[:-6]
    return {'regex': regex, 'delta': delta}

def import_vim(file_name):
    """Import a VIM syntax file."""
    # Read the file's conents.
    print("Importing '%s'" % file)
    with open(file_name) as f:
        contents =  f.read()

    # Process the file line by line.
    keywords = {}
    matches = {}
    regions = {}
    for line in contents.split('\n'):
        words = split_words(line)
        if len(words) > 1:
            if words[0].lower() == 'syn':
                command = words[1].lower()
                name = words[2]
                arguments = words[3:]
                
                # Import keywords
                if command == 'keyword':
                    if name not in keywords:
                        keywords[name] = []

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

                    keywords[name].append({
                        'keywords': new_keywords,
                        'skipwhite': skipwhite,
                        'contained': contained,
                        'nextgroup': nextgroup,
                    })

                # Import matches
                elif command == 'match':
                    if name not in matches:
                        matches[name] = []

                    regex = parse_regex(arguments[0])
                    contains = []
                    contained = False
                    for arg in arguments[1:]:
                        if arg.startswith('contains='):
                            contains.extend(arg.split('=', 1)[1].split(','))
                        elif arg == 'contained':
                            contained = True

                    matches[name].append({
                        'regex': regex,
                        'contains': contains,
                        'contained': contained,
                    })

                # Import regions
                elif command == 'region':
                    if name not in regions:
                        regions[name] = []

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

                    regions[name].append({
                        'start': start,
                        'skip': skip,
                        'end': end,
                        'contains': contains,
                    })


    print keywords
    print matches
    print regions

if __name__ == '__main__':
    # Get path to vim file from arguments.
    args = sys.argv
    args = ['', '~/Desktop/javascript.vim']
    if len(args) < 2:
        print("""At least one VIM syntax file must be specified. 
    i.e. python import_vim ~/javascript.vim""")
    files = args[1:]

    # Import each file.
    for file in files:
        file = os.path.expanduser(file)
        import_vim(file)
