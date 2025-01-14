// 引入所需的模块
const path = require('path'); // 用于处理文件和目录路径
const gulp = require('gulp'); // Gulp的核心模块
const exec = require('child_process').exec; // 用于执行子进程命令

const fs = require("fs"); // 文件系统模块
const fsp = fs.promises; // 文件系统的Promise版本
const concat = require('gulp-concat'); // 用于连接文件
const connect = require('gulp-connect'); // 用于创建开发服务器
const {watch} = gulp; // 从Gulp中解构出watch方法

// 引入自定义工具函数
const {createExamplesPage} = require("./src/tools/create_potree_page"); // 创建示例页面的函数
const {createGithubPage} = require("./src/tools/create_github_page"); // 创建GitHub页面的函数
const {createIconsPage} = require("./src/tools/create_icons_page"); // 创建图标页面的函数

// 定义文件路径
let paths = {
	laslaz: [ // LASLAZ工作者的文件路径
		"build/workers/laslaz-worker.js",
		"build/workers/lasdecoder-worker.js",
	],
	html: [ // HTML文件的路径
		"src/viewer/potree.css",
		"src/viewer/sidebar.html",
		"src/viewer/profile.html"
	],
	resources: [ // 资源文件的路径
		"resources/**/*"
	]
};

// 定义工作者文件
let workers = {
	"LASLAZWorker": [ // LASLAZ工作者的文件路径
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	"LASDecoderWorker": [ // LAS解码工作者的文件路径
		"src/workers/LASDecoderWorker.js"
	],
	"EptLaszipDecoderWorker": [ // EPT Laszip解码工作者的文件路径
		"libs/copc/index.js",
		"src/workers/EptLaszipDecoderWorker.js",
	],
	"EptBinaryDecoderWorker": [ // EPT二进制解码工作者的文件路径
		"libs/ept/ParseBuffer.js",
		"src/workers/EptBinaryDecoderWorker.js"
	],
	"EptZstandardDecoderWorker": [ // EPT Zstandard解码工作者的文件路径
		"src/workers/EptZstandardDecoder_preamble.js",
		'libs/zstd-codec/bundle.js',
		"libs/ept/ParseBuffer.js",
		"src/workers/EptZstandardDecoderWorker.js"
	]
};

// 懒加载库的配置
let lazyLibs = {
	"geopackage": "libs/geopackage", // 地理数据包库的路径
	"sql.js": "libs/sql.js" // SQL.js库的路径
};

// 着色器文件的路径
let shaders = [
	"src/materials/shaders/pointcloud.vs", // 点云着色器的顶点着色器
	"src/materials/shaders/pointcloud.fs", // 点云着色器的片段着色器
	"src/materials/shaders/pointcloud_sm.vs", // 点云着色器的缩小版顶点着色器
	"src/materials/shaders/pointcloud_sm.fs", // 点云着色器的缩小版片段着色器
	"src/materials/shaders/normalize.vs", // 归一化着色器的顶点着色器
	"src/materials/shaders/normalize.fs", // 归一化着色器的片段着色器
	"src/materials/shaders/normalize_and_edl.fs", // 归一化和EDL着色器的片段着色器
	"src/materials/shaders/edl.vs", // EDL着色器的顶点着色器
	"src/materials/shaders/edl.fs", // EDL着色器的片段着色器
	"src/materials/shaders/blur.vs", // 模糊着色器的顶点着色器
	"src/materials/shaders/blur.fs", // 模糊着色器的片段着色器
];

// 定义webserver任务
gulp.task('webserver', gulp.series(async function() {
	server = connect.server({ // 创建一个连接服务器
		port: 1234, // 服务器端口
		https: false, // 是否启用HTTPS
	});
}));

// 定义示例页面任务
gulp.task('examples_page', async function(done) {
	await Promise.all([ // 并行执行创建示例页面和GitHub页面的任务
		createExamplesPage(),
		createGithubPage(),
	]);

	done(); // 完成任务
});

// 定义图标查看器任务
gulp.task('icons_viewer', async function(done) {
	await createIconsPage(); // 创建图标页面

	done(); // 完成任务
});

// 定义测试任务
gulp.task('test', async function() {
	console.log("asdfiae8ofh"); // 输出测试信息
});

// 定义工作者任务
gulp.task("workers", async function(done){
	for(let workerName of Object.keys(workers)){ // 遍历所有工作者
		gulp.src(workers[workerName]) // 获取工作者文件
			.pipe(concat(`${workerName}.js`)) // 连接文件
			.pipe(gulp.dest('build/potree/workers')); // 输出到指定目录
	}

	gulp.src('./libs/copc/laz-perf.wasm') // 处理WASM文件
		.pipe(gulp.dest('./build/potree/workers')); // 输出到指定目录

	done(); // 完成任务
});

// 定义懒加载库任务
gulp.task("lazylibs", async function(done){
	for(let libname of Object.keys(lazyLibs)){ // 遍历所有懒加载库
		const libpath = lazyLibs[libname]; // 获取库路径

		gulp.src([`${libpath}/**/*`]) // 获取库文件
			.pipe(gulp.dest(`build/potree/lazylibs/${libname}`)); // 输出到指定目录
	}

	done(); // 完成任务
});

// 定义着色器任务
gulp.task("shaders", async function(){
	const components = [
		"let Shaders = {}; " // 初始化着色器对象
	];

	for(let file of shaders){ // 遍历所有着色器文件
		const filename = path.basename(file); // 获取文件名

		const content = await fsp.readFile(file); // 读取文件内容

		const prep = `Shaders["${filename}"] = \`${content}\``; // 将内容添加到着色器对象

		components.push(prep); // 添加到组件数组
	}

	components.push("export {Shaders};"); // 导出着色器对象

	const content = components.join("\n\n"); // 连接所有组件

	const targetPath = `./build/shaders/shaders.js`; // 目标路径

	if(!fs.existsSync("build/shaders")){ // 检查目标目录是否存在
		fs.mkdirSync("build/shaders"); // 创建目标目录
	}
	fs.writeFileSync(targetPath, content, {flag: "w"}); // 写入文件
});

// 定义构建任务
gulp.task('build', 
	gulp.series( // 串行执行任务
		gulp.parallel("workers", "lazylibs", "shaders", "icons_viewer", "examples_page"), // 并行执行多个任务
		async function(done){
			gulp.src(paths.html).pipe(gulp.dest('build/potree')); // 输出HTML文件

			gulp.src(paths.resources).pipe(gulp.dest('build/potree/resources')); // 输出资源文件

			gulp.src(["LICENSE"]).pipe(gulp.dest('build/potree')); // 输出许可证文件

			done(); // 完成任务
		}
	)
);

// 定义打包任务
gulp.task("pack", async function(){
	exec('rollup -c', function (err, stdout, stderr) { // 执行Rollup打包命令
		console.log(stdout); // 输出标准输出
		console.log(stderr); // 输出错误输出
	});
});

// 定义监视任务
gulp.task('watch', gulp.parallel("build", "pack", "webserver", async function() {
	let watchlist = [ // 监视的文件列表
		'src/**/*.js', // 监视所有JS文件
		'src/**/**/*.js', // 监视所有子目录中的JS文件
		'src/**/*.css', // 监视所有CSS文件
		'src/**/*.html', // 监视所有HTML文件
		'src/**/*.vs', // 监视所有顶点着色器文件
		'src/**/*.fs', // 监视所有片段着色器文件
		'resources/**/*', // 监视所有资源文件
		'examples//**/*.json', // 监视所有示例JSON文件
		'!resources/icons/index.html', // 排除特定文件
	];

	watch(watchlist, gulp.series("build", "pack")); // 监视文件变化并执行构建和打包任务
}));