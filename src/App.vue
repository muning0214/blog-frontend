<script setup>
import { computed } from 'vue'
import { theme as antdTheme } from 'ant-design-vue'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

/**
 * 把 antd 的主色与圆角对齐到站点自己的设计变量（--accent / --radius）。
 * 不这么做的话，antd 的组件（输入框、弹窗、表格）会是默认的蓝色，
 * 和页面其余部分对不上。
 */
const themeConfig = computed(() => ({
  algorithm: isDark.value ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#5145e5',
    colorInfo: '#5145e5',
    colorLink: isDark.value ? '#b3b4ff' : '#4338ca',
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', Roboto, Helvetica, Arial, sans-serif",
    colorBgContainer: isDark.value ? '#171b23' : '#ffffff',
    colorBgElevated: isDark.value ? '#1c212b' : '#ffffff',
    colorBorder: isDark.value ? '#242a35' : '#e7e9ef',
    colorBorderSecondary: isDark.value ? '#242a35' : '#e7e9ef',
    colorText: isDark.value ? '#e9ecf3' : '#12141a',
    colorTextSecondary: isDark.value ? '#a9b2c2' : '#4c5566',
  },
}))
</script>

<template>
  <!--
    auto-insert-space-in-button：antd 默认会在两个汉字的按钮文案中间插一个空格
    （「发布」变「发 布」），既破坏排版，也让基于文案的判断失效，关掉。
    注意它是 ConfigProvider 的顶层 prop，不是 theme 里的 token —— 放错位置不会生效。
  -->
  <a-config-provider :theme="themeConfig" :auto-insert-space-in-button="false">
    <router-view />
  </a-config-provider>
</template>
