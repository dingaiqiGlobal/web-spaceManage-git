<template>
  <el-container class="form-container">
    <el-header class="form-header">
      <span class="header-text">{{ isEditMode ? '编辑空域划设' : '创建空域划设' }}</span>
    </el-header>

    <el-main class="form-main">
      <!-- 绘制 -->
      <DrawTools />
      <el-form ref="formRef" :model="form" label-position="top" class="form-plan">
        <!-- 空域名称 -->
        <el-form-item label="空域名称" class="form-item">
          <el-input v-model="form.zoneName" placeholder="输入空域名称" clearable />
        </el-form-item>

        <!-- 空域类型 -->
        <el-form-item label="空域类型" class="form-item">
          <el-radio-group v-model="form.zoneType">
            <el-radio :value="1">适飞区</el-radio>
            <el-radio :value="2">管制区</el-radio>
            <el-radio :value="3">禁飞区</el-radio>
          </el-radio-group>
        </el-form-item>

        <!--下限高 -->
        <el-form-item label="下限高" class="form-item">
          <el-input v-model.number="form.lowerLimit" placeholder="0" type="number">
            <template #append>m</template>
          </el-input>
        </el-form-item>

        <!-- 上限高 -->
        <el-form-item label="上限高" class="form-item">
          <el-input v-model.number="form.upperLimit" placeholder="0" type="number">
            <template #append>m</template>
          </el-input>
        </el-form-item>
      </el-form>
    </el-main>

    <!-- 底部操作按钮 -->
    <el-footer class="form-footer">
      <el-button
        type="primary"
        @click="handleSubmit"
        class="submit-btn"
        :loading="submitLoading"
        :disabled="!isFormValid || submitLoading"
      >
        <el-icon><el-icon-Check /></el-icon>
        提交
      </el-button>
      <el-button @click="handleCancel">
        <el-icon><el-icon-Close /></el-icon>
        取消
      </el-button>
    </el-footer>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { zoneAPI } from '@/api/model/laam'

import * as Cesium from 'cesium'
import bus from '@/utils/bus.js'
import { ElMessage } from 'element-plus'

import ViewInit from '@/components/mapView/ViewInit'
import DrawTools from '@/components/drawTools/index.vue'
import { wktToCoordinates } from '@/js/coords/CoordinateToWKT'

// Props & Emits
const props = defineProps({
  editData: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['show-draw', 'show-add', 'reload'])

// 状态
const viewer = ViewInit.viewer
const submitLoading = ref(false)
const isEditMode = ref(false)
const wktEntity = ref(null)

// 表单数据
const form = reactive({
  zoneId: null,
  zoneName: '',
  zoneStatus: 1,
  spaceType: 3,
  upperLimit: 0,
  lowerLimit: 0,
  zoneType: 1,
  points: [],
  pointsWKT: '',
  radius: 1,
  regionCode: ViewInit.regionCode,
  editPoint: true,
})

// 表单验证
const isFormValid = computed(() => {
  return (
    form.zoneName.trim() !== '' && form.pointsWKT !== '' > 0 && form.upperLimit >= form.lowerLimit
  )
})

// 监听 editData 变化
watch(
  () => props.editData,
  (newVal) => {
    if (newVal) {
      initEditMode()
    } else {
      isEditMode.value = false
      resetForm()
    }
  },
  { immediate: true },
)

// 初始化编辑模式
function initEditMode() {
  isEditMode.value = true
  const data = props.editData
  Object.assign(form, {
    zoneId: data.zoneId,
    zoneName: data.zoneName || '',
    zoneStatus: data.zoneStatus,
    spaceType: data.spaceType,
    upperLimit: data.upperLimit || 0,
    lowerLimit: data.lowerLimit || 0,
    zoneType: data.zoneType,
    regionCode: data.regionCode,
    points: [],
    pointsWKT: '',
    radius: data.radius || 1,
    editPoint: true,
  })
  console.log(data, '11111111111')
  if (data.boundary) {
    parseAndDrawBoundary(data.boundary)
  }
}

// 解析边界并在地图绘制
function parseAndDrawBoundary(wktString) {
  if (!wktString || typeof wktString !== 'string') return
  form.pointsWKT = wktString
  const obj = wktToCoordinates(wktString)
  addWktGeometry(obj.coordinates)
}

function addWktGeometry(points) {
  const positions = points.map((coord) => Cesium.Cartesian3.fromDegrees(coord.lng, coord.lat))
  removeWktGeometry()
  wktEntity.value = viewer.entities.add({
    name: 'wktGeometry',
    polygon: {
      hierarchy: positions,
      material: Cesium.Color.fromCssColorString('rgba(78, 143, 252, 0.4)'),
      perPositionHeight: true,
      disableDepthTestDistance: 50000,
    },
    polyline: {
      positions: positions.concat(positions[0]),
      width: 1,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString('rgba(141, 248, 253, 1)'),
      }),
      disableDepthTestDistance: 50000,
    },
  })
}

function removeWktGeometry() {
  if (wktEntity.value) {
    viewer.entities.remove(wktEntity.value)
    wktEntity.value = null
  }
}

// 绘制数据回调
function handleDrawData(data) {
  form.pointsWKT = data
}

function handleGeometryType(drawType) {
  const typeMap = { Point: 1, Polyline: 2, Polygon: 3, Circle: 4 }
  form.spaceType = typeMap[drawType] || 3
}

// 解析 WKT POLYGON 为边界范围
function parseWKTPolygonToExtent(wktString) {
  if (!wktString || typeof wktString !== 'string') return null
  const cleanedString = wktString.replace(/\s+/g, ' ').trim()
  if (!cleanedString.toUpperCase().startsWith('POLYGON')) return null
  if (cleanedString.toUpperCase().includes('EMPTY')) return null
  const coordMatch = cleanedString.match(/\(\(([^()]+)\)\)/)
  if (!coordMatch || !coordMatch[1]) return null
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity
  try {
    coordMatch[1].split(',').forEach((pair) => {
      const [lonStr, latStr] = pair.trim().split(' ')
      if (lonStr && latStr) {
        const lon = parseFloat(lonStr),
          lat = parseFloat(latStr)
        if (!isNaN(lon) && !isNaN(lat)) {
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
      }
    })
    if (minLon === Infinity) return null
    return { startLon: minLon, endLon: maxLon, startLat: minLat, endLat: maxLat }
  } catch {
    return null
  }
}

// 提交
async function handleSubmit() {
  if (!isFormValid.value) {
    ElMessage.warning('请完善表单信息并完成空域绘制')
    return
  }
  if (form.upperLimit < form.lowerLimit) {
    ElMessage.warning('上限高不能小于下限高')
    return
  }
  submitLoading.value = true
  try {
    let result
    if (isEditMode.value) {
      const updateData = { ...form }
      result = await zoneAPI.createEditZone(updateData)
      if (result.ecode === 0) {
        ElMessage.success('空域更新成功')
        removeWktGeometry()
        const boundary = result.data?.boundary || props.editData?.boundary
        if (boundary) bus.emit('refreshGridsByExtent', parseWKTPolygonToExtent(boundary))
        emit('reload')
        handleCancel()
      } else {
        ElMessage.error(result.emsg || '更新失败')
      }
    } else {
      const submitData = { ...form }
      delete submitData.zoneId
      result = await zoneAPI.createEditZone(submitData)
      if (result.ecode === 0) {
        ElMessage.success('空域创建成功')
        removeWktGeometry()
        const boundary = result.data?.boundary
        if (boundary) bus.emit('refreshGridsByExtent', parseWKTPolygonToExtent(boundary))
        emit('reload')
        handleCancel()
      } else {
        ElMessage.error(result.emsg || '创建失败')
      }
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败，请稍后重试')
  } finally {
    submitLoading.value = false
  }
}

// 取消
function handleCancel() {
  removeWktGeometry()
  bus.emit('handleClear')
  resetForm()
  emit('show-draw', true)
  emit('show-add', false)
  //地图刷新
  if (ViewInit.viewer.scene) {
    ViewInit.viewer.scene.requestRender()
  }
}

// 重置表单
function resetForm() {
  isEditMode.value = false
  Object.assign(form, {
    zoneId: null,
    zoneName: '',
    zoneStatus: 1,
    spaceType: 3,
    upperLimit: 0,
    lowerLimit: 0,
    zoneType: 1,
    regionCode: ViewInit.regionCode,
    points: [],
    pointsWKT: '',
    radius: 1,
    editPoint: true,
  })
}

onMounted(() => {
  bus.on('drawZoneWKT', handleDrawData)
  bus.on('drawZoneGeomtry', handleGeometryType)
  if (props.editData) initEditMode()
})

onUnmounted(() => {
  bus.off('drawZoneWKT', handleDrawData)
  bus.off('drawZoneGeomtry', handleGeometryType)
  bus.emit('handleClear')
})
</script>

<style lang="less" scoped>
.form-container {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 500px;
  height: 100%;
  background: #222222;
  overflow-y: auto;
  .form-header {
    background: #222222;
    color: #fbfbfb;
    font-family: 'Alibaba PuHuiTi 2.0';
    font-size: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: 24px;
    .header-text {
      font-size: 18px;
      font-weight: 600;
      color: #fbfbfb;
    }
  }
  .form-main {
    padding: 20px;
    overflow-y: auto;
    .form-plan {
      max-width: 600px;
      margin: 0 auto;
    }
    .form-item {
      margin-bottom: 24px;
      color: #fbfbfb;
    }
  }
  .form-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #3a3a3a;
    background: #2a2a2a;

    .submit-btn {
      min-width: 100px;
    }

    .el-button {
      min-width: 100px;
    }
  }
}
</style>
