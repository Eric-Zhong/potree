
# 关于

PotreeConverter 生成一个八叉树 LOD 结构，用于流式传输和实时渲染大规模点云。结果可以在网页浏览器中使用 [Potree](https://github.com/potree/potree) 查看，或作为桌面应用程序使用 [PotreeDesktop](https://github.com/potree/PotreeDesktop)。

版本 2.0 是一次完整的重写，与之前的版本 1.7 有以下不同：

* 在 SSD 上比 PotreeConverter 1.7 快约 10 到 50 倍。
* 生成总共 3 个文件，而不是成千上万到数千万个文件。文件数量的减少改善了文件系统操作，例如复制、删除和上传到服务器，从几个小时和几天缩短到几秒和几分钟。
* 更好地支持标准 LAS 属性和任意额外属性。完整支持（例如 int64 和 uint64）正在开发中。
* 新转换器尚未提供可选压缩，但在未来更新的路线图上。

尽管转换器在版本 2.0 上迈出了重大一步，但它生成的格式也被 Potree 1.7 支持。Potree 查看器计划在 2021 年进行重大升级，重写为 WebGPU。

# 发表的文章

* [Potree: 在网页浏览器中渲染大型点云](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf)
* [大规模点云的快速外部八叉树生成](https://www.cg.tuwien.ac.at/research/publications/2020/SCHUETZ-2020-MPC/)，_Schütz M.，Ohrhallinger S.，Wimmer M._

# 开始使用

1. 下载 Windows 二进制文件或
    * 下载源代码
	* 安装 [CMake](https://cmake.org/) 3.16 或更高版本
	* 创建并进入文件夹 "build"
	    ```
	    mkdir build
	    cd build
	    ```
	* 运行 
	    ```
	    cmake ../
	    ```
	* 在 Linux 上，运行: ```make```
	* 在 Windows 上，打开 Visual Studio 2019 项目 ./Converter/Converter.sln 并在发布模式下编译
2. 运行 ```PotreeConverter.exe <input> -o <outputDir>```
    * 可选地指定采样策略：
	* 泊松盘采样（默认）： ```PotreeConverter.exe <input> -o <outputDir> -m poisson```
	* 随机采样： ```PotreeConverter.exe <input> -o <outputDir> -m random```

在 Potree 中，修改其中一个示例，使用以下加载命令：

```javascript
let url = "../pointclouds/D/temp/test/metadata.json";
Potree.loadPointCloud(url).then(e => {
	let pointcloud = e.pointcloud;
	let material = pointcloud.material;

	material.activeAttributeName = "rgba";
	material.minSize = 2;
	material.pointSizeType = Potree.PointSizeType.ADAPTIVE;

	viewer.scene.addPointCloud(pointcloud);
	viewer.fitToScreen();
});
```

# 替代方案

PotreeConverter 2.0 生成的格式与之前的版本非常不同。如果您发现问题，仍然可以尝试以前的转换器或替代方案：

<table>
	<tr>
		<th></th>
		<th>PotreeConverter 2.0</th>
		<th><a href="https://github.com/potree/PotreeConverter/releases/tag/1.7">PotreeConverter 1.7</a></th>
		<th><a href="https://entwine.io/">Entwine</a></th>
	</tr>
	<tr>
		<th>许可证</th>
		<td>
			免费，BSD 2-clause
		</td>
		<td>
			免费，BSD 2-clause
		</td>
		<td>
			免费，LGPL
		</td>
	</tr>
	<tr>
		<th>#生成的文件</th>
		<td>
			总共 3 个文件
		</td>
		<td>
			每个节点 1 个
		</td>
		<td>
			每个节点 1 个
		</td>
	</tr>
	<tr>
		<th>压缩</th>
		<td>
			无（TODO）
		</td>
		<td>
			LAZ（可选）
		</td>
		<td>
			LAZ
		</td>
	</tr>
</table>

性能比较（Ryzen 2700，NVMe SSD）：

![](./docs/images/performance_chart.png)

# 许可证 

PotreeConverter 在 [BSD 2-clause 许可证](./LICENSE) 下提供。