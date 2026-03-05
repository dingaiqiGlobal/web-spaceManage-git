<template>
  <div class="layout">
    <!-- 头部 -->
    <header class="adminui-header">
      <div class="adminui-header-left">
        <div class="logo-bar">
          <img class="logo" src="/img/icon/logo.png" />
          <span>低空空域管理</span>
        </div>
      </div>
      <div class="adminui-header-right">
        <div class="adminui-header-menu">
          <button
            class="menu-btn"
            :class="{ active: $route.name === 'gridZone' }"
            @click="router.push({ name: 'gridZone' })"
          >
            空域划设
          </button>
          <button
            class="menu-btn"
            :class="{ active: $route.name === 'gridPlan' }"
            @click="router.push({ name: 'gridPlan' })"
          >
            用空计划
          </button>
        </div>
      </div>
    </header>

    <!-- 主体 -->
    <section class="aminui-wrapper">
      <div class="adminui-main">
        <MapView />
        <router-view />
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import MapView from '@/components/mapView/index.vue'

const router = useRouter()
</script>

<style lang="less" scoped>
.layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* 头部 - 参考 laam-web-demo */
.adminui-header {
  height: 58px;
  background: #222222;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  z-index: 999;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.3);
}

.adminui-header-left {
  display: flex;
  align-items: center;
  padding-left: 20px;
}

.logo-bar {
  // font-family: 'AlibabaPuHuiTi', 'Alibaba PuHuiTi 2.0', sans-serif;
  letter-spacing: 2px;
  font-size: 22px;
  font-weight: bold;
  display: flex;
  align-items: center;
  cursor: default;

  .logo {
    margin-right: 10px;
    width: 35px;
    height: 35px;
  }
}

.adminui-header-right {
  display: flex;
  align-items: center;
  padding-right: 20px;
}

/* 菜单按钮组 */
.adminui-header-menu {
  display: flex;
  align-items: center;
  height: 100%;
}

.menu-btn {
  padding: 0 20px;
  height: 58px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 1px;
  transition:
    color 0.2s,
    background 0.2s;
  position: relative;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);

    // 底部激活线
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--el-color-primary, #409eff);
    }
  }
}

/* 主体区域 */
.aminui-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.adminui-main {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: #222;
}
</style>
