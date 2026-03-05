<template>
  <el-container v-if="drawFlage" class="main-container">
    <!-- 标题 -->
    <el-header class="title">
      <span>空域划设</span>
    </el-header>

    <!-- 创建按钮+搜索框 -->
    <div class="toolbar-row">
      <el-button type="primary" @click="handleCreate" class="create-btn">
        <el-icon><el-icon-Plus /></el-icon>
        创建
      </el-button>
      <el-input
        v-model="searchText"
        placeholder="搜索"
        clearable
        @input="handleSearch"
        class="search-input"
      >
        <template #suffix>
          <el-icon class="search-icon"><el-icon-Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 使用类型+使用情况 -->
    <div class="row">
      <div class="half-width">
        <el-select
          v-model="selectedGridType"
          placeholder="筛选使用类型"
          clearable
          @change="handleGridType"
        >
          <el-option
            v-for="item in gridTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="half-width">
        <el-select
          v-model="selectedUseType"
          placeholder="筛选使用情况"
          clearable
          @change="handleUseType"
        >
          <el-option
            v-for="item in useTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 内容区域:列表 -->
    <el-main class="main-content">
      <el-table
        :data="tableData"
        v-loading="loading"
        :header-cell-style="{ background: '#f5f7fa', color: '#fbfbfb' }"
        stripe
      >
        <el-table-column label="名称" min-width="160" header-align="center">
          <template #default="scope">
            <span class="name-text">{{ scope.row.zoneName }}</span>
          </template>
        </el-table-column>

        <el-table-column label="类型" min-width="80" header-align="center">
          <template #default="scope">
            <el-tag :type="getTypeTagType(scope.row.zoneType)" effect="light">
              {{ getZoneType(scope.row.zoneType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" header-align="center">
          <template #default="scope">
            <el-button
              link
              size="small"
              :loading="scope.row.loading"
              :disabled="scope.row.loading"
              :icon="
                !scope.row.loading && scope.row.zoneStatus === 1
                  ? 'el-icon-lock'
                  : !scope.row.loading && scope.row.zoneStatus === 0
                    ? 'el-icon-unlock'
                    : ''
              "
              @click="handleShow(scope.row)"
            >
              {{ scope.row.zoneStatus === 1 ? '已占用' : '已释放' }}
            </el-button>
            <el-button link size="small" icon="el-icon-edit" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button
              link
              size="small"
              icon="el-icon-delete"
              type="danger"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
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
    @show-draw="isShowDraw"
    @show-add="isShowAdd"
    @reload="loadData"
  />
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

import { zoneAPI } from '@/api/model/laam'

import bus from '@/utils/bus.js'
import { ElMessageBox, ElMessage } from 'element-plus'

import ViewInit from '@/components/mapView/ViewInit'
import Add from '@/views/gridZone/Add.vue'

// 面板显示
const drawFlage = ref(true)
const addFlage = ref(false)
const editData = ref(null)

// 搜索条件
const searchText = ref(null)
const selectedGridType = ref(null)
const selectedUseType = ref(null)

// 选项数据
const gridTypeOptions = [
  { label: '适飞区', value: 1 },
  { label: '管制区', value: 2 },
  { label: '禁飞区', value: 3 },
]
const useTypeOptions = [
  { label: '已释放', value: 0 },
  { label: '已占用', value: 1 },
]

// 表格数据
const tableData = ref([])
const originalData = ref([])
const loading = ref(false)
const operatingRows = new Set()

// 分页参数
const pagination = reactive({
  pageNumber: 1,
  pageSize: 10,
  total: 0,
})

// 面板切换
function isShowDraw(flage) {
  drawFlage.value = flage
}
function isShowAdd(flage) {
  addFlage.value = flage
}

// 获取标签样式
function getTypeTagType(type) {
  const typeMap = { 1: 'success', 2: 'warning', 3: 'danger' }
  return typeMap[type] || 'info'
}
function getZoneType(type) {
  const typeMap = { 1: '适飞区', 2: '管制区', 3: '禁飞区' }
  return typeMap[type] || '未知'
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const params = { regionCode: ViewInit.regionCode }
    const res = await zoneAPI.getZones(params)
    if (res.ecode === 0 && res.data?.length) {
      originalData.value = res.data.map((item) => ({
        ...item,
        loading: false,
      }))
      pagination.total = originalData.value.length
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
      item.zoneName?.toLowerCase().includes(searchText.value.toLowerCase()),
    )
  }
  if (selectedGridType.value !== null && selectedGridType.value !== undefined) {
    data = data.filter((item) => item.zoneType === selectedGridType.value)
  }
  if (selectedUseType.value !== null && selectedUseType.value !== undefined) {
    data = data.filter((item) => item.zoneStatus === selectedUseType.value)
  }
  return data
}

// 创建
function handleCreate() {
  editData.value = null
  isShowDraw(false)
  isShowAdd(true)
}

// 搜索/筛选
function handleSearch() {
  pagination.pageNumber = 1
  updateTableData()
}
function handleGridType() {
  pagination.pageNumber = 1
  updateTableData()
}
function handleUseType() {
  pagination.pageNumber = 1
  updateTableData()
}

// 占用/释放
async function handleShow(row) {
  let { zoneId, zoneStatus } = row
  if (operatingRows.has(zoneId) || row.loading) return
  zoneStatus = zoneStatus === 1 ? 0 : 1
  const actionText = zoneStatus === 1 ? '占用' : '释放'
  try {
    await ElMessageBox.confirm(`确定要${actionText}空域 "${row.zoneName}" 吗？`, '操作确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const targetRow = tableData.value.find((item) => item.zoneId === zoneId)
    if (targetRow) targetRow.loading = true
    operatingRows.add(zoneId)
    const res = await zoneAPI.updateZoneStatus(zoneId, zoneStatus)
    if (res.ecode === 0) {
      await loadData()
      if (row.boundary) {
        const extent = parseWKTPolygonToExtent(row.boundary)
        bus.emit('refreshGridsByExtent', extent)
      }
      ElMessage.success(`${actionText}成功`)
    } else {
      ElMessage.error(res.emsg || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('操作失败')
  } finally {
    const targetRow = tableData.value.find((item) => item.zoneId === zoneId)
    if (targetRow) targetRow.loading = false
    operatingRows.delete(zoneId)
  }
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

// 编辑
async function handleEdit(row) {
  editData.value = { ...row }
  isShowDraw(false)
  isShowAdd(true)
  //地图刷新
  if (ViewInit.viewer.scene) {
    ViewInit.viewer.scene.requestRender()
  }
}

// 删除
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除空域 "${row.zoneName}" 吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    loading.value = true
    const res = await zoneAPI.deleteZone(row.zoneId)
    if (res.ecode === 0) {
      if (row.boundary) {
        const extent = parseWKTPolygonToExtent(row.boundary)
        bus.emit('refreshGridsByExtent', extent)
      }
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

// 分页
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

  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .create-btn {
      height: 36px;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      .search-icon {
        color: #409eff;
      }
    }
  }

  .row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;

    .half-width {
      flex: 1;

      :deep(.el-select) {
        width: 100%;
      }
    }
  }

  .main-content {
    padding: 0;
    margin-bottom: 12px;

    .name-text {
      font-weight: 500;
      color: #fbfbfb;
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

      /* 减少分页组件的内部间距 */
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

/* loading动画样式 */
:deep(.el-button.is-loading) {
  .el-icon {
    animation: rotating 2s linear infinite;
  }
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
