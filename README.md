# poster
**WORK IN PROGRESS**

HTML Canvas based and syntax highlighted text editor.

## The good
- Supports mixed font styles - including different font sizes.
- Only renders what should be visible and does so quickly; I use an interpolation search at frame render to find the first visible row (in theory O( lg lg(N)) for N rows of total text).  I haven't tested this method with a huge block of text yet, but my hopes are high.
- Uses a layered approach for each frame rendering.  You can take advantage of this with custom event driven renderers.
- Has a notion of styles which, as of now, allow you to define highlighting colors.  Soon I'll write a style manager and make the style themselves more powerful.
- Only creates 4 DOM elements!

## The bad
- Doesn't have clipboard support yet and implementing it may require some trickery, like ZeroClipboard (which I'm told is what GitHub uses).

## The ugly
- There are still quite a few missing keyboard event handlers (Ctrl-A, Ctrl-Left, etc..)
- I haven't actually implemented a real syntax highlighter, instead I've written an extremely simple test highlighter which highlights `es` wherever it can be found.  I think when I do write the syntax highlighter, I'll make it compatible with CodeMirror's or Ace's language syntax files.
- input_dispatcher is a mess.  I'm going to rewrite it so it uses key/action mappings.  Some of the cursor code is messy too.
