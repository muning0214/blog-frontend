import { useEffect, useRef, useState } from 'react'
import {
  buildToc,
  decorateCodeBlocks,
  finalizeContent,
  highlightAll,
  renderMarkdown,
  type TocItem,
} from '../lib/markdown'
import { cn } from '../lib/utils'

type Props = {
  markdown: string
  className?: string
  onToc?: (items: TocItem[]) => void
  /** 已废弃：云端版本用它统计「被锁住的媒体」。现在文件是公开静态资源，不会再有锁。 */
  onLockedMedia?: (count: number) => void
}

/**
 * Markdown 渲染组件。
 *
 * 迁移前后的最大差别是它变成了**同步**的：
 * 之前必须先异步把正文里的 cloud: 引用换成短时签名地址，整个渲染因此挂在异步流程上。
 * 现在图片就是普通的静态资源路径，解析 → 消毒 → 写 DOM → 高亮可以连着做完，
 * 少了一次网络往返，也不用再处理 loading 与失败降级。
 */
export function MarkdownView({ markdown, className, onToc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState('')

  useEffect(() => {
    setHtml(renderMarkdown(markdown ?? ''))
  }, [markdown])

  useEffect(() => {
    const root = containerRef.current
    if (!root || !html) return
    root.innerHTML = html
    // 顺序不能换：先补全链接与图片属性，再套代码块外壳，最后做高亮
    finalizeContent(root)
    decorateCodeBlocks(root)
    highlightAll(root)
    onToc?.(buildToc(root))
  }, [html, onToc])

  return <div ref={containerRef} className={cn('markdown', className)} />
}
