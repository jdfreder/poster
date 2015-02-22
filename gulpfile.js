'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var less = require('gulp-less');
var concat = require('gulp-concat');

gulp.task('default', ['javascript', 'less']);

gulp.task('watch', function() {
    gulp.watch('source/js/*.js', ['javascript']);
    gulp.watch('source/js/events/*.js', ['javascript']);
    gulp.watch('source/js/highlighters/*.js', ['javascript']);
    gulp.watch('source/js/highlighters/syntax/*.js', ['javascript']);
    gulp.watch('source/js/plugins/*.js', ['javascript']);
    gulp.watch('source/js/plugins/gutter/*.js', ['javascript']);
    gulp.watch('source/js/plugins/linenumbers/*.js', ['javascript']);
    gulp.watch('source/js/renderers/*.js', ['javascript']);
    gulp.watch('source/js/styles/*.js', ['javascript']);
    gulp.watch('source/less/*.less', ['less']);
});

gulp.task('components', function() {
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
});

gulp.task('javascript', ['components'], function() {
    return browserify({
            entries: ['./source/js/poster.js'],
            debug: true,
            standalone: 'poster',
        })
        .bundle()
        .pipe(source('poster.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./build/'));
        // Add transformation tasks to the pipeline here.
        // This will minify and rename to foo.min.js
        // .pipe(sourcemaps.init({loadMaps: true}))
        // .pipe(uglify())
        // .pipe(sourcemaps.write('./'));
});

gulp.task('less', function() {
    gulp.src('source/less/poster.less')
        .pipe(less())
        .pipe(gulp.dest('./build/'));
});
