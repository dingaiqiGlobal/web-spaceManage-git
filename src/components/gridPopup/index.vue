<template>
  <div class="grid-info-container" :style="containerStyle">
    <!-- 头部信息 -->
    <div class="header">
      <div class="grid-info">网格信息</div>
      <div class="grid-number">网格编号：{{ gridsDetails.gridNumber }}</div>
      <div class="close" @click="handleClose">×</div>
    </div>

    <!-- 四宫格信息 -->
    <div class="four-grid">
      <div class="grid-item">
        <div class="item-header">安全指数</div>
        <div class="item-content">{{ gridsDetails.safetyIndex }}</div>
        <div class="item-icon">
          <img src="@/assets/img/popup/anquanzhishu.png" />
        </div>
      </div>
      <div class="grid-item">
        <div class="item-header">预测占用</div>
        <div class="item-content">{{ gridsDetails.time }}</div>
        <div class="item-icon">
          <img src="@/assets/img/popup/yucezhanyong.png" />
        </div>
      </div>
      <div class="grid-item">
        <div class="item-header">当前占用情况</div>
        <div class="item-content">{{ gridsDetails.occupancy }}</div>
        <div class="item-icon">
          <img src="@/assets/img/popup/zhanyongqingkuang.png" />
        </div>
      </div>
      <div class="grid-item">
        <div class="item-header">当前空域类型</div>
        <div class="item-content">{{ gridsDetails.gridType }}</div>
        <div class="item-icon">
          <img src="@/assets/img/popup/kongyuleixing.png" />
        </div>
      </div>
    </div>

    <!-- 三列信息 -->
    <div class="three-columns">
      <div class="column-item">
        <div class="column-icon">
          <img src="@/assets/img/popup/fengsu.png" />
        </div>
        <div class="column-value">{{ gridsDetails.windSpeed }} m/s</div>
        <div class="column-label">风速</div>
      </div>
      <div class="column-item">
        <div class="column-icon">
          <img src="@/assets/img/popup/tianqi.png" />
        </div>
        <div class="column-value">
          {{ gridsDetails.weatherQuality }}
        </div>
        <div class="column-label">天气</div>
      </div>
      <div class="column-item">
        <div class="column-icon">
          <img src="@/assets/img/popup/nengjiandu.png" />
        </div>
        <div class="column-value">{{ gridsDetails.visibility }} km</div>
        <div class="column-label">能见度</div>
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="bottom-info">
      <div class="info-item">
        <span class="info-icon"><img src="@/assets/img/popup/tongxinxinhao.png" /></span>
        <span class="info-label">通信信号</span>
        <span class="info-value">{{ gridsDetails.signalQuality }}</span>
      </div>
      <div class="info-item">
        <span class="info-icon"><img src="@/assets/img/popup/cns.png" /></span>
        <span class="info-label">CNS</span>
        <span class="info-value">{{ gridsDetails.cns }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 定义props
const props = defineProps({
  gridsDetails: {
    type: Object,
    required: true,
  },
  close: {
    type: Function,
    default: null,
  },
})

// 定义事件
const emit = defineEmits(['close'])

// 背景图片映射
const backgroundImages = {
  适飞区: new URL('@/assets/img/popup/bg_shifeiqu.png', import.meta.url).href,
  管制区: new URL('@/assets/img/popup/bg_guanzhiqu.png', import.meta.url).href,
  禁飞区: new URL('@/assets/img/popup/bg_jinfeiqu.png', import.meta.url).href,
}

// 计算容器样式
const containerStyle = computed(() => {
  const imageUrl = backgroundImages[props.gridsDetails.gridType] || backgroundImages['适飞区']
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})

// 关闭处理函数
const handleClose = () => {
  if (props.close) {
    props.close()
  } else {
    emit('close')
  }
}
</script>

<style lang="less" scoped>
.grid-info-container {
  width: 350px;
  height: 312px;
  padding: 20px;
  box-sizing: border-box;
  color: #fbfbfb;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 头部样式 */
.header {
  margin-bottom: 4px;
  position: relative;
}
.close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 12px;
  height: 12px;
  cursor: pointer;
}

.grid-info {
  color: #fbfbfb;
  text-shadow: 0 0 6px #eca832;
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 14px;
  font-style: normal;
  font-weight: 490;
  line-height: 19px;
}

.grid-number {
  color: #fbfbfb;
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 18px;
}

/* 四宫格样式 */
.four-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}

.grid-item {
  width: 155px;
  height: 50px;
  flex-shrink: 0;
  background: rgba(251, 251, 251, 0.1);
  border-radius: 4px;
  padding: 8px 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-header {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 8px;
  color: rgba(251, 251, 251, 0.8);
}

.item-content {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 10px;
  font-weight: 500;
  color: #fbfbfb;
}

.item-icon {
  position: absolute;
  right: 12px;
  font-size: 20px;
  transform: scale(0.7);
}

/* 三列信息样式 */
.three-columns {
  display: flex;
  width: 312px;
  height: 72px;
  padding: 0 12px;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(251, 251, 251, 0.1) 0%, rgba(251, 251, 251, 0) 100%);
  border-radius: 4px;
}

.column-item {
  width: 100px;
  height: 70px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transform: scale(0.7);
}

.column-icon {
  font-size: 16px;
}

.column-value {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 12px;
  font-weight: 490;
  color: #fbfbfb;
}

.column-label {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 10px;
  color: rgba(251, 251, 251, 0.8);
}

/* 底部信息样式 */
.bottom-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 312px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-icon {
  font-size: 11px;
  margin-right: 6px;
  transform: scale(0.7);
}

.info-label {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 10px;
  color: #fbfbfb;
  flex: 1;
}

.info-value {
  font-family: 'Alibaba PuHuiTi 2.0';
  font-size: 10px;
  font-weight: 350;
  color: #fbfbfb;
}
</style>
