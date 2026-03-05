<template>
  <router-view />
</template>

<script setup>
import { useThemeStore } from '@/stores/theme'
useThemeStore()
</script>

<style lang="less"></style>
