var gulp = require('gulp')
var gutil = require('gulp-util')

var browserify = require('browserify')
var del = require('del')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var react = require('gulp-react')
var rename = require('gulp-rename')
var source = require('vinyl-source-stream')
var streamify = require('gulp-streamify')
var template = require('gulp-template')
var uglify = require('gulp-uglify')

var jsSrcFiles = './src/**/*.js'
var jsxSrcFiles = jsSrcFiles + 'x'
var jsBuildFiles = './build/modules/**/*.js'
var jsExt = (gutil.env.production ? 'min.js' : 'js')

// Set up NODE_ENV appropriately for envify
process.env.NODE_ENV = (gutil.env.production ? 'production' : 'development')

/** Delete everything from /build/modules */
gulp.task('clean-modules', function(cb) {
  del('./build/modules/**', cb)
})

/** Copy non-jsx JavaScript to /build/modules */
gulp.task('copy-js', ['clean-modules'], function() {
  return gulp.src(jsSrcFiles)
    .pipe(gulp.dest('./build/modules'))
})

/** Transpile JSX to plain old JavaScript and copy to /build/modules */
gulp.task('transpile-jsx', ['clean-modules'], function() {
  return gulp.src(jsxSrcFiles)
    .pipe(plumber())
    .pipe(react())
    .pipe(gulp.dest('./build/modules'))
})

/** Build an external bundle containing all dependencies of app.js */
gulp.task('build-deps', function() {
  var b = browserify({detectGlobals: false})
  b.require('react/addons')
  b.require('react-router')
  b.require('firebase')
  b.require('reactfire')
  b.require('moment')
  b.transform('envify')

  return b.bundle()
    .pipe(source('deps.js'))
    .pipe(gulp.dest('./build'))
    .pipe(rename('deps.min.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('./build'))
})

/** Lint everything in /build/modules */
gulp.task('lint', ['copy-js', 'transpile-jsx'], function() {
  return gulp.src(jsBuildFiles)
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

/** Build app.js */
gulp.task('build-app', ['lint'], function() {
  var b = browserify('./build/modules/app.js', {debug: !gutil.env.production})
  b.external('react/addons')
  b.external('react-router')
  b.external('firebase')
  b.external('reactfire')
  b.external('moment')

  var stream = b.bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('./build'))

  if (gutil.env.production) {
    stream = stream
      .pipe(rename('app.min.js'))
      .pipe(streamify(uglify()))
      .pipe(gulp.dest('./build'))
  }

  return stream
})

/** Build app.js and copy it to /dist */
gulp.task('copy-app', ['build-app'], function() {
  return gulp.src('./build/app.' + jsExt)
    .pipe(gulp.dest('./dist'))
})

/** Delete everything from /dist */
gulp.task('clean-dist', function(cb) {
  del('./dist/**', cb)
})

/** Regenerate /dist from scratch */
gulp.task('dist-copy', ['clean-dist', 'build-app', 'build-deps'], function() {
  return gulp.src(['./build/app.' + jsExt, './build/deps.' + jsExt, './public/**'])
    .pipe(gulp.dest('./dist'))
})

/** Copy CSS to /dist */
gulp.task('dist-css', function() {
  return gulp.src('./public/**/*.css')
    .pipe(gulp.dest('./dist'))
})

/** Regenerate /dist from scratch and template index.html */
gulp.task('dist', ['dist-copy'], function() {
  return gulp.src('./dist/index.html')
    .pipe(template({
      jsExt: jsExt
    }))
    .pipe(gulp.dest('./dist'))
})

/**
 * The default watch workflow is that you're editing in /src while running
 * against everything else which is already in /dist
 */
gulp.task('watch', ['copy-app'], function() {
  gulp.watch([jsSrcFiles, jsxSrcFiles], ['copy-app'])
  gulp.watch('./public/**/*.css', ['dist-css'])
})