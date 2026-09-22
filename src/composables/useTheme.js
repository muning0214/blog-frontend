import { computed, ref } from 'vue'

const THEME_KEY = 'devlog-theme'

/**
 * 主题用模块级状态而不是 provide/inject：
 * 页头的切换按钮和 App.vue 里的 antd 主题算法都要读它，
 * 放在模块里最省事，也不需要为了一个布尔值套一层 provider。
 */
const theme = ref(
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light',
)

function apply(next) {
  theme.value = next
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* 隐私模式下 localStorage 不可写，忽略 */
  }
}

export function useTheme() {
  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    toggleTheme: () => apply(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
