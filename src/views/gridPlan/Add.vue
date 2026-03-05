<template>
  <el-container class="flight-plan-add">
    <el-header class="title">
      <span>{{ isEditMode ? '编辑用空计划' : '创建用空计划' }}</span>
    </el-header>
    <el-main>
      <!-- 计划名称 -->
      <div class="form-item">
        <div class="label required">计划名称</div>
        <el-input v-model="form.planName" placeholder="请输入计划名称"></el-input>
      </div>
      <!--航空器模型-->
      <div class="form-item">
        <div class="label required">航空器模型</div>
        <el-select v-model="form.drone" placeholder="请选择模型" class="full-width">
          <el-option
            v-for="item in droneTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <!-- 用空类型 -->
      <div class="form-item">
        <div class="label required">用空类型</div>
        <el-select v-model="form.flightPurpose" placeholder="请选择用空类型" class="full-width">
          <el-option
            v-for="item in flightPurposeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>

      <!-- 飞行模式 -->
      <div class="form-item">
        <div class="label required">飞行模式</div>
        <el-select v-model="form.flightMode" placeholder="请选择飞行模式" class="full-width">
          <el-option
            v-for="item in flightModeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>

      <!-- 预计飞行时间 -->
      <div class="form-item">
        <div class="label required">预计飞行时间</div>
        <el-date-picker
          v-model="form.startTime"
          type="datetime"
          placeholder="选择预计飞行时间"
          class="full-width"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm"
        />
      </div>

      <!-- 预计降落时间 -->
      <div class="form-item">
        <div class="label required">预计降落时间</div>
        <el-date-picker
          v-model="form.endTime"
          type="datetime"
          placeholder="选择预计降落时间"
          class="full-width"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm"
        />
      </div>

      <!-- 最大飞行高度 -->
      <div class="form-item">
        <div class="label required">最大飞行高度</div>
        <el-input v-model="form.maxH" placeholder="0" type="number" class="full-width">
          <template #append>m</template>
        </el-input>
      </div>

      <!-- 通信联络方式 -->
      <div class="form-item">
        <div class="label">通信联络方式</div>
        <el-input v-model="form.phone" placeholder="输入通信联络方式" class="full-width" />
      </div>

      <!-- 特殊飞行保障需求 -->
      <div class="form-item">
        <div class="label">特殊飞行保障需求</div>
        <el-input
          v-model="form.pilot"
          placeholder="输入特殊飞行保障需求"
          type="textarea"
          :rows="3"
          class="full-width"
        />
      </div>

      <!-- 标记空域 - 只在创建模式下显示 -->
      <div class="form-item" v-if="!isEditMode">
        <div class="section-title">
          <div class="blue-line"></div>
          标记空域
        </div>
        <DrawToolsPlan :is-edit="false" />
      </div>

      <!-- 是否路径规划 - 只在创建模式下显示 -->
      <div class="form-item" v-if="!isEditMode">
        <div class="label">开启推荐路径规划</div>
        <div class="switch-row">
          <el-switch
            v-model="rules"
            :active-value="1"
            :inactive-value="0"
            active-color="#13ce66"
            inactive-color="#ff4949"
            :disabled="rulesLoading"
            @change="handleRulesChange"
          ></el-switch>
          <span class="switch-label">
            {{ rules === 1 ? '已开启' : '已关闭' }}
          </span>
          <template v-if="rulesLoading">
            <el-icon class="is-loading rules-loading-icon">
              <Loading />
            </el-icon>
            <span class="rules-loading-text">路径规划计算中...</span>
          </template>
        </div>
      </div>
    </el-main>
    <el-footer class="footer">
      <el-button type="primary" @click="handleSubmit" :disabled="!isFormValid || submitLoading">
        <el-icon class="icon" :class="{ 'is-loading': submitLoading }">
          <Loading v-if="submitLoading" />
          <el-icon-Check v-else />
        </el-icon>
        {{ isEditMode ? '更新' : '提交' }}
      </el-button>
      <el-button @click="handleCancel" :disabled="submitLoading">
        <el-icon class="icon"><el-icon-Close /></el-icon>
        取消
      </el-button>
    </el-footer>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { planAPI } from '@/api/model/laam'

import ViewInit from '@/components/mapView/ViewInit'
import DrawToolsPlan from '@/components/drawToolsPlan/index.vue'
import GridDraw from '@/js/layer/GridDraw'
import { wktToCoordinates } from '@/js/coords/CoordinateToWKT'
import bus from '@/utils/bus.js'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

// Props & Emits
const props = defineProps({
  editData: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['show-plan', 'show-add', 'reload'])

// 状态
const viewer = ViewInit.viewer
const submitLoading = ref(false)
const isEditMode = ref(false)
const rules = ref(0)
const rulesLoading = ref(false)
const originalFlightPlan = ref('')

// 表单数据
const form = reactive({
  planName: '',
  drone: 'data/gltf/DXY.glb',
  flightPurpose: '个人娱乐',
  flightMode: '视距外飞行',
  startTime: '',
  endTime: '',
  maxH: '100',
  phone: '139xxx1234',
  pilot: '无',
  flightPlan: '',
  regionCode: ViewInit.regionCode,
  editPoint: true,
})

// 选项数据
const droneTypeOptions = [
  { label: '直升机', value: 'data/gltf/ZSJ.glb' },
  { label: '固定翼', value: 'data/gltf/GDY.glb' },
  { label: '多旋翼', value: 'data/gltf/DXY.glb' },
  { label: '复合翼', value: 'data/gltf/FHY.glb' },
]
const flightModeOptions = [
  { label: '视距外飞行', value: '视距外飞行' },
  { label: '视距内飞行', value: '视距内飞行' },
]
const flightPurposeOptions = [
  { label: '个人娱乐', value: '个人娱乐' },
  { label: '短途运输', value: '短途运输' },
  { label: '包机飞行', value: '包机飞行' },
]

// 表单验证
const isFormValid = computed(() => {
  return (
    form.planName.trim() !== '' && form.startTime !== '' && form.endTime !== '' && form.maxH !== ''
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
    planId: data.planId || null,
    planName: data.planName || '',
    drone: data.drone || 'data/gltf/DXY.glb',
    flightPurpose: data.flightPurpose || '个人娱乐',
    flightMode: data.flightMode || '视距外飞行',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    maxH: data.maxH || '100',
    phone: data.phone || '',
    pilot: data.pilot || '',
    flightPlan: data.flightPlan || '',
  })
}

// 绘制数据回调
function handleDrawData(data) {
  if (!data) return
  form.flightPlan = data
  originalFlightPlan.value = data
}

// 路径规划开关
async function handleRulesChange(value) {
  if (!form.flightPlan) {
    ElMessage.warning('请先标记空域')
    rules.value = value === 1 ? 0 : 1
    return
  }
  if (value === 1) {
    if (!originalFlightPlan.value) originalFlightPlan.value = form.flightPlan
    rulesLoading.value = true
    try {
      clearDrawGrid()
      const res = await planAPI.changeRoute(originalFlightPlan.value)
      if (res.ecode === 0) {
        const geojson = res.data.collectionGeoJson
        const centerLine = res.data.flightPlan
        form.flightPlan = centerLine
        new GridDraw({
          url: geojson,
          name: 'planGrid',
          Type: 'planGrid',
          fillColor: 'rgba(0, 102, 255, 0.5)',
          outlineColor: 'rgba(0, 102, 255, 1)',
        }).addTo(viewer)
        addWKTLine(centerLine)
      }
    } catch (error) {
      ElMessage.error('路径规划请求失败')
      rules.value = 0
    } finally {
      rulesLoading.value = false
    }
  } else {
    clearDrawGrid()
    form.flightPlan = originalFlightPlan.value
    if (originalFlightPlan.value) addWKTLine(originalFlightPlan.value)
  }
}

function addWKTLine(wkt) {
  const res = wktToCoordinates(wkt)
  if (!res || !res.coordinates || res.coordinates.length === 0) return
  const flatArr = res.coordinates.flatMap((c) => [c.lng, c.lat, c.height ?? 0])
  viewer.entities.add({
    Type: 'EditablePolyline',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(flatArr),
      width: 2,
      material: Cesium.Color.fromCssColorString('rgba(78, 143, 252, 1)'),
      disableDepthTestDistance: 50000,
    },
  })
}

// 提交
async function handleSubmit() {
  if (!isFormValid.value) {
    ElMessage.warning('请完善必填信息（计划名称、飞行时间、结束时间、最大高度）')
    return
  }
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    ElMessage.warning('预计降落时间必须晚于预计飞行时间')
    return
  }
  submitLoading.value = true
  try {
    const submitData = {
      planName: form.planName.trim(),
      drone: form.drone,
      flightPurpose: form.flightPurpose,
      flightMode: form.flightMode,
      startTime: form.startTime,
      endTime: form.endTime,
      maxH: form.maxH,
      phone: form.phone,
      pilot: form.pilot,
      flightPlan: form.flightPlan,
      regionCode: ViewInit.regionCode,
      editPoint: true,
    }
    if (isEditMode.value && form.planId) {
      submitData.planId = form.planId
    }
    const result = await planAPI.createEditPlan(submitData)
    if (result.ecode === 0) {
      ElMessage.success(isEditMode.value ? '用空计划更新成功' : '用空计划创建成功')
      emit('reload')
      handleCancel()
    } else if (result.ecode === -2) {
      ElMessage.error('用空计划冲突，请重新选择')
    } else {
      ElMessage.error(result.emsg || (isEditMode.value ? '更新失败' : '创建失败'))
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
  bus.emit('handleClear')
  clearDrawGrid()
  resetForm()
  emit('show-plan', true)
  emit('show-add', false)
}

// 清除绘制线+网格
function clearDrawGrid() {
  const entities = viewer.entities.values
  const delEntities = []
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].Type === 'EditablePolyline') delEntities.push(entities[i])
  }
  delEntities.forEach((e) => viewer.entities.remove(e))
  const grid = viewer.dataSources.getByName('planGrid')
  if (grid.length > 0) viewer.dataSources.remove(grid[0])
}

// 重置表单
function resetForm() {
  isEditMode.value = false
  rules.value = 0
  Object.assign(form, {
    planId: null,
    planName: '',
    drone: 'data/gltf/DXY.glb',
    flightPurpose: '个人娱乐',
    flightMode: '视距外飞行',
    startTime: '',
    endTime: '',
    maxH: '100',
    phone: '139xxx1234',
    pilot: '无',
    flightPlan: '',
  })
}

onMounted(() => {
  bus.on('drawPlanWKT', handleDrawData)
  if (props.editData) initEditMode()
})

onUnmounted(() => {
  bus.off('drawPlanWKT', handleDrawData)
  bus.emit('handlePlanClear')
})
</script>

<style lang="less" scoped>
.flight-plan-add {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 500px;
  height: 100%;
  flex-shrink: 0;
  background: #222222;
  padding: 12px;
  overflow-y: auto;
  .title {
    display: flex;
    width: 600px;
    height: 52px;
    padding: 12px 350px 12px 12px;
    align-items: center;
    flex-shrink: 0;
    color: var(--, #fbfbfb);
    font-family: 'Alibaba PuHuiTi 2.0';
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: 28px;
  }
}

.form-item {
  margin-bottom: 20px;
  position: relative;
}

.label {
  font-size: 14px;
  color: #e0e0e0;
  margin-bottom: 8px;
}
.switch-label {
  margin-left: 10px;
  color: #e0e0e0;
  font-size: 13px;
}

.switch-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.rules-loading-icon {
  margin-left: 10px;
  font-size: 16px;
  color: #409eff;
}

.rules-loading-text {
  margin-left: 6px;
  font-size: 13px;
  color: #409eff;
}

.label.required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #e0e0e0;
  margin-bottom: 12px;
}

.blue-line {
  width: 4px;
  height: 16px;
  background: #409eff;
  margin-right: 8px;
  border-radius: 2px;
}

.full-width {
  width: 100%;
}

.footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #333;
  text-align: left;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
