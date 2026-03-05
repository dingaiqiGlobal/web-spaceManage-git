<template>
  <el-container v-if="planFlage" class="main-container">
    <!-- 标题 -->
    <el-header class="title">
      <span>无人机用空计划</span>
    </el-header>
    <!-- 搜索框 -->
    <div class="row">
      <el-input v-model="searchText" placeholder="搜索用空计划编号" clearable @input="handleSearch">
        <template #prefix>
          <el-icon><el-icon-Search /></el-icon>
        </template>
      </el-input>
    </div>
    <!-- 日期选择 -->
    <div class="row">
      <el-date-picker
        v-model="selectedDateTime"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        @change="handleDateSearch"
      />
    </div>
    <!-- 飞行模式+用空类型 -->
    <div class="row">
      <div class="half-width">
        <el-select
          v-model="selectedFlightMode"
          placeholder="选择飞行模式"
          clearable
          @change="handleFlightMode"
        >
          <el-option
            v-for="item in flightModeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="half-width">
        <el-select
          v-model="selectedFlightPurpose"
          placeholder="选择用空类型"
          clearable
          @change="handleFlightPurposeh"
        >
          <el-option
            v-for="item in flightPurposeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </div>
    <!-- 操作按钮区域 -->
    <div class="row action-row">
      <el-button type="primary" @click="handleCreate">
        <el-icon><el-icon-Plus /></el-icon>
        创建
      </el-button>
      <el-button @click="handleReset">
        <el-icon><el-icon-Refresh /></el-icon>
        重置
      </el-button>
      <el-checkbox v-model="selectAll" @change="handleSelectAll" :indeterminate="isIndeterminate">
        全选 ({{ selectedCount }}/{{ filteredTotal }})
      </el-checkbox>
    </div>
    <!-- 列表 -->
    <el-main>
      <div class="content-area">
        <div v-if="tableData.length === 0" class="no-data">
          <el-empty description="暂无数据" />
        </div>
        <div
          v-else
          v-for="item in tableData"
          :key="item.id"
          v-loading="loading"
          class="content-item"
        >
          <div class="content-card">
            <!-- 头部：时间区间 -->
            <div class="card-header">
              <div class="time-range">
                <span class="time-text">{{ item.startTime }}</span>
                <el-icon class="arrow-icon"><el-icon-ArrowRight /></el-icon>
                <span class="time-text">{{ item.endTime }}</span>
              </div>
              <div class="planName-text">
                <span>{{ item.planName }}</span>
              </div>
              <el-checkbox
                class="checkbox_item"
                v-model="item.selected"
                @change="handleItemSelect(item)"
              />
            </div>

            <!-- 分割线 -->
            <el-divider class="card-divider" />

            <!-- 内容信息 -->
            <div class="card-content">
              <div class="info-list">
                <div class="info-row">
                  <span class="info-label">用空类型：</span>
                  <span class="info-value">{{ item.flightPurpose }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">飞行模式：</span>
                  <span class="info-value">{{ item.flightMode }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">最大飞行高度：</span>
                  <span class="info-value">{{ item.maxH }}m</span>
                </div>
                <div class="info-row">
                  <span class="info-label">编号：</span>
                  <span class="info-value serial-number">{{ item.planId }}</span>
                </div>
              </div>
              <div class="btn-row">
                <el-button
                  size="small"
                  class="editButton"
                  @click="handleItemEdit(item)"
                  :disabled="item.selected"
                  >编辑</el-button
                >
                <el-button
                  size="small"
                  class="deleteButton"
                  @click="handleItemDelete(item)"
                  :disabled="item.selected"
                  >删除</el-button
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-main>
    <!-- 尾部:分页 -->
    <el-footer class="footer">
      <el-pagination
        v-model:current-page="pagination.pageNumber"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        class="pagination"
      />
    </el-footer>
  </el-container>
  <Add
    v-if="addFlage"
    :editData="editData"
    @show-plan="isShowPlan"
    @show-add="isShowAdd"
    @reload="loadData"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

import { planAPI } from '@/api/model/laam'

import * as Cesium from 'cesium'
import dayjs from 'dayjs'
import { ElMessageBox, ElMessage } from 'element-plus'

import ViewInit from '@/components/mapView/ViewInit'
import GridDraw from '@/js/layer/GridDraw'
import { wktToCoordinates } from '@/js/coords/CoordinateToWKT'
import Roaming from '@/js/roaming/Roaming'
import Add from '@/views/gridPlan/Add.vue'

// 面板状态
const viewer = ViewInit.viewer
const planFlage = ref(true)
const addFlage = ref(false)
const editData = ref(null)

// 搜索条件
const searchText = ref(null)
const selectedDateTime = ref([])
const selectedFlightMode = ref(null)
const selectedFlightPurpose = ref(null)
const selectAll = ref(false)
const isIndeterminate = ref(false)

// 选项数据
const flightModeOptions = [
  { label: '视距外飞行', value: '视距外飞行' },
  { label: '视距内飞行', value: '视距内飞行' },
]
const flightPurposeOptions = [
  { label: '个人娱乐', value: '个人娱乐' },
  { label: '短途运输', value: '短途运输' },
  { label: '包机飞行', value: '包机飞行' },
]

// 表格数据
const tableData = ref([])
const originalData = ref([])
const tableSelected_Map = new Map()
const loading = ref(false)

// 分页参数
const pagination = reactive({
  pageNumber: 1,
  pageSize: 10,
  total: 0,
})

// 计算属性
const selectedCount = computed(() => tableData.value.filter((item) => item.selected).length)
const filteredTotal = computed(() => getFilteredData().length)

// 面板切换
function isShowPlan(flage) {
  planFlage.value = flage
}
function isShowAdd(flage) {
  addFlage.value = flage
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = { regionCode: ViewInit.regionCode }
    const res = await planAPI.getPlans(params)
    if (res.ecode === 0 && res.data?.length) {
      originalData.value = res.data.map((item) => ({
        ...item,
        selected: false,
        loading: false,
      }))
      pagination.total = res.data.length
      updateTableData()
    } else {
      originalData.value = []
      tableData.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    originalData.value = []
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 前端分页
function updateTableData() {
  const filteredData = getFilteredData()
  pagination.total = filteredData.length
  const start = (pagination.pageNumber - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  tableData.value = filteredData.slice(start, end)
}

// 筛选数据
function getFilteredData() {
  let data = [...originalData.value]
  if (searchText.value) {
    data = data.filter((item) =>
      item.planName?.toLowerCase().includes(searchText.value.toLowerCase()),
    )
  }
  if (selectedDateTime.value && selectedDateTime.value.length === 2) {
    const [startDate, endDate] = selectedDateTime.value
    const start = dayjs(startDate).startOf('day')
    const end = dayjs(endDate).endOf('day')
    data = data.filter((item) => {
      const createTime = dayjs(item.createTime)
      const updateTime = dayjs(item.updateTime)
      return (
        (createTime.isValid() && createTime.isBetween(start, end, null, '[]')) ||
        (updateTime.isValid() && updateTime.isBetween(start, end, null, '[]'))
      )
    })
  }
  if (selectedFlightMode.value !== null && selectedFlightMode.value !== undefined) {
    data = data.filter((item) => item.flightMode === selectedFlightMode.value)
  }
  if (selectedFlightPurpose.value !== null && selectedFlightPurpose.value !== undefined) {
    data = data.filter((item) => item.flightPurpose === selectedFlightPurpose.value)
  }
  return data
}

function handleSearch() {
  pagination.pageNumber = 1
  updateTableData()
  updateSelectedLayers()
}
function handleDateSearch() {
  pagination.pageNumber = 1
  updateTableData()
  updateSelectedLayers()
}
function handleFlightMode() {
  pagination.pageNumber = 1
  updateTableData()
  updateSelectedLayers()
}
function handleFlightPurposeh() {
  pagination.pageNumber = 1
  updateTableData()
  updateSelectedLayers()
}

// 创建
function handleCreate() {
  editData.value = null
  isShowPlan(false)
  isShowAdd(true)
}

// 重置
function handleReset() {
  searchText.value = null
  selectedDateTime.value = []
  selectedFlightMode.value = null
  selectedFlightPurpose.value = null
  pagination.pageNumber = 1
  removeAllLayers()
  originalData.value.forEach((item) => (item.selected = false))
  selectAll.value = false
  isIndeterminate.value = false
  updateTableData()
}

// 更新筛选后的选中图层
function updateSelectedLayers() {
  const selectedIds = new Set(
    getFilteredData()
      .filter((item) => item.selected)
      .map((item) => item.planId),
  )
  Array.from(tableSelected_Map.keys()).forEach((id) => {
    if (!selectedIds.has(id)) {
      removeLayerById(id)
      const target = originalData.value.find((item) => item.planId === id)
      if (target) target.selected = false
    }
  })
  updateSelectAllState()
}

// 移除所有图层
function removeAllLayers() {
  Array.from(tableSelected_Map.keys()).forEach((id) => removeLayerById(id))
}

// 全选
function handleSelectAll(val) {
  tableData.value.forEach((item) => {
    item.selected = val
    if (val) {
      handleItemSelect(item)
    } else {
      removeLayerById(item.planId)
    }
  })
  isIndeterminate.value = false
}

// 更新全选/半选状态
function updateSelectAllState() {
  const selectedCnt = tableData.value.filter((item) => item.selected).length
  const totalCnt = tableData.value.length
  if (totalCnt === 0) {
    isIndeterminate.value = false
    selectAll.value = false
  } else {
    selectAll.value = selectedCnt === totalCnt
    isIndeterminate.value = selectedCnt > 0 && selectedCnt < totalCnt
  }
}

// 单选
async function handleItemSelect(row) {
  const id = row.planId
  if (row.selected) {
    if (!hasLayer(id)) {
      try {
        const res = await planAPI.getDetails(row.planId)
        if (res.ecode === 0) addLayerById(res.data)
      } catch (error) {
        console.error('加载计划详情失败:', error)
        row.selected = false
      }
    }
  } else {
    if (hasLayer(id)) removeLayerById(row.planId)
  }
  updateSelectAllState()
}

// 添加图层
function addLayerById(data) {
  const { planId, collectionGeoJson, flightPlan, drone } = data
  const planGrid = addPlanGrid(planId, collectionGeoJson)
  const wktLine = addWKTLine(planId, flightPlan)
  const roaming = addRoaming(flightPlan, drone)
  tableSelected_Map.set(planId, { planGrid, wktLine, roaming })
}
function addPlanGrid(id, geojson) {
  return new GridDraw({
    url: geojson,
    name: 'roamGird',
    Type: `${id}Gird`,
    fillColor: 'rgba(0, 102, 255, 0.5)',
    outlineColor: 'rgba(0, 102, 255, 1)',
  }).addTo(viewer)
}
function addWKTLine(id, wkt) {
  const res = wktToCoordinates(wkt)
  if (!res || !res.coordinates || res.coordinates.length === 0) return
  const flatArr = res.coordinates.flatMap((c) => [c.lng, c.lat, c.height ?? 0])
  const entity = new Cesium.Entity({
    Type: `${id}roamGirdPolygon`,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(flatArr),
      width: 2,
      material: Cesium.Color.fromCssColorString('rgba(78, 143, 252, 1)'),
      disableDepthTestDistance: 50000,
    },
  })
  viewer.entities.add(entity)
  return entity
}
function addRoaming(wkt, model) {
  const res = wktToCoordinates(wkt)
  if (!res || !res.coordinates || res.coordinates.length === 0) return
  const flatArr = res.coordinates.flatMap((c) => [c.lng, c.lat, c.height ?? 0])
  const cartesian3Lines = Cesium.Cartesian3.fromDegreesArrayHeights(flatArr)
  const roaming = new Roaming(viewer, { time: 30 })
  const modelOptions = { minimumPixelSize: 64, scale: 5 }
  if (model) modelOptions.uri = `${model}`
  roaming.modelRoaming({ model: modelOptions, Lines: cartesian3Lines, path: { show: false } })
  return roaming
}
function hasLayer(id) {
  return tableSelected_Map.has(id)
}
function removeLayerById(id) {
  const item = tableSelected_Map.get(id)
  if (item) {
    item.planGrid.remove()
    viewer.entities.remove(item.wktLine)
    item.roaming.EndRoaming()
    tableSelected_Map.delete(id)
  }
}

// 编辑
function handleItemEdit(row) {
  editData.value = { ...row }
  isShowPlan(false)
  isShowAdd(true)
}

// 删除
async function handleItemDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除空域 "${row.planName}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    loading.value = true
    const res = await planAPI.deletePlan(row.planId)
    if (res.ecode === 0) {
      await loadData()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.emsg || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  } finally {
    loading.value = false
  }
}

function handleCurrentChange(page) {
  pagination.pageNumber = page
  updateTableData()
}
function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.pageNumber = 1
  updateTableData()
}

onMounted(() => {
  loadData()
})
</script>

<style lang="less" scoped>
.main-container {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 500px;
  height: 100%;
  flex-shrink: 0;
  background: #222222;
  padding: 16px;
  overflow-y: auto;

  .title {
    display: flex;
    width: 100%;
    height: 48px;
    padding: 0;
    margin-bottom: 12px;
    align-items: center;
    flex-shrink: 0;
    color: #fbfbfb;
    font-family: 'Alibaba PuHuiTi 2.0';
    font-size: 16px;
    font-style: normal;
    font-weight: 500;
    line-height: 28px;
  }

  .row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;

    > :deep(.el-input),
    > :deep(.el-date-picker) {
      width: 100%;
    }

    .half-width {
      flex: 1;

      :deep(.el-select) {
        width: 100%;
      }
    }

    &.action-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .content-area {
    margin: 0 0 12px 0;
    min-height: 200px;

    .no-data {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: #909399;
    }

    .content-item {
      margin-bottom: 16px;

      .content-card {
        border: 1px solid #3c3c3c;
        border-radius: 6px;
        padding: 16px;
        background: #222222;
        transition: all 0.3s;

        &:hover {
          border: 2px solid #409eff;

          &:has(.checkbox_item .el-checkbox__input.is-checked) {
            border-color: #67c23a !important;
          }
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .time-range {
            display: flex;
            align-items: center;
            gap: 8px;

            .time-text {
              font-size: 13px;
              color: #409eff;
              font-weight: 500;
            }

            .arrow-icon {
              color: #909399;
              font-size: 12px;
            }
          }

          .planName-text {
            color: #409eff;
            font-family: 'Alibaba PuHuiTi 2.0';
            font-size: 13px;
            font-style: normal;
            font-weight: 400;
            line-height: 24px;
          }
        }

        :deep(.card-divider) {
          margin: 12px 0;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .info-list {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .info-row {
              display: flex;
              align-items: center;
              font-size: 13px;

              .info-label {
                color: #909399;
                min-width: 90px;
                text-align: right;
                margin-right: 8px;
              }

              .info-value {
                color: #606266;
                font-weight: 500;
                flex: 1;

                &.serial-number {
                  font-family: 'Monaco', 'Consolas', monospace;
                  font-size: 12px;
                  color: #999;
                }
              }
            }
          }

          .btn-row {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
        }
      }
    }
  }

  .footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid #3a3a3a;

    .pagination {
      margin: 0;

      :deep(.el-pagination__total),
      :deep(.el-pagination__sizes),
      :deep(.el-pagination__jump) {
        margin-right: 8px !important;
      }

      :deep(.el-pagination__total) {
        font-size: 12px;
      }

      :deep(.number),
      :deep(.btn-prev),
      :deep(.btn-next) {
        min-width: 28px !important;
        height: 28px !important;
        line-height: 28px !important;
        margin: 0 2px !important;
      }

      :deep(.el-pager) {
        display: flex;
        gap: 2px;
      }

      :deep(.el-select) {
        width: 80px !important;
      }

      :deep(.el-input) {
        width: 40px !important;
      }
    }
  }
}

:deep(.editButton.is-disabled),
:deep(.deleteButton.is-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
