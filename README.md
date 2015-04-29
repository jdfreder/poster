# Poster
[![Join the chat at https://gitter.im/jdfreder/poster](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jdfreder/poster?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

HTML5 canvas based code editor.  
Demo at [http://jdfreder.github.io/poster/](http://jdfreder.github.io/poster/).

## Install

First install [node.js](https://nodejs.org/download/).  
Then install Poster inside the directory that you will be using it in:  

```
npm install posterjs
```

## Use (via HTML)
In an HTML file:

```html
<html>
    <head>
        <link rel="stylesheet" type="text/css" href="node_modules/posterjs/build/poster.css">
        <script type="text/javascript" src="node_modules/posterjs/build/poster.js"></script>
    </head>
    <body>
        <div id="demo"></div>
        <script type="text/javascript">
            var demo_element = document.getElementById('demo');
            var poster = new poster.Poster();
            demo_element.appendChild(poster.el);

            // Set Poster's size, language, and value.
            poster.width = 600;
            poster.height = 300;
            poster.language = 'javascript';
            poster.value = "// Code here...";
        </script>
    </body>
</html>
```

### Loading additional languages
Download the language(s) files you want to use from PrismJS's repository [here](https://github.com/PrismJS/prism/tree/gh-pages/components).  Place the files in the directory that you're using Poster in.  Then inside your document's `<head>` tag, include the Javascript file(s) after Poster. i.e. Using the above example, adding support for Python:

```html
<html>
  <head>
    <link rel="stylesheet" type="text/css" href="node_modules/posterjs/build/poster.css">
    <script type="text/javascript" src="node_modules/posterjs/build/poster.js"></script>
    <script type="text/javascript" src="prism-python.min.js"></script>
  </head>
  <body>
    <div id="demo"></div>
    <script type="text/javascript">
        var demo_element = document.getElementById('demo');
        var poster = new poster.Poster();
        demo_element.appendChild(poster.el);

        // Set Poster's size, language, and value.
        poster.width = 600;
        poster.height = 300;
        poster.language = 'python';
        poster.value = "# Code here...";
    </script>
  </body>
</html>
```

## Build

Runtime Poster doesn't depend on any libraries, [prism.js](http://prismjs.com/) is built into it for syntax highlighting.  Building Poster is simple.  First (fork&)clone this repository:

```
git clone https://github.com/jdfreder/poster.git
cd poster
```

Install [node.js](https://nodejs.org/download/) and then install the other dependencies:

```
npm install
```

Now you can build Poster:

```
gulp
```

The compiled output will be written to the `build` directory.
