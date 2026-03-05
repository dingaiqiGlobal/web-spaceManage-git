<!--
 * @Author: dys
 * @Date: 2025-10-19 00:44:36
 * @LastEditors: dys
 * @LastEditTime: 2025-10-21 14:42:59
 * @Descripttion: 
-->
<template>
  <el-container class="legend-container">
    <el-header class="legend-header">
      <span>图例</span>
    </el-header>
    <el-main class="legend-main">
      <el-row class="legend-row" justify="center">
        <el-col :span="4" class="legend-col">
          <div class="color-block fly"></div>
        </el-col>
        <el-col :span="20" class="legend-col">
          <span class="legend-text">适飞区</span>
        </el-col>
      </el-row>
      <el-row class="legend-row" justify="center">
        <el-col :span="4" class="legend-col">
          <div class="color-block isFly"></div>
        </el-col>
        <el-col :span="20" class="legend-col">
          <span class="legend-text">管制区</span>
        </el-col>
      </el-row>
      <el-row class="legend-row" justify="center">
        <el-col :span="4" class="legend-col">
          <div class="color-block noFly"></div>
        </el-col>
        <el-col :span="20" class="legend-col">
          <span class="legend-text">禁飞区</span>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup>
// 使用 Vue 3 的组合式 API
// 由于组件没有逻辑，只需要定义组件名称
// 如果需要定义组件名称，可以添加一个额外的 script 标签
defineOptions({
  name: 'Legend',
})
</script>

<style lang="less" scoped>
.legend-container {
  position: absolute;
  bottom: 35px;
  left: 50px;
  width: 120px;
  height: 140px;
  background: rgba(34, 34, 34, 0.7);
  border: 1px solid #616161;
}

.legend-header {
  display: flex;
  align-items: center;
  background: rgba(34, 34, 34, 0.7);
  justify-content: center;
  border-bottom: 1px solid #616161;
  height: 10%;
  font-size: 14px;
  color: #fbfbfb;
}
.legend-row {
  margin-bottom: 12px;
}
.legend-col {
  display: flex;
  align-items: center;
  span {
    padding: 2px;
  }
}
.color-block {
  width: 14px;
  height: 14px;
  border: 1px solid #616161;
  margin:
    2px 0px 0px,
    0px;
}
.legend-text {
  font-size: 12px;
  color: #fbfbfb;
}
.fly {
  background: #52c41a;
}

.isFly {
  background: #ffee00;
}

.noFly {
  background: #ff4d4f;
}
</style>
