/**
 * Gulp tasks
 *
 * The following tasks can be used to build and serve environments for development and production.
 * There are 5 main tasks which perform the actions respectively (TSLint will perform a code check in all tasks).
 *
 * gulp                 Build/serve/watch dev environment on port 8080 (builds Angular 2 bundle and TypeScript/Sass on start, no compilation of TypeScript/Sass during watch task, suitable for IDEs)
 * gulp start:dev       Build/serve/watch dev environment on port 8080 (builds Angular 2 bundle, compiles TypeScript/Sass during watch task)
 * gulp build:dev       Build dev environment (builds Angular 2 bundle and compiles TypeScript/Sass)
 * gulp start:prod      Build/serve prod environment on port 8081 (builds Angular 2 bundle and TypeScript/Sass on start, no watch task, only for deployment)
 * gulp build:prod      Build prod environment (compiles TypeScript/Sass, processes index.html, bundles app and Angular2 JS files into one file, bundles CSS into one file and copies static files into dist/ folder)
 *
 */
var gulp = require('gulp');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var connect = require('gulp-connect');
var path = require('path');
var preprocess = require('gulp-preprocess');
var replace = require('gulp-replace');
var runSequence = require('run-sequence');
var sass = require('gulp-sass');
var SystemJsBuilder = require('systemjs-builder');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');

/**
 * Configuration
 */
var paths = {
	sassSrc: './app/styles/**/*.scss',
	typescriptSrc: ['./app/src/**/*.ts', './typings/**/*.ts'],

	vendorJsLibs: {
		dev: [
			'./node_modules/systemjs/dist/system.src.js',
			'./node_modules/systemjs/dist/system-polyfills.js',
			'./node_modules/reflect-metadata/Reflect.js',
			'./node_modules/es6-shim/es6-shim.js',
			'./node_modules/rxjs/bundles/Rx.js',
			'./node_modules/zone.js/dist/zone.js',
			'./node_modules/zone.js/dist/long-stack-trace-zone.js'
		],
		prod: {
			bundle: [
				'./node_modules/reflect-metadata/Reflect.js',
				'./node_modules/es6-shim/es6-shim.min.js',
				'./node_modules/rxjs/bundles/Rx.min.js',
				'./node_modules/zone.js/dist/zone.min.js',
				'./node_modules/zone.js/dist/long-stack-trace-zone.min.js'
			],
			copy: [
				'./node_modules/systemjs/dist/system.js',
				'./node_modules/systemjs/dist/system-polyfills.js'
			]
		}
	},

	dev: {
		cleanSrc: './app/src/vendor/node_modules/*',
		sassDest: './app/styles',
		typescriptDest: './app/src',
		tslintDest: './app/src/**/*.ts',
		vendorJsDest: './app/src/vendor/node_modules',

		systemjs: {
			angularBundleSrc: './app/src/vendor/angular2.bundle.js',
			angularBundleDest: './app/src/vendor/node_modules/angular2.js'
		},

		serverRoot: './app',
		serverFallback: './app/index.html',
		serverFileWatchers: {
			all: [
				'./app/assets/*',
				'./app/**/*.css',
				'./app/**/*.js',
				'./app/**/*.html'
			],
			watchCompile: [
				'./app/assets/*',
				'./app/**/*.html'
			]
		}
	},
	prod: {
		cleanSrc: './dist/*',
		sassDest: './dist/styles',
		jsDest: './dist/src',

		htmlSrc: './app/index.html',
		htmlDest: './dist',

		staticBase: './app',
		staticSrc: [
			'./app/assets/**/*',
			'./app/src/**/*.html'
		],
		staticDest: './dist',

		vendorCssSrc: [
			'./app/styles/vendor/coresheet.min.css'
		],
		vendorCssOutFile: 'vendor.css',
		vendorCssDest: './dist/styles',

		systemjs: {
			appBundleSrc: './app/src/bootstrap.js',
			appBundleDest: 'app.min.js'
		},

		serverRoot: './dist',
		serverFallback: './dist/index.html'
	}
};

var systemjsConfig = {
	baseURL: './',
	defaultJSExtensions: true,
	paths: {
		'*': 'node_modules/*',
		'app/*': 'app/*'
	},
	map: {
		'@angular': './@angular'
	},
	packages: {
		'@angular/core': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/compiler': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/common': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/http': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/platform-browser': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/platform-browser-dynamic': {
			main: 'index.js',
			defaultExtension: 'js'
		},
		'@angular/router': {
			main: 'index.js',
			defaultExtension: 'js'
		}
	}
};

/**
 * Development tasks
 */
gulp.task('dev:bundle:angular', function(done) {
	var systemjs = new SystemJsBuilder(systemjsConfig);

	systemjs
		.bundle(
			paths.dev.systemjs.angularBundleSrc,
			paths.dev.systemjs.angularBundleDest,
			{
				normalize: true,
				sourceMaps: false,
				minify: false,
				mangle: false
			})
		.then(function() {
			gulp
				.src([paths.dev.systemjs.angularBundleDest])
				.pipe(replace(/\/index\.js/g, ''))
				.pipe(gulp.dest(paths.dev.vendorJsDest));

			done();
		});
});

gulp.task('dev:clean', function() {
	return gulp.src(paths.dev.cleanSrc, { read: false })
		.pipe(clean());
});

gulp.task('dev:compile:sass', function() {
	return gulp.src(paths.sassSrc)
		.pipe(sass())
		.pipe(gulp.dest(paths.dev.sassDest))
		.pipe(connect.reload());
});

gulp.task('dev:compile:typescript', function() {
	var tsProject = ts.createProject('./tsconfig.json');

	var tsResult = gulp.src(paths.typescriptSrc)
		.pipe(ts(tsProject));

	return tsResult.js
		.pipe(gulp.dest(paths.dev.typescriptDest))
		.pipe(connect.reload());
});

gulp.task('dev:copy:vendor-js', function() {
	return gulp.src(paths.vendorJsLibs.dev)
		.pipe(gulp.dest(paths.dev.vendorJsDest));
});

gulp.task('dev:tslint', function() {
	return gulp.src(paths.dev.tslintDest)
        .pipe(tslint())
        .pipe(tslint.report('prose'));
});

/**
 * Production tasks
 */
gulp.task('prod:bundle:js', function(done) {
	var systemjs = new SystemJsBuilder(systemjsConfig);
	var appBundleDest = path.join(paths.prod.jsDest, paths.prod.systemjs.appBundleDest);

	systemjs
		.buildStatic(
			paths.prod.systemjs.appBundleSrc,
			appBundleDest,
			{
				normalize: true,
				sourceMaps: false,
				minify: true,
				mangle: true
			})
		.then(function() {
			paths.vendorJsLibs.prod.bundle.push(appBundleDest);

			gulp.src(paths.vendorJsLibs.prod.bundle)
				.pipe(concat(paths.prod.systemjs.appBundleDest))
				.pipe(gulp.dest(paths.prod.jsDest));

			gulp.src(paths.vendorJsLibs.prod.copy)
				.pipe(gulp.dest(paths.prod.jsDest));

			done();
		});
});

gulp.task('prod:clean', function() {
	return gulp.src(paths.prod.cleanSrc, { read: false })
		.pipe(clean());
});

gulp.task('prod:compile:sass', function() {
	return gulp.src(paths.sassSrc)
		.pipe(sass({ outputStyle: 'compressed' }))
		.pipe(gulp.dest(paths.prod.sassDest));
});

gulp.task('prod:copy:html', function() {
	return gulp.src(paths.prod.htmlSrc)
		.pipe(preprocess())
		.pipe(gulp.dest(paths.prod.htmlDest));
});

gulp.task('prod:copy:static', function() {
	return gulp.src(paths.prod.staticSrc, { base: paths.prod.staticBase })
		.pipe(gulp.dest(paths.prod.staticDest));
});

gulp.task('prod:bundle:vendor-css', function() {
	return gulp.src(paths.prod.vendorCssSrc)
		.pipe(concat(paths.prod.vendorCssOutFile))
		.pipe(gulp.dest(paths.prod.vendorCssDest));
});

/**
 * Server tasks
 */
gulp.task('reload:dev', function() {
	return gulp.src(paths.dev.serverRoot)
		.pipe(connect.reload());
});

gulp.task('serve:dev', function() {
	connect.server({
		port: "8080",
		root: paths.dev.serverRoot,
		fallback: paths.dev.serverFallback,
		livereload: true
	});
});

gulp.task('serve:prod', function() {
	connect.server({
		port: "8081",
		root: paths.prod.serverRoot,
		fallback: paths.prod.serverFallback,
		livereload: true
	});
});

gulp.task('watch:dev', function() {
	gulp.watch(paths.dev.serverFileWatchers.all, ['reload:dev']);
});

gulp.task('watch-compile:dev', function() {
	gulp.watch(paths.typescriptSrc, ['dev:tslint', 'dev:compile:typescript']);
	gulp.watch(paths.sassSrc, ['dev:compile:sass']);
	gulp.watch(paths.dev.serverFileWatchers.watchCompile, ['reload:dev']);
});

/**
 * Main tasks
 */
gulp.task('build:dev', function(done) {
	runSequence('dev:tslint', 'dev:clean', 'dev:compile:sass', 'dev:compile:typescript', 'dev:copy:vendor-js', 'dev:bundle:angular', done);
});

gulp.task('build:prod', function(done) {
	runSequence('dev:tslint', 'prod:clean', 'prod:compile:sass', 'dev:compile:typescript', 'prod:copy:html', 'prod:copy:static', 'prod:bundle:js', 'prod:bundle:vendor-css', done);
});

gulp.task('start:dev', function(done) {
	runSequence('build:dev', 'serve:dev', 'watch-compile:dev', done);
});

gulp.task('start:prod', function(done) {
	runSequence('build:prod', 'serve:prod', done);
});

gulp.task('default', function(done) {
	runSequence('build:dev', 'serve:dev', 'watch:dev', done);
});