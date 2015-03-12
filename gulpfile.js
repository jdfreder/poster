'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var concat = require('gulp-concat');
var glob = require("glob");
// var ts = require('gulp-typescript');
var babelify = require("babelify");
var debug = require('gulp-debug');

gulp.task('default', ['javascript', 'less']);

gulp.task('watch', function() {
    glob('./source/js/**/', undefined, function(error, dirs) {
        dirs.forEach(function(dir) {
            gulp.watch(dir + '*.js', ['javascript']);
        });
    })
    gulp.watch('source/less/*.less', ['less']);
});

gulp.task('components', function(callback) {
    return gulp.src([
        './source/components/prism/components/prism-core.js',
        './source/components/prism/components/prism-markup.js',
        './source/components/prism/components/prism-clike.js',

        './source/components/prism/components/prism-apacheconf.js',
        //'./source/components/prism/components/prism-css-extras.js',
        './source/components/prism/components/prism-java.js',
        './source/components/prism/components/prism-python.js',
        './source/components/prism/components/prism-aspnet.js',
        './source/components/prism/components/prism-css.js',
        './source/components/prism/components/prism-javascript.js',
        './source/components/prism/components/prism-rip.js',
        './source/components/prism/components/prism-autohotkey.js',
        './source/components/prism/components/prism-gherkin.js',
        './source/components/prism/components/prism-latex.js',
        './source/components/prism/components/prism-ruby.js',
        './source/components/prism/components/prism-bash.js',
        './source/components/prism/components/prism-git.js',
        './source/components/prism/components/prism-markup.js',
        './source/components/prism/components/prism-scala.js',
        './source/components/prism/components/prism-c.js',
        './source/components/prism/components/prism-go.js',
        './source/components/prism/components/prism-nasm.js',
        './source/components/prism/components/prism-scheme.js',
        './source/components/prism/components/prism-clike.js',
        './source/components/prism/components/prism-groovy.js',
        './source/components/prism/components/prism-nsis.js',
        './source/components/prism/components/prism-scss.js',
        './source/components/prism/components/prism-coffeescript.js',
        './source/components/prism/components/prism-handlebars.js',
        './source/components/prism/components/prism-objectivec.js',
        './source/components/prism/components/prism-sql.js',
        './source/components/prism/components/prism-core.js',
        './source/components/prism/components/prism-haskell.js',
        './source/components/prism/components/prism-perl.js',
        './source/components/prism/components/prism-swift.js',
        './source/components/prism/components/prism-cpp.js',
        './source/components/prism/components/prism-http.js',
        './source/components/prism/components/prism-php-extras.js',
        './source/components/prism/components/prism-twig.js',
        './source/components/prism/components/prism-csharp.js',
        './source/components/prism/components/prism-ini.js',
        './source/components/prism/components/prism-php.js',
        ]).pipe(concat('prism.js'))
        .pipe(gulp.dest('./source/components/'));
    // glob('./source/components/prism/components/*.js', undefined, function(error, dirs) {
    //     dirs.splice(dirs.indexOf('./source/components/prism/components/prism-css-extras.js'), 1)
    //     gulp
    //         .src(dirs)
    //         .pipe(concat('prism.js'))
    //         .pipe(gulp.dest('./source/components/'));
    //     callback();
    // })
});

gulp.task('javascript', ['components'], function() {
    var browserified = transform(function(filename) {
        return browserify(filename)
            // .plugin('tsify', { noImplicitAny: false })
            .transform(babelify)
            .bundle();
    });

    return gulp.src('./source/js/poster.js')
        .pipe(debug({title: 'input:'}))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(debug({title: 'input(2):'}))
        .pipe(browserified)
        .pipe(debug({title: 'sourcemapped:'}))
        // Add transformation tasks to the pipeline here.
        // .pipe(uglify())
        .pipe(debug({title: 'uglified:'}))
        .pipe(sourcemaps.write('./'))
        .pipe(debug({title: 'sourcemaps gone:'}))
        .pipe(gulp.dest('./build/'))
        .pipe(debug({title: 'built:'}));
});

gulp.task('less', function() {
    gulp.src('source/less/poster.less')
        .pipe(less())
        .pipe(gulp.dest('./build/'));
});
