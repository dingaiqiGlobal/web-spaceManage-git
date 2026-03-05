<template>
  <div id="cesiumContainer"></div>
</template>

<script setup>
import { onMounted } from 'vue'
import ViewInit from './ViewInit'

onMounted(() => {
  ViewInit.init()
})
</script>

<style lang="less" scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
