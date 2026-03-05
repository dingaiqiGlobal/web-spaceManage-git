import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 从 localStorage 读取主题，默认暗色
  const isDark = ref(localStorage.getItem('theme') === 'light' ? false : true)

  // 应用主题到 html 元素
  function applyTheme(dark) {
    const html = document.documentElement
    if (dark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
  // 切换主题
  function toggleTheme() {
    isDark.value = !isDark.value
  }
  // 设置主题
  function setTheme(dark) {
    isDark.value = dark
  }
  // 监听变化，同步到 DOM 和 localStorage
  watch(
    isDark,
    (val) => {
      applyTheme(val)
      localStorage.setItem('theme', val ? 'dark' : 'light')
    },
    { immediate: true },
  )
  return { isDark, toggleTheme, setTheme }
})
