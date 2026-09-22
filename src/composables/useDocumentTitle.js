import { watch } from 'vue'

/** 给 <title> 赋值；传 ref 即可随状态联动 */
export function useDocumentTitle(title) {
  watch(
    title,
    (value) => {
      if (value) document.title = value
    },
    { immediate: true },
  )
}
