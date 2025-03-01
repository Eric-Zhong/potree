// 导入THREE.js库
import * as THREE from "../../../libs/three.js/build/three.module.js";
// 导入事件调度器
import { EventDispatcher } from "../../EventDispatcher.js";
// 导入文本精灵
import { TextSprite } from "../../TextSprite.js";

// TODO: xz, 用这个修改显示360时的标识体
// 创建球体几何体
let sg = new THREE.SphereGeometry(0.2, 8, 8);
// 创建高分辨率球体几何体
let sgHigh = new THREE.SphereGeometry(1, 128, 128);

// 创建基本材质
let sm = new THREE.MeshBasicMaterial({
	side: THREE.BackSide,
	color: 0xffffff,
});
let sphereSignMaterial = new THREE.MeshBasicMaterial({
	side: THREE.BackSide,
	// color: 0xDBD55D,
	color: 0x00ff00,
});
// 创建悬停时的材质
let smHovered = new THREE.MeshBasicMaterial({
	side: THREE.BackSide,
	color: 0xff0000,
});

// 创建射线投射器
let raycaster = new THREE.Raycaster();
// 当前悬停的对象
let currentlyHovered = null;

// 记录之前的视图状态
let previousView = {
	controls: null,
	position: null,
	target: null,
	pointcloud_visible: {},
};

// 定义360度图像类
class Image360 {
	constructor(file, time, longitude, latitude, altitude, course, pitch, roll) {
		// 初始化图像属性
		this.file = file; // 文件路径
		this.time = time; // 时间
		this.longitude = longitude; // 经度
		this.latitude = latitude; // 纬度
		this.altitude = altitude; // 高度
		this.course = course; // 航向
		this.pitch = pitch; // 俯仰
		this.roll = roll; // 翻滚
		this.mesh = null; // 3D网格
	}
};

// 定义360度图像管理类
export class Images360 extends EventDispatcher {
	constructor(viewer) {
		super(); // 调用父类构造函数

		this.viewer = viewer; // 视图对象

		this.selectingEnabled = true; // 选择功能是否启用

		this.images = []; // 存储图像的数组
		this.node = new THREE.Object3D(); // 创建3D对象

		// 创建高分辨率球体并设置属性
		this.sphere = new THREE.Mesh(sgHigh, sm);
		this.sphere.visible = false; // 初始不可见
		this.sphere.scale.set(1000, 1000, 1000); // 设置缩放
		this.node.add(this.sphere); // 将球体添加到节点
		this._visible = true; // 可见性状态
		// this.node.add(label); // 添加标签（注释掉）

		this.focusedImage = null; // 当前聚焦的图像

		// 创建“取消聚焦”按钮
		let elUnfocus = document.createElement("input");
		elUnfocus.type = "button"; // 设置为按钮
		elUnfocus.value = "退出全景"; // "unfocus"; // 按钮文本
		elUnfocus.style.position = "absolute"; // 绝对定位
		// elUnfocus.style.right = "10px"; // 右边距
		elUnfocus.style.left = "10px"; // 左边距
		elUnfocus.style.bottom = "10px"; // 下边距
		elUnfocus.style.zIndex = "10000"; // 设置层级
		elUnfocus.style.fontSize = "2em"; // 字体大小
		elUnfocus.addEventListener("click", () => this.unfocus()); // 点击事件
		this.elUnfocus = elUnfocus; // 保存按钮引用

		this.domRoot = viewer.renderer.domElement.parentElement; // 获取DOM根元素
		this.domRoot.appendChild(elUnfocus); // 将按钮添加到DOM
		this.elUnfocus.style.display = "none"; // 初始隐藏按钮

		// 监听视图更新事件
		viewer.addEventListener("update", () => {
			this.update(viewer); // 更新视图
		});

		viewer.inputHandler.addInputListener(this); // 添加输入监听器

		// 监听鼠标按下事件
		this.addEventListener("mousedown", () => {
			if (currentlyHovered && currentlyHovered.image360) {
				this.focus(currentlyHovered.image360); // 聚焦当前悬停的图像
			}
		});
	};

	// 设置可见性
	set visible(visible) {
		if (this._visible === visible) {
			return; // 如果状态未改变，返回
		}

		// 更新图像的可见性
		for (const image of this.images) {
			image.mesh.visible = visible && (this.focusedImage == null);
		}

		this.sphere.visible = visible && (this.focusedImage != null); // 更新球体可见性
		this._visible = visible; // 更新可见性状态
		this.dispatchEvent({
			type: "visibility_changed", // 触发可见性变化事件
			images: this,
		});
	}

	// 获取可见性
	get visible() {
		return this._visible; // 返回可见性状态
	}

	// 聚焦指定的图像
	focus(image360) {
		if (this.focusedImage !== null) {
			this.unfocus(); // 如果已有聚焦图像，取消聚焦
		}

		// 点云的显示状态
		let pointcloud_visible_status = {};
		this.viewer.scene.pointclouds.map((pc)=>{
			pointcloud_visible_status[pc.name] = pc.visible;
		});

		// 保存当前视图状态
		previousView = {
			controls: this.viewer.controls,
			position: this.viewer.scene.view.position.clone(),
			target: viewer.scene.view.getPivot(),
			pointcloud_visible: pointcloud_visible_status,
		};

		this.viewer.setControls(this.viewer.orbitControls); // 设置控制器
		this.viewer.orbitControls.doubleClockZoomEnabled = false; // 禁用双击缩放

		// 隐藏所有图像
		for (let image of this.images) {
			image.mesh.visible = false;
		}

		this.selectingEnabled = false; // 禁用选择功能

		this.sphere.visible = false; // 隐藏球体

		this.sphere.material = sm;

		// 加载图像并更新球体材质
		this.load(image360).then(() => {
			this.sphere.visible = true; // 显示球体
			this.sphere.material.map = image360.texture; // 设置材质纹理
			this.sphere.material.needsUpdate = true; // 标记材质需要更新
		});

		{ // 设置球体的朝向
			let { course, pitch, roll } = image360; // 解构图像属性
			this.sphere.rotation.set(
				THREE.Math.degToRad(+roll + 90), // 设置翻滚
				THREE.Math.degToRad(-pitch), // 设置俯仰
				THREE.Math.degToRad(-course + 90), // 设置航向
				"ZYX" // 设置旋转顺序
			);
		}

		this.sphere.position.set(...image360.position); // 设置球体位置

		let target = new THREE.Vector3(...image360.position); // 创建目标向量
		let dir = target.clone().sub(viewer.scene.view.position).normalize(); // 计算方向
		let move = dir.multiplyScalar(0.000001); // 计算移动量
		let newCamPos = target.clone().sub(move); // 计算新相机位置

		// 设置视图
		viewer.scene.view.setView(
			newCamPos,
			target,
			500 // 设置视距
		);

		this.focusedImage = image360; // 设置聚焦图像

		this.elUnfocus.style.display = ""; // 显示取消聚焦按钮

		// TODO: xuzhong 增加隐藏点云
		if (this.viewer.scene.pointclouds) {
			this.viewer.scene.pointclouds.map((pc) => {
				pc.visible = false;
			});
		}
	}

	// 取消聚焦
	unfocus() {
		this.selectingEnabled = true; // 启用选择功能

		// 显示所有图像
		for (let image of this.images) {
			image.mesh.visible = true;
		}

		let image = this.focusedImage; // 获取当前聚焦图像

		if (image === null) {
			return; // 如果没有聚焦图像，返回
		}

		// 清除球体材质
		this.sphere.material.map = null;
		this.sphere.material.needsUpdate = true; // 标记材质需要更新
		this.sphere.visible = false; // 隐藏球体

		let pos = viewer.scene.view.position; // 获取当前视点位置
		let target = viewer.scene.view.getPivot(); // 获取目标位置
		let dir = target.clone().sub(pos).normalize(); // 计算方向
		let move = dir.multiplyScalar(10); // 计算移动量
		let newCamPos = target.clone().sub(move); // 计算新相机位置

		this.viewer.orbitControls.doubleClockZoomEnabled = true; // 启用双击缩放
		this.viewer.setControls(previousView.controls); // 恢复之前的控制器

		// 设置视图
		viewer.scene.view.setView(
			previousView.position,
			previousView.target,
			500 // 设置视距
		);

		this.focusedImage = null; // 清除聚焦图像

		this.elUnfocus.style.display = "none"; // 隐藏取消聚焦按钮

		// TODO: xuzhong 恢复显示点云
		if (this.viewer.scene.pointclouds) {
			this.viewer.scene.pointclouds.map((pc) => {
				pc.visible = previousView.pointcloud_visible[pc.name];
			});
		}
	}

	// 加载图像
	load(image360) {
		return new Promise(resolve => {
			let texture = new THREE.TextureLoader().load(image360.file, resolve); // 加载纹理
			texture.wrapS = THREE.RepeatWrapping; // 设置纹理重复方式
			texture.repeat.x = -1; // 反转纹理重复

			image360.texture = texture; // 保存纹理到图像对象
		});
	}

	// 处理悬停事件
	handleHovering() {
		let mouse = viewer.inputHandler.mouse; // 获取鼠标位置
		let camera = viewer.scene.getActiveCamera(); // 获取活动相机
		let domElement = viewer.renderer.domElement; // 获取DOM元素

		// 将鼠标位置转换为射线
		let ray = Potree.Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

		// 复制射线
		raycaster.ray.copy(ray);
		let intersections = raycaster.intersectObjects(this.node.children); // 检测与子对象的交集

		if (intersections.length === 0) {
			// label.visible = false; // 如果没有交集，隐藏标签（注释掉）
			return; // 返回
		}

		let intersection = intersections[0]; // 获取第一个交集
		currentlyHovered = intersection.object; // 设置当前悬停对象
		currentlyHovered.material = smHovered; // 设置悬停材质

		// label.visible = true; // 显示标签（注释掉）
		// label.setText(currentlyHovered.image360.file); // 设置标签文本（注释掉）
		// currentlyHovered.getWorldPosition(label.position); // 获取标签位置（注释掉）
	}

	// 更新方法
	update() {
		let { viewer } = this; // 解构视图对象

		if (currentlyHovered) {
			currentlyHovered.material = sphereSignMaterial; // 恢复材质
			currentlyHovered = null; // 清除当前悬停对象
		}

		if (this.selectingEnabled) {
			this.handleHovering(); // 处理悬停
		}
	}
};

// 定义360度图像加载器类
export class Images360Loader {
	static async load(url, viewer, params = {}) {
		if (!params.transform) {
			params.transform = {
				forward: a => a, // 默认变换函数
			};
		}

		let response = await fetch(`${url}/coordinates.txt`); // 获取坐标文件
		let text = await response.text(); // 读取文本内容

		let lines = text.split(/\r?\n/); // 按行分割
		let coordinateLines = lines.slice(1); // 获取坐标行

		let images360 = new Images360(viewer); // 创建360度图像实例

		for (let line of coordinateLines) {
			if (line.trim().length === 0) {
				continue; // 跳过空行
			}

			let tokens = line.split(/\t/); // 按制表符分割行

			let [filename, time, long, lat, alt, course, pitch, roll] = tokens; // 解构参数
			time = parseFloat(time); // 转换时间为浮点数
			long = parseFloat(long); // 转换经度为浮点数
			lat = parseFloat(lat); // 转换纬度为浮点数
			alt = parseFloat(alt); // 转换高度为浮点数
			course = parseFloat(course); // 转换航向为浮点数
			pitch = parseFloat(pitch); // 转换俯仰为浮点数
			roll = parseFloat(roll); // 转换翻滚为浮点数

			filename = filename.replace(/"/g, ""); // 去除文件名中的引号
			let file = `${url}/${filename}`; // 构建文件路径

			let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll); // 创建图像实例

			let xy = params.transform.forward([long, lat]); // 转换坐标
			let position = [...xy, alt]; // 构建位置数组
			image360.position = position; // 设置图像位置

			images360.images.push(image360); // 将图像添加到数组
		}

		Images360Loader.createSceneNodes(images360, params.transform); // 创建场景节点

		return images360; // 返回图像实例
	}

	static async load_OmegaPhiKappa(url, viewer, params = {}) {
		if (!params.transform) {
			params.transform = {
				forward: a => a, // 默认变换函数
			};
		}

		let response = await fetch(`${url}/coordinates.txt`); // 获取坐标文件
		let text = await response.text(); // 读取文本内容

		let lines = text.split(/\r?\n/); // 按行分割
		let coordinateLines = lines.slice(1); // 获取坐标行

		let images360 = new Images360(viewer); // 创建360度图像实例

		for (let line of coordinateLines) {
			if (line.trim().length === 0) {
				continue; // 跳过空行
			}

			let tokens = line.split(/[\t,]/); // 按制表符分割行
			let [PhotoID, X, Y, Z, Omega, Phi, Kappa, r11, r12, r13, r21, r22, r23, r31, r32, r33] = tokens; // 解构参数

			let frame = PhotoID.slice(-6);
			let _time_ = parseFloat(frame) / 24;

			let [filename, time, long, lat, alt, course, pitch, roll] = [PhotoID + '.jpg', _time_, X, Y, Z, Omega, Phi, Kappa]; // 解构参数

			time = parseFloat(time); // 转换时间为浮点数
			long = parseFloat(long); // 转换经度为浮点数
			lat = parseFloat(lat); // 转换纬度为浮点数
			alt = parseFloat(alt); // 转换高度为浮点数
			course = parseFloat(course); // 转换航向为浮点数
			pitch = parseFloat(pitch); // 转换俯仰为浮点数
			roll = parseFloat(roll); // 转换翻滚为浮点数

			filename = filename.replace(/"/g, ""); // 去除文件名中的引号
			let file = `${url}/${filename}`; // 构建文件路径
			let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll); // 创建图像实例
			let xy = params.transform.forward([long, lat]); // 转换坐标
			let position = [...xy, alt]; // 构建位置数组
			image360.position = position; // 设置图像位置
			images360.images.push(image360); // 将图像添加到数组
		}

		Images360Loader.createSceneNodes(images360, params.transform); // 创建场景节点

		return images360; // 返回图像实例
	}
	
	static async load_dataframe(url, viewer, params = {}) {
		if (!params.transform) {
			params.transform = {
				forward: a => a, // 默认变换函数
			};
		}

		let response = await fetch(`${url}`); // 获取坐标文件
		let text = await response.text(); // 读取文本内容

		let lines = text.split(/\r?\n/); // 按行分割
		let coordinateLines = lines.slice(1); // 跳过前面的行

		let images360 = new Images360(viewer); // 创建360度图像实例

		for (let line of coordinateLines) {
			if (line.trim().length === 0) {
				continue; // 跳过空行
			}

			let tokens = line.split(','); // 按制表符分割行
			let [PhotoID, X, Y, Z, Omega, Phi, Kappa, r11, r12, r13, r21, r22, r23, r31, r32, r33] = tokens; // 解构参数

			// PhotoID = `VID_20250107_103505_00_023.mp4.${frame}.0000`
			let frame = PhotoID.slice(-10, -4); // 提取结尾处的 000000
			let _time_ = parseFloat(frame) / 24;

			let [filename, time, long, lat, alt, course, pitch, roll] = [PhotoID + '.jpg', _time_, X, Y, Z, Omega, Phi, Kappa]; // 解构参数

			time = parseFloat(time); // 转换时间为浮点数
			long = parseFloat(long); // 转换经度为浮点数
			lat = parseFloat(lat); // 转换纬度为浮点数
			alt = parseFloat(alt); // 转换高度为浮点数
			course = parseFloat(course); // 转换航向为浮点数
			pitch = parseFloat(pitch); // 转换俯仰为浮点数
			roll = parseFloat(roll); // 转换翻滚为浮点数

			filename = filename.replace(/"/g, ""); // 去除文件名中的引号
			let file = `${url}/${filename}`; // 构建文件路径

			let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll); // 创建图像实例

			let xy = params.transform.forward([long, lat]); // 转换坐标
			let position = [...xy, alt]; // 构建位置数组
			image360.position = position; // 设置图像位置

			images360.images.push(image360); // 将图像添加到数组
		}

		Images360Loader.createSceneNodes(images360, params.transform); // 创建场景节点

		return images360; // 返回图像实例
	}
	
	static createSceneNodes(images360, transform) {
		for (let image360 of images360.images) {
			let { longitude, latitude, altitude } = image360; // 解构图像属性
			let xy = transform.forward([longitude, latitude]); // 转换坐标

			let mesh = new THREE.Mesh(sg, sphereSignMaterial); // 创建网格
			mesh.position.set(...xy, altitude); // 设置网格位置
			mesh.scale.set(1, 1, 1); // 设置网格缩放
			mesh.material.transparent = true; // 设置材质为透明
			mesh.material.opacity = 0.75; // 设置材质不透明度
			mesh.image360 = image360; // 关联图像对象

			{ // 设置网格的朝向
				var { course, pitch, roll } = image360; // 解构图像属性
				mesh.rotation.set(
					THREE.Math.degToRad(+roll + 90), // 设置翻滚
					THREE.Math.degToRad(-pitch), // 设置俯仰
					THREE.Math.degToRad(-course + 90), // 设置航向
					"ZYX" // 设置旋转顺序
				);
			}

			images360.node.add(mesh); // 将网格添加到节点

			image360.mesh = mesh; // 保存网格到图像对象
		}
	}
};