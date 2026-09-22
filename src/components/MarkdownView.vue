<script setup>
import { onMounted, ref, watch } from 'vue'
import {
  buildToc,
  decorateCodeBlocks,
  finalizeContent,
  highlightAll,
  renderMarkdown,
} from '@/utils/markdown'

/**
 * Markdown 渲染组件。
 *
 * 顺序很重要：marked 解析 → DOMPurify 消毒（在 utils/markdown 里完成）→ v-html 写入 DOM
 * → 再对已落地的节点做代码块外壳、高亮与目录。
 * 高亮必须在 DOM 之后做，否则既躲不开 marked 各版本的 renderer 签名差异，
 * 也会被消毒器把高亮产生的 class 清掉。
 */
const props = defineProps({
  markdown: { type: String, default: '' },
})
const emit = defineEmits(['toc'])

const container = ref(null)
const html = ref('')

watch(
  () => props.markdown,
  (md) => {
    html.value = renderMarkdown(md)
  },
  { immediate: true },
)

const apply = () => {
  const root = container.value
  if (!root || !html.value) return
  finalizeContent(root)
  decorateCodeBlocks(root)
  highlightAll(root)
  emit('toc', buildToc(root))
}

/**
 * 这里的时序有两个坑，都是端到端测试抓出来的：
 *
 * 1. `html` 是在 setup 阶段就被 immediate 的上一个 watcher 赋值的，
 *    所以不能指望「watch html 自动跑一次」——首次挂载时它还没注册，会被整个跳过。
 *    必须用 onMounted 显式跑一遍。
 * 2. 后续正文变化时，watch 的默认时机（pre）在 DOM 更新之前，
 *    会拿到旧 DOM 去做后处理，所以要 flush: 'post'。
 */
onMounted(apply)
watch(html, apply, { flush: 'post' })
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="container" class="markdown" v-html="html" />
</template>
