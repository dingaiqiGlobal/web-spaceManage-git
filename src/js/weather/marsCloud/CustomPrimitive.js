/**
 * CustomPrimitive 类
 * 用于体积渲染的自定义图元，支持通过 3D 纹理实现体积数据的可视化
 * 实现了体积光线投射算法，可以渲染气象云、烟雾等体积数据
 */
import * as Cesium from 'cesium'
import { Texture3D } from "./Texture3D";

/**
 * 自定义图元类
 * 用于在Cesium中实现体积数据的光线投射渲染
 */
class CustomPrimitive {
	/**
	 * 构造函数
	 * @param {Object} options 图元选项
	 */
	constructor(options) {
		this.options = options;
		this.viewModel = {
			threshold: 65,
			detail: 1000,
			xCut: -0.5,
			yCut: -0.5,
			zCut: 0.5,
		};
		this.geometry = options.geometry;
		this.data = options.data;
		this.texture = null;

		// 初始化颜色
		const colors = options.colors ?? [
			"rgb(0,0,0,0)",
			"rgb(170,36,250)",
			"rgba(212,142,254,0.13)",
			"rgba(238,2,48,0.12)",
			"rgba(254,100,92,0.11)",
			"rgba(254,172,172,0.1)",
			"rgba(140,140,0,0.09)",
			"rgba(200,200,2,0.08)",
			"rgba(252,244,100,0.07)",
			"rgba(16,146,26,0.06)",
			"rgba(0,234,0,0.05)",
			"rgba(166,252,168,0.04)",
			"rgba(30,38,208,0.03)",
			"rgba(122,114,238,0.02)",
			"rgba(192,192,254,0.01)",
		];

		// 转换CSS颜色字符串为Cesium颜色对象
		const czmColor = [];
		colors.forEach((color) => {
			czmColor.push(Cesium.Color.fromCssColorString(color));
		});
		this.colors = czmColor;

		// 初始化步进值
		this.steps = options.steps || [];
		if (!this.steps || this.steps.length === 0) {
			let max = Number.MIN_VALUE;
			let min = Number.MAX_VALUE;
			for (let i = 0; i < this.data.values.length; i++) {
				max = Math.max(max, this.data.values[i]);
				min = Math.min(min, this.data.values[i]);
			}
			const colorsStep = this.colors.length - 1;
			const stepRate = (max - min) / colorsStep;
			this.steps = [];
			for (let i = 0; i < colorsStep; i++) {
				this.steps.push(min + i * stepRate);
			}
			this.steps[0] = 0;
		}

		// 计算区域边界
		const west_south = Cesium.Cartographic.fromDegrees(
			this.options.data.xmin,
			this.options.data.ymin,
			this.options.data.zmin
		);
		const east_north = Cesium.Cartographic.fromDegrees(
			this.options.data.xmax,
			this.options.data.ymax,
			this.options.data.zmax
		);
		const rectangle = Cesium.Rectangle.fromRadians(
			west_south.longitude,
			west_south.latitude,
			east_north.longitude,
			east_north.latitude
		);
		this._rectangle = rectangle;

		// 计算中心点
		const center = Cesium.Rectangle.center(rectangle);
		this.center = center;

		// 计算区域范围和距离
		const northeastCartesian = Cesium.Cartographic.toCartesian(
			Cesium.Rectangle.northeast(rectangle)
		);
		const northwestCartesian = Cesium.Cartographic.toCartesian(
			Cesium.Rectangle.northwest(rectangle)
		);
		const southeastCartesian = Cesium.Cartographic.toCartesian(
			Cesium.Rectangle.southeast(rectangle)
		);
		const east_west_distance = Cesium.Cartesian3.distance(
			northeastCartesian,
			northwestCartesian
		);
		const north_south_distance = Cesium.Cartesian3.distance(
			northeastCartesian,
			southeastCartesian
		);
		const av_height = (west_south.height + east_north.height) / 2;
		const centerCartesian = Cesium.Cartesian3.fromRadians(
			center.longitude,
			center.latitude,
			av_height
		);

		// 计算最大距离，用于包围球
		let maxDistance = Math.max(east_west_distance, north_south_distance);
		maxDistance = Math.max(maxDistance, av_height);

		// 创建模型矩阵
		const _local2world =
			Cesium.Transforms.eastNorthUpToFixedFrame(centerCartesian);
		const m = Cesium.Matrix4.fromScale(
			new Cesium.Cartesian3(
				east_west_distance,
				north_south_distance,
				av_height * 2
			),
			new Cesium.Matrix4()
		);

		// 初始化包围球和模型矩阵
		this.boundingSphere = new Cesium.BoundingSphere(
			centerCartesian,
			maxDistance
		);
		this.modelMatrix = Cesium.Matrix4.multiply(
			_local2world,
			m,
			_local2world
		);

		// 注意：初始化时不立即创建3D纹理，将在首次调用getTexture时创建

		// 销毁标志
		this._destroyed = false;
	}

	/**
	 * 创建绘制命令
	 * @param {Object} context WebGL上下文
	 */
	createCommand(context) {
		if (!Cesium.defined(this.geometry)) return;

		// 创建几何体
		const geometry = Cesium.BoxGeometry.createGeometry(this.geometry);
		const attributelocations =
			Cesium.GeometryPipeline.createAttributeLocations(geometry);

		// 创建顶点数组
		this.vertexarray = Cesium.VertexArray.fromGeometry({
			context: context,
			geometry: geometry,
			attributes: attributelocations,
		});

		// 创建渲染状态
		const renderstate = Cesium.RenderState.fromCache({
			depthTest: {
				enabled: true,
			},
			cull: {
				enabled: false,
			},
		});

		// 创建着色器程序
		const shaderProgram = Cesium.ShaderProgram.fromCache({
			context: context,
			vertexShaderSource: vertexShaderSource,
			fragmentShaderSource: fragmentShaderSource,
			attributeLocations: attributelocations,
		});

		// 创建uniform映射
		const uniformmap = {
			map: () => {
				return this.getTexture(context);
			},
			threshold: () => {
				return this.viewModel.threshold / 255.0;
			},
			detail: () => {
				return this.viewModel.detail;
			},
			xCut: () => {
				return this.viewModel.xCut;
			},
			yCut: () => {
				return this.viewModel.yCut;
			},
			zCut: () => {
				return this.viewModel.zCut;
			},
			colors: () => {
				return this.colors;
			},
			colorsKey: () => {
				return this.steps;
			},
		};

		// 创建绘制命令
		this.drawCommand = new Cesium.DrawCommand({
			boundingVolume: this.geometry.boundingSphere,
			modelMatrix: this.modelMatrix,
			pass: Cesium.Pass.TRANSLUCENT,
			shaderProgram: shaderProgram,
			renderState: renderstate,
			vertexArray: this.vertexarray,
			uniformMap: uniformmap,
		});
	}

	/**
	 * 获取或创建3D纹理
	 * @param {Object} context WebGL上下文
	 * @returns {Texture3D|null} 3D纹理对象
	 */
	getTexture(context) {
		if (!this.texture) {
			this.texture = new Texture3D({
				context: context,
				width: this.data.rows,
				height: this.data.cols,
				depth: this.data.heights,
				pixelFormat: Cesium.PixelFormat.ALPHA,
				pixelDataType: Cesium.PixelDatatype.UNSIGNED_BYTE,
				source: {
					width: this.data.rows,
					height: this.data.cols,
					depth: this.data.heights,
					arrayBufferView: new Uint8Array(this.data.values),
				},
				sampler: new Cesium.Sampler({
					minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
					magnificationFilter:
						Cesium.TextureMagnificationFilter.LINEAR,
				}),
			});
		}
		return this.texture;
	}

	/**
	 * 更新方法，每帧调用
	 * @param {Object} frameState 帧状态
	 */
	update(frameState) {
		if (this._destroyed) {
			return;
		}
		if (!this.drawCommand) {
			this.createCommand(frameState.context);
		}
		frameState.commandList.push(this.drawCommand);
	}

	/**
	 * 检查对象是否已被销毁
	 * @returns {boolean} 如果对象已被销毁则返回true，否则返回false
	 */
	isDestroyed() {
		return this._destroyed;
	}

	/**
	 * 销毁方法，释放所有WebGL资源
	 */
	destroy() {
		if (this._destroyed) {
			return;
		}
		// 销毁顶点数组
		if (this.vertexarray && !this.vertexarray.isDestroyed()) {
			this.vertexarray.destroy();
		}
		// 销毁着色器程序
		if (
			this.drawCommand &&
			this.drawCommand.shaderProgram &&
			!this.drawCommand.shaderProgram.isDestroyed()
		) {
			this.drawCommand.shaderProgram.destroy();
		}

		// 销毁纹理
		if (this.texture && !this.texture.isDestroyed()) {
			this.texture.destroy();
		}

		// 销毁绘制命令
		if (this.drawCommand) {
			this.drawCommand.shaderProgram = null;
			this.drawCommand.vertexArray = null;
			this.drawCommand.uniformMap = null;
		}

		// 清理引用
		this.vertexarray = null;
		this.drawCommand = null;
		this.texture = null;
		this.geometry = null;
		this.data = null;
		this.colors = null;
		this.steps = null;

		// 设置销毁标志
		this._destroyed = true;
		return Cesium.destroyObject(this);
	}
	/**
	 * 更改视图模型参数
	 * @param {Object} data 新的视图模型参数
	 */
	change(data) {
		if (this._destroyed) {
			return;
		}
		this.viewModel = { ...this.viewModel, ...data };
	}
}

// 体积渲染的片段着色器源码
const fragmentShaderSource = `
precision highp float;
precision highp sampler3D;

uniform sampler3D map;
uniform float threshold;
uniform float detail;
uniform float xCut;
uniform float yCut;
uniform float zCut;
uniform vec4 colors[15];
uniform float colorsKey[15];

in vec3 vOrigin;
in vec3 vDirection;

/**
 * 计算光线与立方体的交点
 * @param orig 光线起点
 * @param dir 光线方向
 * @return 进入点和离开点的距离
 */
vec2 hitBox(vec3 orig, vec3 dir) {
  const vec3 box_min = vec3(-0.5);
  const vec3 box_max = vec3(0.5);
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = (box_min - orig) * inv_dir;
  vec3 tmax_tmp = (box_max - orig) * inv_dir;
  vec3 tmin = min(tmin_tmp, tmax_tmp);
  vec3 tmax = max(tmin_tmp, tmax_tmp);
  float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  return vec2(t0, t1);
}

/**
 * 从3D纹理中采样
 * @param p 采样点坐标
 * @return 采样值
 */
float sampleMap(vec3 p) {
  return texture(map, p).a;
}

/**
 * 基于值获取对应的颜色
 * @param value 体积数据值，范围 0.0-1.0
 * @return 对应的颜色，包含透明度
 */
vec4 getColor(float value) {
  float originalValue = value * 255.0;
  vec4 color1 = vec4(0.0);
  vec4 color2 = vec4(0.0);
  float key1 = 0.0;
  float key2 = 0.0;

  // 计算当前值在哪一个区间
  for(int i = 0; i < 15; i++) {
    // 获取到最小的大于当前值的位置
    if(originalValue < colorsKey[i]) {
      // 如果是第一位，则无法插值
      if(i == 0) {
        break;
      }

      key1 = colorsKey[i - 1];
      key2 = colorsKey[i];
      color1 = colors[i - 1];
      color2 = colors[i];
      break;
    }
  }

  // 确定两个颜色区间之间的混合程度
  float mixValue = (originalValue - key1) / (key2 - key1);

  // 计算当前颜色
  vec4 finalColor = mix(color1, color2, mixValue);

  return finalColor;
}

/**
 * Alpha混合
 * @param color1 前景色
 * @param color2 背景色
 * @return 混合后的颜色
 */
vec4 alphaBlending(vec4 color1, vec4 color2) {
  float a1 = color1.a;
  float a2 = color2.a;
  float a = 1.0 - (1.0 - a1) * (1.0 - a2);

  float R = (a1 * color1.r + (1.0 - a1) * a2 * color2.r) / a;
  float G = (a1 * color1.g + (1.0 - a1) * a2 * color2.g) / a;
  float B = (a1 * color1.b + (1.0 - a1) * a2 * color2.b) / a;

  return vec4(R, G, B, a);
}

void main() {
  // 初始化色带
  vec4 color = vec4(0.0);
  vec3 rayDir = normalize(vDirection);
  vec2 bounds = hitBox(vOrigin, rayDir);

  if(bounds.x > bounds.y)
    discard;

  bounds.x = max(bounds.x, 0.0);
  vec3 p = vOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs(rayDir);
  float delta = min(inc.x, min(inc.y, inc.z));
  delta /= detail;

  // 执行光线投射
  for(float t = bounds.x; t < bounds.y; t += delta) {
    if(p.x > xCut && p.y > yCut && p.z < zCut) {
      float value = sampleMap(p + 0.5);
      if(value < threshold) {
        if(color.a >= 1.0) {
          break;
        }
        color = alphaBlending(color, getColor(value));
      }
    }

    p += rayDir * delta;
  }
  out_FragColor = color;
}
`;

// 顶点着色器源码
const vertexShaderSource = `
in vec3 position;
in vec2 st;

out vec3 vOrigin;
out vec3 vDirection;
out vec2 vst;

void main()
{    
    vOrigin = czm_encodedCameraPositionMCHigh+czm_encodedCameraPositionMCLow;
    vDirection=position-vOrigin;
    vst=st;

    gl_Position = czm_modelViewProjection * vec4(position,1.0);
}
`;

export default CustomPrimitive;
