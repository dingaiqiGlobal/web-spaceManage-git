<template>
  <div class="layer-tree">
    <!-- 头部 -->
    <el-header class="layer-tree__header">
      <span class="layer-tree__title">基础图层</span>
      <el-icon class="layer-tree__close-icon" @click="handleClose">
        <el-icon-Close />
      </el-icon>
    </el-header>

    <!-- 主体内容 -->
    <el-main class="layer-tree__main">
      <!-- 全局loading遮罩 -->
      <div v-if="isGlobalLoading" class="global-loading">
        <el-icon class="loading-icon"><el-icon-Loading /></el-icon>
        <span>正在加载图层...</span>
      </div>

      <!-- 图层树 -->
      <el-tree
        ref="treeRef"
        :data="buildLayerData"
        :props="treeProps"
        :default-expanded-keys="defaultExpandedKeys"
        show-checkbox
        node-key="airspaceId"
        :disabled="isGlobalLoading"
        @check="handleCheckChange"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <!-- 节点loading -->
            <el-icon v-if="layerLoadingStatus[data.airspaceCode]" class="node-loading">
              <el-icon-Loading />
            </el-icon>
            <!-- 节点标签 -->
            <span
              class="tree-node__label"
              :class="{
                'loading-text': layerLoadingStatus[data.airspaceCode],
              }"
            >
              {{ node.label }}
            </span>
          </span>
        </template>
      </el-tree>
    </el-main>
  </div>

  <!-- 图例组件 -->
  <Legend :layerData="buildLayerData" />
</template>

<script>
import * as mars3d from 'mars3d'
const Cesium = mars3d.Cesium
import { LayerTreeAPI, gridAPI } from '@/api/model/laam'
import ViewInit from '@/components/mapView/ViewInit'
import Grid3DLayer from './js/layer/Grid3DLayer'
import Legend from './Legend.vue'
import bus from '@/utils/bus.js'

// 网格级别配置常量
const GRID_LEVEL_CONFIGS = {
  level_10: { name: 'level_10', gridSize: 27, gridStep: 0.5 },
  level_12: { name: 'level_12', gridSize: 29, gridStep: 0.1 },
  level_14: { name: 'level_14', gridSize: 31, gridStep: 0.05 },
  level_16: { name: 'level_16', gridSize: 33, gridStep: 0.05 },
  level_17: { name: 'level_17', gridSize: 35, gridStep: 0.05 },
}

// 瓦片级别映射
const TILE_LEVEL_MAP = [
  { maxLevel: 10, configKey: 'level_10' },
  { maxLevel: 12, configKey: 'level_12' },
  { maxLevel: 14, configKey: 'level_14' },
  { maxLevel: 16, configKey: 'level_16' },
  { maxLevel: 17, configKey: 'level_17' },
  { maxLevel: Infinity, configKey: 'level_18' },
]

export default {
  name: 'LayerTree',

  components: {
    Legend,
  },

  props: {
    // 关闭图层树的回调函数
    layerTreeShow: {
      type: Function,
      default: null,
    },
  },

  data() {
    return {
      viewer: ViewInit.viewer,
      /**
       * UI
       */
      layerTreeList: [], // 图层树数据
      layerInfoMap: new Map(), // 图层信息缓存 Map<airspaceCode, layerInfo>
      treeProps: {
        // 图层树子结构
        children: 'children',
        label: 'airspaceName',
      },
      defaultExpandedKeys: [1], // 默认全部展开

      /**
       * 按需加载相关
       */
      // 网格配置 - 根据你的数据动态生成
      gridConfigs: {}, // 网格缓存
      gridCaches: {}, // 当前可见网格-Map
      currentVisibleGrids: {}, // 当前配置-Set
      currentConfigs: {}, // 当前配置-Object
      checkedLayers: {}, //选中图层状态-Boolean

      /**
       * 加载状态
       */
      currentLevel: null, // 当前级别
      handler: null, //处理事件监听
      cameraListener: null, // 相机监听
      isLoading: false, // 防止重复加载
      isGlobalLoading: false, // 全局loading状态
      layerLoadingStatus: {}, //各层级loading状态-Boolean

      /**
       * 优化：节流相关
       */
      viewChangeTimer: null,
      lastViewChangeTime: 0,
      viewChangeThrottleDelay: 300, // 节流延迟(ms)

      /**
       * 优化：请求管理
       */
      pendingGridRequests: {}, //网格请求队列-Map

      /**
       * 区域范围
       */
      extent: {
        startLon: 115.0,
        endLon: 118.0,
        startLat: 37.0,
        endLat: 40.0,
      },
    }
  },

  computed: {
    // 构建图层树
    buildLayerData() {
      if (!this.layerTreeList?.length) {
        return []
      }
      const layerData = this.layerTreeList.map((layer) => ({
        airspaceId: layer.airspaceId,
        airspaceName: layer.airspaceName,
        airspaceCode: layer.airspaceCode,
        regionCode: layer.regionCode,
        description: layer.description,
        lowerLimit: layer.lowerLimit,
        upperLimit: layer.upperLimit,
        boundary: layer.boundary,
        defaultZoneType: layer.defaultZoneType,
        gridSize: layer.gridSize,
      }))

      return [
        {
          airspaceId: 1,
          airspaceName: '空域网格',
          children: layerData,
        },
      ]
    },
  },

  watch: {
    // 监听图层数据变化，初始化图层相关数据结构
    layerTreeList: {
      handler(newVal) {
        if (newVal?.length) {
          // 初始化图层数据结构
          this.initializeLayerStructures(newVal)

          // 更新默认展开的节点
          const firstNode = this.buildLayerData[0]
          if (firstNode?.children) {
            this.defaultExpandedKeys = [1, ...firstNode.children.map((child) => child.airspaceId)]
          }
        }
      },
      immediate: true,
    },
  },

  created() {
    this.initLayerTree(ViewInit.regionCode)
  },

  mounted() {
    this.initHandler()
    bus.on('refreshGridsByExtent', this.refreshGridsByGeographicExtent)
  },

  beforeUnmount() {
    this.clearViewChangeTimer()
    this.clearHandler()
    this.clearAllGrids()
    this.cancelAllPendingRequests()
    bus.off('refreshGridsByExtent', this.refreshGridsByGeographicExtent)
  },

  methods: {
    /**
     * 初始化图层数据结构（缓存、配置等）
     */
    initializeLayerStructures(layers) {
      // 清空并重建图层信息缓存
      this.layerInfoMap.clear()

      layers.forEach((layer) => {
        const layerCode = layer.airspaceCode

        // 缓存图层信息
        this.layerInfoMap.set(layerCode, layer)

        // 初始化各种数据结构
        if (!this.gridCaches[layerCode]) {
          this.gridCaches[layerCode] = new Map()
        }
        if (!this.currentVisibleGrids[layerCode]) {
          this.currentVisibleGrids[layerCode] = new Set()
        }
        if (!this.checkedLayers[layerCode]) {
          this.checkedLayers[layerCode] = false
        }
        if (!this.layerLoadingStatus[layerCode]) {
          this.layerLoadingStatus[layerCode] = false
        }
        if (!this.pendingGridRequests[layerCode]) {
          this.pendingGridRequests[layerCode] = new Map()
        }

        // 生成网格配置
        this.generateGridConfig(layer)
      })
    },

    /**
     * 初始化图层树
     */
    async initLayerTree(regionCode) {
      const res = await LayerTreeAPI.getList({ regionCode })
      if (res.ecode === 0 && res.data?.length) {
        this.layerTreeList = res.data
      }
    },

    /**
     * 获取图层信息（使用缓存）
     */
    getLayerInfo(layerCode) {
      return this.layerInfoMap.get(layerCode)
    },

    /**
     * 构建网格请求参数
     */
    buildGridParams(layerCode, config, startLon, startLat, endLon, endLat) {
      const layerInfo = this.getLayerInfo(layerCode)
      return {
        startLon: startLon.toFixed(2),
        endLon: endLon.toFixed(2),
        startLat: startLat.toFixed(2),
        endLat: endLat.toFixed(2),
        gridSize: config.gridSize,
        airspaceId: layerInfo?.airspaceId,
        regionCode: layerInfo?.regionCode,
      }
    },

    /**
     * 生成网格配置
     */
    generateGridConfig(layer) {
      const layerCode = layer.airspaceCode
      // 使用常量配置，为 level_10 添加 fixedExtent
      this.gridConfigs[layerCode] = {
        ...GRID_LEVEL_CONFIGS,
        level_10: {
          ...GRID_LEVEL_CONFIGS.level_10,
          fixedExtent: this.extent,
        },
      }
    },

    /**
     * 关闭图层树
     */
    handleClose() {
      this.layerTreeShow?.()
    },

    /**
     * 根据地理范围刷新所有层级的对应网格
     * @param {Object} extent - 地理范围 { startLon, endLon, startLat, endLat }
     */
    async refreshGridsByGeographicExtent(extent) {
      if (!extent || !extent.startLon || !extent.endLon || !extent.startLat || !extent.endLat) {
        console.warn('无效的地理范围参数:', extent)
        return
      }
      let totalCleared = 0
      // 遍历所有层级
      for (const layerCode of Object.keys(this.gridCaches)) {
        const cache = this.gridCaches[layerCode]
        const visibleGrids = this.currentVisibleGrids[layerCode]
        // 获取该层级所有可能的level配置
        const configs = this.gridConfigs[layerCode]
        if (!configs) continue
        // 对每个level配置，计算受影响的gridKey
        for (const [configName, config] of Object.entries(configs)) {
          const affectedKeys = this.calculateGridKeysInExtent(extent, config)
          // 清除这些缓存
          for (const gridKey of affectedKeys) {
            const gridLayer = cache.get(gridKey)
            if (gridLayer) {
              gridLayer.remove()
              cache.delete(gridKey)
              visibleGrids.delete(gridKey)
              totalCleared++
            }
          }
        }
      }

      // 重新加载当前选中层级的网格
      const reloadPromises = []
      for (const layerCode of Object.keys(this.checkedLayers)) {
        if (this.checkedLayers[layerCode] && this.currentConfigs[layerCode]) {
          reloadPromises.push(this.loadLayerGrids(layerCode))
        }
      }
      if (reloadPromises.length > 0) {
        await Promise.all(reloadPromises)
      }
    },

    /**
     * 计算给定地理范围内的所有网格键
     * @param {Object} extent - 地理范围
     * @param {Object} config - 层级配置
     * @returns {Set} 网格键集合
     */
    calculateGridKeysInExtent(extent, config) {
      const keys = new Set()
      const gridStep = config.gridStep
      if (!gridStep) return keys

      // 向外扩展一点，确保边界网格也被包含
      const padding = gridStep * 0.1
      const expandedExtent = {
        startLon: extent.startLon - padding,
        endLon: extent.endLon + padding,
        startLat: extent.startLat - padding,
        endLat: extent.endLat + padding,
      }

      // 计算所有相交的网格块
      for (
        let lon = Math.floor(expandedExtent.startLon / gridStep) * gridStep;
        lon < expandedExtent.endLon;
        lon += gridStep
      ) {
        for (
          let lat = Math.floor(expandedExtent.startLat / gridStep) * gridStep;
          lat < expandedExtent.endLat;
          lat += gridStep
        ) {
          const gridKey = this.generateGridKey(config.name, lon, lat)
          keys.add(gridKey)
        }
      }

      return keys
    },

    /**
     * 设置层级loading状态
     */
    setLayerLoading(layerCode, isLoading) {
      this.layerLoadingStatus[layerCode] = isLoading
    },

    /**
     * 处理勾选事件
     */
    async handleCheckChange(checkedNodes, checkedStatus) {
      const checkedKeys = checkedStatus.checkedKeys || []
      const newCheckedLayers = {}

      // 构建新的选中状态
      this.layerTreeList.forEach((layer) => {
        newCheckedLayers[layer.airspaceCode] = checkedKeys.includes(layer.airspaceId)
      })

      // 找出变化的层
      const changedLayers = []
      Object.keys(newCheckedLayers).forEach((layerCode) => {
        if (newCheckedLayers[layerCode] !== this.checkedLayers[layerCode]) {
          changedLayers.push({
            key: layerCode,
            checked: newCheckedLayers[layerCode],
          })
        }
      })

      // 更新选中状态
      this.checkedLayers = newCheckedLayers

      // 如果有变化的层，显示loading
      if (changedLayers.length > 0) {
        // 设置全局loading
        this.isGlobalLoading = true

        // 设置各个层的loading状态
        changedLayers.forEach((layer) => {
          this.setLayerLoading(layer.key, layer.checked)
        })

        try {
          // 根据选中状态显示/隐藏网格
          await Promise.all(
            changedLayers.map(async (layer) => {
              if (layer.checked) {
                await this.showLayerGrids(layer.key)
              } else {
                this.hideLayerGrids(layer.key)
              }
            }),
          )

          // 如果有选中的层，根据当前级别加载对应配置
          const hasCheckedLayers = Object.values(this.checkedLayers).some((checked) => checked)
          if (hasCheckedLayers) {
            await this.loadGridByLevel()
          }
        } catch (error) {
          console.error('图层加载失败:', error)
        } finally {
          // 清除loading状态
          this.isGlobalLoading = false
          changedLayers.forEach((layer) => {
            this.setLayerLoading(layer.key, false)
          })
        }
      }
    },

    /**
     * 显示指定层的网格
     */
    async showLayerGrids(layerCode) {
      const cache = this.gridCaches[layerCode]
      const visibleGrids = this.currentVisibleGrids[layerCode]
      // 显示缓存中的所有网格
      for (const gridKey of visibleGrids) {
        const gridLayer = cache.get(gridKey)
        if (gridLayer) {
          gridLayer.setVisible(true)
        }
      }
      // 如果有配置，加载该层网格
      if (this.currentConfigs[layerCode]) {
        await this.loadLayerGrids(layerCode)
      }
    },

    /**
     * 隐藏指定层的网格
     */
    hideLayerGrids(layerCode) {
      // 取消该层的所有进行中的请求
      this.cancelLayerRequests(layerCode)

      const cache = this.gridCaches[layerCode]
      const visibleGrids = this.currentVisibleGrids[layerCode]
      // 隐藏该层所有网格
      for (const gridKey of visibleGrids) {
        const gridLayer = cache.get(gridKey)
        if (gridLayer) {
          gridLayer.setVisible(false)
        }
      }
      visibleGrids.clear()
    },

    /**
     * 加载指定层的网格
     */
    async loadLayerGrids(layerCode) {
      if (!this.checkedLayers[layerCode] || !this.currentConfigs[layerCode]) {
        return
      }

      const config = this.currentConfigs[layerCode]
      await this.loadGridsByStrategy(layerCode, config)
    },

    /**
     * 初始化事件处理器
     */
    initHandler() {
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)

      // 使用节流的视图变化处理器
      this.cameraListener = this.throttledHandleViewChange.bind(this)
      this.viewer.camera.changed.addEventListener(this.cameraListener)
    },

    /**
     * 清理事件处理器
     */
    clearHandler() {
      if (this.handler) {
        this.handler.destroy()
        this.handler = null
      }
      if (this.cameraListener) {
        this.viewer.camera.changed.removeEventListener(this.cameraListener)
        this.cameraListener = null
      }
    },

    /**
     * 清理视图变化定时器
     */
    clearViewChangeTimer() {
      if (this.viewChangeTimer) {
        clearTimeout(this.viewChangeTimer)
        this.viewChangeTimer = null
      }
    },

    /**
     * 节流的视图变化处理器
     */
    throttledHandleViewChange() {
      const now = Date.now()
      const timeSinceLastUpdate = now - this.lastViewChangeTime

      // 清除之前的定时器
      this.clearViewChangeTimer()

      // 如果距离上次更新时间已超过节流延迟，立即执行
      if (timeSinceLastUpdate >= this.viewChangeThrottleDelay) {
        this.lastViewChangeTime = now
        this.handleViewChange()
      } else {
        // 否则设置定时器，在剩余时间后执行
        const remainingTime = this.viewChangeThrottleDelay - timeSinceLastUpdate
        this.viewChangeTimer = setTimeout(() => {
          this.lastViewChangeTime = Date.now()
          this.handleViewChange()
        }, remainingTime)
      }
    },

    /**
     * 视图变化处理
     */
    async handleViewChange() {
      if (this.isLoading) return
      const newLevel = this.getCurrentTileLevel()
      if (newLevel !== this.currentLevel) {
        this.currentLevel = newLevel
        console.log(`当前地图瓦片级别: ${this.currentLevel}`)
        await this.loadGridByLevel()
      } else if (this.currentLevel > 10) {
        await this.updateGridByVisible()
      }
    },

    /**
     * 获取当前瓦片级别
     */
    getCurrentTileLevel() {
      try {
        let maxLevel = 0
        const tilesToRender = this.viewer.scene.globe._surface._tilesToRender
        if (Cesium.defined(tilesToRender) && tilesToRender.length > 0) {
          for (let i = 0; i < tilesToRender.length; i++) {
            if (tilesToRender[i].level > maxLevel) {
              maxLevel = tilesToRender[i].level
            }
          }
        }
        return maxLevel
      } catch (error) {
        console.error('获取瓦片级别失败:', error)
        return 0
      }
    },

    /**
     * 按层级添加不同网格
     */
    async loadGridByLevel() {
      if (this.isLoading) return
      this.isLoading = true
      try {
        const level = this.currentLevel

        // 使用配置映射确定目标级别
        let targetLevel = ''
        for (const mapping of TILE_LEVEL_MAP) {
          if (level <= mapping.maxLevel) {
            targetLevel = mapping.configKey
            break
          }
        }

        if (!targetLevel) return

        // 为每个选中的层更新配置
        await Promise.all(
          Object.keys(this.checkedLayers)
            .filter((layerCode) => this.checkedLayers[layerCode])
            .map(async (layerCode) => {
              const newConfig = this.gridConfigs[layerCode][targetLevel]
              if (newConfig && this.currentConfigs[layerCode]?.name !== newConfig.name) {
                // 取消该层之前的请求
                this.cancelLayerRequests(layerCode)
                // 显示该层的loading
                this.setLayerLoading(layerCode, true)
                try {
                  this.currentConfigs[layerCode] = newConfig
                  // 重新加载该层网格
                  await this.loadLayerGrids(layerCode)
                } finally {
                  this.setLayerLoading(layerCode, false)
                }
              }
            }),
        )
      } catch (error) {
        console.error(`更新网格策略失败:`, error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 对于所有级别，都使用分块加载和缓存策略
     */
    async loadGridsByStrategy(layerCode, config) {
      // 取消该层之前的请求
      this.cancelLayerRequests(layerCode)
      this.hideLayerGrids(layerCode) // 隐藏该层所有网格
      if (config.name === 'level_10') {
        await this.loadGridByBlocks(layerCode, config) // 自定义缓存加载（块）
      } else {
        await this.loadGridByVisible(layerCode, config) // 可见性加载
      }
    },

    /**
     * 按区块加载完整网格（Level10）
     */
    async loadGridByBlocks(layerCode, config) {
      const { fixedExtent, gridStep } = config
      // 计算总区块数
      const lonBlocks = Math.ceil((fixedExtent.endLon - fixedExtent.startLon) / gridStep)
      const latBlocks = Math.ceil((fixedExtent.endLat - fixedExtent.startLat) / gridStep)
      // 批量加载所有区块
      const loadPromises = []
      for (let i = 0; i < lonBlocks; i++) {
        for (let j = 0; j < latBlocks; j++) {
          const startLon = fixedExtent.startLon + i * gridStep
          const endLon = Math.min(startLon + gridStep, fixedExtent.endLon)
          const startLat = fixedExtent.startLat + j * gridStep
          const endLat = Math.min(startLat + gridStep, fixedExtent.endLat)
          const gridKey = this.generateGridKey(config.name, startLon, startLat)

          loadPromises.push(
            this.createGridByBlocks(layerCode, config, startLon, startLat, endLon, endLat, gridKey),
          )
        }
      }
      await Promise.all(loadPromises)
    },

    /**
     * 按区块创建完整网格（Level10），生成缓存
     */
    async createGridByBlocks(layerCode, config, startLon, startLat, endLon, endLat, gridKey) {
      const cache = this.gridCaches[layerCode]
      const visibleGrids = this.currentVisibleGrids[layerCode]

      // 如果有缓存，直接显示
      if (cache.has(gridKey)) {
        const gridLayer = cache.get(gridKey)
        if (!gridLayer.isAdded) {
          gridLayer.addTo(this.viewer)
          gridLayer.isAdded = true
        }
        gridLayer.setVisible(true)
        visibleGrids.add(gridKey)
        return
      }
      // 否则创建新网格
      const params = this.buildGridParams(layerCode, config, startLon, startLat, endLon, endLat)
      const gridLayer = await this.createGridLayer(
        layerCode,
        params,
        `${layerCode}_${config.name}_${gridKey}`,
        gridKey,
      )

      if (gridLayer) {
        gridLayer.isAdded = true
        gridLayer.layerKey = layerCode // 标记所属层
        cache.set(gridKey, gridLayer)
        visibleGrids.add(gridKey)
      }
    },

    /**
     *  加载当前可视区域的网格
     */
    async loadGridByVisible(layerCode, config) {
      const visibleExtent = this.getVisibleExtent()
      if (!visibleExtent) return
      const setKeys = this.calculateGridKeys(visibleExtent, config)
      // 加载网格（缓存+新增）
      await this.loadNewGrids(layerCode, setKeys, config)
      // 优化：卸载不可见的网格
      this.unloadInvisibleGrids(layerCode, setKeys)
    },

    /**
     * 更新可视区域网格（Level10级以上）
     */
    async updateGridByVisible() {
      if (this.isLoading) return

      // 更新每个选中的层
      const updatePromises = Object.keys(this.checkedLayers)
        .filter((layerCode) => this.checkedLayers[layerCode] && this.currentConfigs[layerCode])
        .map((layerCode) => {
          const config = this.currentConfigs[layerCode]
          if (config.name === 'level_10') return Promise.resolve()

          const visibleExtent = this.getVisibleExtent()
          if (!visibleExtent) return Promise.resolve()

          const setKeys = this.calculateGridKeys(visibleExtent, config)

          // 加载新网格
          const loadPromise = this.loadNewGrids(layerCode, setKeys, config)

          // 卸载不可见的网格
          this.unloadInvisibleGrids(layerCode, setKeys)

          return loadPromise
        })

      await Promise.all(updatePromises)
    },

    /**
     * 优化：卸载移出视区的网格
     */
    unloadInvisibleGrids(layerCode, visibleKeys) {
      const cache = this.gridCaches[layerCode]
      const currentVisibleGrids = this.currentVisibleGrids[layerCode]

      // 找出不再可见的网格
      const gridsToRemove = []
      for (const gridKey of currentVisibleGrids) {
        if (!visibleKeys.has(gridKey)) {
          gridsToRemove.push(gridKey)
        }
      }

      // 隐藏并从可见集合中移除
      gridsToRemove.forEach((gridKey) => {
        const gridLayer = cache.get(gridKey)
        if (gridLayer) {
          gridLayer.setVisible(false)
        }
        currentVisibleGrids.delete(gridKey)
      })
    },

    /**
     * 计算需要的网格键值
     */
    calculateGridKeys(extent, config) {
      const keys = new Set()
      const gridStep = config.gridStep || 0.2
      // 根据可视范围计算需要加载的网格块
      for (
        let lon = Math.floor(extent.startLon / gridStep) * gridStep;
        lon < extent.endLon;
        lon += gridStep
      ) {
        for (
          let lat = Math.floor(extent.startLat / gridStep) * gridStep;
          lat < extent.endLat;
          lat += gridStep
        ) {
          const gridKey = this.generateGridKey(config.name, lon, lat)
          keys.add(gridKey)
        }
      }
      return keys
    },

    /**
     * 生成网格键值
     */
    generateGridKey(configName, lon, lat) {
      return `${configName}_${lon.toFixed(2)}_${lat.toFixed(2)}`
    },

    /**
     * 加载需要的网格
     */
    async loadNewGrids(layerCode, setKeys, config) {
      const cache = this.gridCaches[layerCode]
      const visibleGrids = this.currentVisibleGrids[layerCode]
      const gridStep = config.gridStep || 0.2
      const loadPromises = []

      for (const gridKey of setKeys) {
        // 如果已经显示，跳过
        if (visibleGrids.has(gridKey)) continue
        // 如果该网格正在加载，跳过
        if (this.pendingGridRequests[layerCode].has(gridKey)) continue
        // 解析坐标
        const parts = gridKey.split('_')
        const startLon = parseFloat(parts[2])
        const startLat = parseFloat(parts[3])
        const endLon = startLon + gridStep
        const endLat = startLat + gridStep

        // 如果有缓存，直接显示
        if (cache.has(gridKey)) {
          const gridLayer = cache.get(gridKey)
          if (!gridLayer.isAdded) {
            gridLayer.addTo(this.viewer)
            gridLayer.isAdded = true
          }
          gridLayer.setVisible(true)
          visibleGrids.add(gridKey)
          continue
        }

        // 否则加载新网格
        loadPromises.push(
          this.loadGridBlock(layerCode, config, startLon, startLat, endLon, endLat, gridKey),
        )
      }

      await Promise.all(loadPromises)
    },

    /**
     * 加载单个网格块
     */
    async loadGridBlock(layerCode, config, startLon, startLat, endLon, endLat, gridKey) {
      const cache = this.gridCaches[layerCode]
      const visibleGrids = this.currentVisibleGrids[layerCode]

      // 标记该网格正在加载
      this.pendingGridRequests[layerCode].set(gridKey, true)

      // 构建请求参数
      const params = this.buildGridParams(layerCode, config, startLon, startLat, endLon, endLat)

      try {
        const gridLayer = await this.createGridLayer(
          layerCode,
          params,
          `${layerCode}_${config.name}_${gridKey}`,
          gridKey,
        )

        // 检查该层是否仍然被选中（避免竞争条件）
        if (!this.checkedLayers[layerCode]) {
          // 如果该层已经被取消选中，不添加网格
          if (gridLayer) {
            gridLayer.remove()
          }
          return
        }

        if (gridLayer) {
          gridLayer.isAdded = true
          gridLayer.layerKey = layerCode // 标记所属层
          cache.set(gridKey, gridLayer)
          visibleGrids.add(gridKey)
        }
      } catch (error) {
        // 如果是取消错误，不记录
        if (error.name !== 'AbortError') {
          console.error(`加载网格块 ${layerCode}_${gridKey} 失败:`, error)
        }
      } finally {
        // 移除加载标记
        this.pendingGridRequests[layerCode].delete(gridKey)
      }
    },

    /**
     * 创建网格图层
     */
    async createGridLayer(layerCode, params, name, gridKey) {
      try {
        const res = await gridAPI.getGrid(params)
        if (res && res.ecode === 0) {
          const gridLayer = new Grid3DLayer({
            url: res.data,
            name: name,
            Type: 'baseGrid',
          }).addTo(this.viewer)
          return gridLayer
        }
        return null
      } catch (error) {
        console.error(`创建网格图层 ${name} 失败:`, error)
        throw error
      }
    },

    /**
     * 优化：取消指定层的所有进行中的请求
     */
    cancelLayerRequests(layerCode) {
      // 清除该层的待处理请求标记
      this.pendingGridRequests[layerCode].clear()
    },

    /**
     * 优化：取消所有进行中的请求
     */
    cancelAllPendingRequests() {
      Object.keys(this.pendingGridRequests).forEach((layerCode) => {
        this.cancelLayerRequests(layerCode)
      })
    },

    /**
     * 清理、销毁所有网格
     */
    clearAllGrids() {
      // 清理所有层的网格
      Object.keys(this.gridCaches).forEach((layerCode) => {
        this.hideLayerGrids(layerCode)
        const cache = this.gridCaches[layerCode]
        for (const [key, gridLayer] of cache) {
          if (gridLayer) {
            gridLayer.remove()
          }
        }
        cache.clear()
      })
    },

    /**
     * 获取可视区域的范围（修正）
     */
    getVisibleExtent() {
      try {
        const extent = this.getScreenBounds()
        if (!extent) return null

        // 扩展一点范围，避免边缘闪烁
        const padding = 0.05
        return {
          startLon: extent.startLon - padding,
          endLon: extent.endLon + padding,
          startLat: extent.startLat - padding,
          endLat: extent.endLat + padding,
        }
      } catch (error) {
        console.error('获取可视区域失败:', error)
        return null
      }
    },

    /**
     * 获取屏幕边界范围
     */
    getScreenBounds() {
      try {
        const canvas = this.viewer.scene.canvas
        const corners = [
          new Cesium.Cartesian2(0, 0), // 左上
          new Cesium.Cartesian2(canvas.width, 0), // 右上
          new Cesium.Cartesian2(0, canvas.height), // 左下
          new Cesium.Cartesian2(canvas.width, canvas.height), // 右下
        ]

        const cartographics = []

        for (const corner of corners) {
          const ray = this.viewer.camera.getPickRay(corner)
          if (ray) {
            const position = this.viewer.scene.globe.pick(ray, this.viewer.scene)
            if (position) {
              const cartographic = Cesium.Cartographic.fromCartesian(position)
              cartographics.push(cartographic)
            }
          }
        }

        if (cartographics.length > 0) {
          const lons = cartographics.map((c) => Cesium.Math.toDegrees(c.longitude))
          const lats = cartographics.map((c) => Cesium.Math.toDegrees(c.latitude))

          let extent = {
            startLon: Math.min(...lons),
            endLon: Math.max(...lons),
            startLat: Math.min(...lats),
            endLat: Math.max(...lats),
          }

          // 限制最大范围，防止倾斜视角时加载过多网格
          const MAX_LON_RANGE = 3.0 // 最大经度范围（度）
          const MAX_LAT_RANGE = 3.0 // 最大纬度范围（度）

          const lonRange = extent.endLon - extent.startLon
          const latRange = extent.endLat - extent.startLat

          if (lonRange > MAX_LON_RANGE || latRange > MAX_LAT_RANGE) {
            // 范围过大，以相机位置为中心限制范围
            const cameraPosition = this.getCameraPosition()
            if (cameraPosition) {
              extent = {
                startLon: cameraPosition.lon - MAX_LON_RANGE / 2,
                endLon: cameraPosition.lon + MAX_LON_RANGE / 2,
                startLat: cameraPosition.lat - MAX_LAT_RANGE / 2,
                endLat: cameraPosition.lat + MAX_LAT_RANGE / 2,
              }
            }
          }

          return extent
        }
      } catch (error) {
        console.error('获取屏幕边界失败:', error)
      }
      return null
    },

    /**
     * 获取相机位置（经纬度）
     */
    getCameraPosition() {
      try {
        const cameraCartographic = this.viewer.camera.positionCartographic
        return {
          lon: Cesium.Math.toDegrees(cameraCartographic.longitude),
          lat: Cesium.Math.toDegrees(cameraCartographic.latitude),
          height: cameraCartographic.height,
        }
      } catch (error) {
        console.error('获取相机位置失败:', error)
        return null
      }
    },
  },
}
</script>

<style lang="less" scoped>
/* ========== 主容器 ========== */
.layer-tree {
  position: absolute;
  top: 12px;
  left: 50px;
  width: 200px;
  color: #fbfbfb;
  background: rgba(34, 34, 34, 0.7);
  border-radius: 4px;
  overflow: hidden;
}

/* ========== 头部样式 ========== */
.layer-tree__header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  background: rgba(34, 34, 34, 0.7);
  border-bottom: 1px solid #616161;
}

.layer-tree__title {
  flex: 1;
  text-align: center;
}

.layer-tree__close-icon {
  position: absolute;
  right: 12px;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: #409eff;
  }
}

/* ========== 主体内容 ========== */
.layer-tree__main {
  position: relative;
  padding: 12px;
}

/* ========== 全局loading样式 ========== */
.global-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(34, 34, 34, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .loading-icon {
    font-size: 24px;
    color: #409eff;
    margin-bottom: 8px;
    animation: rotating 2s linear infinite;
  }

  span {
    color: #fbfbfb;
    font-size: 14px;
  }
}

/* ========== 树节点样式 ========== */
.tree-node {
  display: flex;
  align-items: center;
  width: 100%;
}

.tree-node__label {
  flex: 1;
  margin-right: 4px;
  transition: opacity 0.3s;
}

/* ========== 节点loading样式 ========== */
.node-loading {
  margin-right: 6px;
  font-size: 14px;
  color: #409eff;
  animation: rotating 2s linear infinite;
}

.loading-text {
  opacity: 0.6;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ========== 禁用状态样式 ========== */
:deep(.el-tree) {
  &.is-disabled {
    opacity: 0.6;
    pointer-events: none;

    .el-checkbox {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
}
</style>
