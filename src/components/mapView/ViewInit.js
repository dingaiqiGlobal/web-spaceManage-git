import * as Cesium from 'cesium'
let ViewInit = {
  regionCode: '130900', //行政区code
  handler: null,
  popup: null, //弹框
  viewer: null,
  init() {
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0ZjI1YWYwNS00ODJiLTQzOTYtYTA3My0zMzI3ODFiZTdkYzAiLCJpZCI6MjAzOTgsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NzczNDAzMjN9.s1TyB5DYncqM_xAF-ekua_P4fcZmmyeVR4hA9ec9G4Q'
    this.viewer = new Cesium.Viewer('cesiumContainer', {
      scene3DOnly: true, //当 true 时，每个几何实例将仅以 3D 呈现以节省 GPU 内存。
      homeButton: false, // 是否显示home控件
      vrButton: false, //VR
      fullscreenButton: true, //全屏
      geocoder: false, // 是否显示地名查找控件
      sceneModePicker: false, // 是否显示投影方式控件
      navigationHelpButton: false, // 是否显示帮助信息控件
      infoBox: false, // 是否显示点击要素之后显示的信息
      baseLayerPicker: false, // 是否显示图层选择控件
      selectionIndicator: false, // Disable selection indicator
      timeline: true, // 是否显示时间线控件
      animation: true, // 是否显示动画控件
      shouldAnimate: true,
      // contextOptions: {
      //   //WebGL
      //   requestWebgl1: false,
      //   allowTextureFilterAnisotropic: true, //允许纹理过滤器各向异性
      //   webgl: {
      //     alpha: false,
      //     depth: true, //深度
      //     stencil: false, //钢印
      //     antialias: true, //抗锯齿
      //     powerPreference: 'high-performance', //权值偏好
      //     premultipliedAlpha: true, //预乘Alpha
      //     preserveDrawingBuffer: false, //保留绘制缓冲
      //     failIfMajorPerformanceCaveat: false, //警告
      //   },
      // },
      // requestRenderMode: true, //显示渲染模式-慎用---影响性能
      // maximumRenderTimeChange: Infinity, //最大渲染时间更改与requestRenderMode成对出现
    })
    /**
     * 基础设置
     */
    this.viewer._cesiumWidget._creditContainer.style.display = 'none' //版权信息
    this.viewer.animation.container.style.visibility = 'hidden' // 不显示动画控件
    this.viewer.timeline.container.style.visibility = 'hidden' // 不显示时间控件
    this.viewer.scene.debugShowFramesPerSecond = false //帧率
    this.viewer.resolutionScale = 1.0 //分辨率
    this.viewer.scene.msaaSamples = 4 //MSAA样本
    /**
     * 场景设置
     */
    this.viewer.postProcessStages.fxaa.enabled = true //后期处理-抗锯齿
    this.viewer.scene.globe.depthTestAgainstTerrain = false //深度检测
    this.viewer.scene.globe.enableLighting = false //场景光
    this.viewer.shadows = false //阴影

    this.viewer.scene.sun.show = false //太阳;
    this.viewer.scene.moon.show = false //月亮
    this.viewer.scene.skyAtmosphere.show = false //大气
    this.viewer.scene.globe.showGroundAtmosphere = false //地面大气
    this.viewer.scene.fog.enable = false //雾

    this.viewer.scene.undergroundMode = false //地下模式

    /**
     * 位置
     */
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.84501, 38.30388, 100000.0),
      // orientation: {
      //   heading: Cesium.Math.toRadians(293.663552),
      //   pitch: Cesium.Math.toRadians(-22.6179579),
      //   roll: Cesium.Math.toRadians(0.001378789),
      // },
    })
    /**
     * 地形
     */
    // const terrainProvider = new Cesium.CesiumTerrainProvider({
    //   requestWaterMask: false, //请求水体效果所需要的海岸线数据
    //   requestVertexNormals: false, //请求地形照明数据
    // })
    // this.viewer.terrainProvider = terrainProvider

    /**
     * 屏幕坐标控制
     */
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
    /**
     *鼠标移动
     */
    this.handler.setInputAction((movement) => {
      let pickedFeature = this.viewer.scene.pick(movement.endPosition)
      if (pickedFeature) {
        this.viewer.enableCursorStyle = false
        this.viewer._element.style.cursor = ''
        document.documentElement.style.cursor = 'pointer'
      } else {
        this.viewer.enableCursorStyle = true
        document.documentElement.style.cursor = ''
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  },
}
export default ViewInit
