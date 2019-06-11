const gulp = require("gulp");
const concat = require("gulp-concat");
const cssmin = require("gulp-cssmin");
const addsrc = require("gulp-add-src");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");
const stripCssComments = require("gulp-strip-css-comments");
const sourcemaps = require("gulp-sourcemaps");
const nodemon = require('gulp-nodemon');

const paths = { webroot: "./app/public/" };

paths.jsSrc = paths.webroot + "js/src/**/*.js";
paths.jsDest = paths.webroot + "js/";
paths.cssSrc = paths.webroot + "css/src/**/*.css";
paths.cssDest = paths.webroot + "css/";


gulp.task("minJs", () => {
	gulp.src(paths.webroot + "js/src/libs/**/*.js")
		.pipe(addsrc.append(paths.webroot + "js/src/app/**/*.js"))
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ["es2015"],
			ignore: "**/libs"
		}))
		.pipe(uglify())
		.on("error", (err) => { console.error(err.toString()); })
		.pipe(concat("app.min.js"))
		.pipe(sourcemaps.write("./maps"))
		.pipe(gulp.dest(paths.jsDest));
});

gulp.task("minCss", () => {
	gulp.src(paths.cssSrc)
		.pipe(cssmin())
		.pipe(concat("app.min.css"))
		.pipe(stripCssComments({ all: true }))
		.pipe(gulp.dest(paths.cssDest));
});

gulp.task("watch", () => {
    gulp.watch(paths.cssSrc, ["minCss"]);
    gulp.watch(paths.jsSrc, ["minJs"]);
});

//this is use for development => npm run dev OR gulp start
gulp.task('start', (done) => {
	gulp.watch(paths.cssSrc, ["minCss"]);
	gulp.watch(paths.jsSrc, ["minJs"]);

	nodemon({
		script: 'index.js',
		ext: 'js html',
		ignore: [
			"data/*",
			"app/public/*"
		],
		env: { 'ENVIRONMENT': 'DEV' },
		done: done
	});
});