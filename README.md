# poster
**WORK IN PROGRESS**

HTML Canvas based and syntax highlighted text editor.

## The good
- Supports rich formatting.
- Only renders what should be visible and does so quickly.
- Uses a layered approach for frame rendering.  Layers can rerendering themselves idependently of other layers.
- Styles

## The bad
- Doesn't have clipboard support yet and implementing it may require some trickery, like ZeroClipboard (which I'm told is what GitHub uses).

## The ugly
- There are still quite a few missing keyboard event handlers (Ctrl-A, Ctrl-Left, etc..)
- I haven't actually implemented a real syntax highlighter, instead I've written an extremely simple test highlighter which highlights `es` wherever it can be found.  I think when I do write the syntax highlighter, I'll make it compatible with CodeMirror's or Ace's language syntax files.
