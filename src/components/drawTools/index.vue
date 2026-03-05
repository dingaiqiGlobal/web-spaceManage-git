<template>
  <div class="drawTools">
    <div class="boxtwo">
      <div class="navbox">
        <ul>
          <li v-for="item in drawList" :key="item.id" @click="handleClick(item)">
            <div class="imgbox"><img :src="item.icon" /></div>
            <p>{{ item.name }}</p>
          </li>
        </ul>
        <!-- <p>
          <el-button class="clearDataBtn" @click="handleClear">
            清空绘制
          </el-button>
        </p> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MapPlotting from '@/js/draw/MapPlotting'
import bus from '@/utils/bus.js'
import iconPolygon from '@/assets/img/draw/dpolygon.png'
import iconCircle from '@/assets/img/draw/dcricle.png'
import iconPolyline from '@/assets/img/draw/dpolyline.png'
import ViewInit from '@/components/mapView/ViewInit'

// 响应式数据
const drawList = ref([
  {
    name: '标绘面',
    id: 'drawPolygon',
    icon: iconPolygon,
    status: true,
  },
  {
    name: '标绘圆',
    id: 'drawPoint',
    icon: iconCircle,
    status: false,
  },
  {
    name: '标绘线',
    id: 'drawPolyline',
    icon: iconPolyline,
    status: true,
  },
])

// 全局 viewer
const viewer = ViewInit.viewer

// 初始化 MapPlotting
MapPlotting.init(viewer)

// 监听清空绘制事件
onMounted(() => {
  bus.on('handleClear', handleClear)
})

// 清理事件监听
onBeforeUnmount(() => {
  handleClear() // 先清空绘制
  bus.off('handleClear', handleClear) // 移除事件监听
})

// 清空绘制
const handleClear = () => {
  MapPlotting.clearDraw()
}

// 点击处理
const handleClick = (item) => {
  mapPlotting(item)
}

// 绘制逻辑
const mapPlotting = (item) => {
  let drawType = null
  switch (item.id) {
    case 'drawPoint':
      drawType = ''
      break
    case 'drawPolyline':
      drawType = ''
      break
    case 'drawPolygon':
      drawType = 'Polygon'
      break
  }
  MapPlotting.drawActivate(drawType)
}
</script>

<style lang="less" scoped>
.drawTools {
  width: 100%;
  height: 110px;
  /* height: 441px; */
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  padding-bottom: 10px;
  .boxtwo {
    width: 100%;
    .navbox {
      ul {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        list-style: none;
        margin: 0;
        padding: 0;
        li {
          width: 32%;
          text-align: center;
          margin-top: 20px;
          cursor: pointer;
          p {
            margin-top: 5px;
            font-size: 14px;
            font-family: MicrosoftYaHei;
            color: #fff;
          }
          .imgbox {
            width: 50px;
            height: 50px;
            background-image: url('@/assets/img/draw/default.png');
            position: relative;
            left: 50%;
            transform: translate(-50%, 0);
            img {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }
          }
          .imgbox:hover {
            background-image: url('@/assets/img/draw/selected.png');
          }
        }
      }
      p {
        text-align: center;
        margin-top: 16px;
      }
      .clearDataBtn {
        box-shadow: inset 0px 1px 20px 0px #4389ff;
        border-radius: 2px;
        background-color: #409eff;
      }
    }
  }
}
</style>
