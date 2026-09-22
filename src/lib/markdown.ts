import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'

/**
 * 按需注册语言，而不是引入 highlight.js 的全量（或 common）包。
 * 全量包约 900KB，common 约 250KB；下面十九种覆盖了技术博客的绝大多数代码块，
 * 编译后只占几十 KB。
 */
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGUAGES = {
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  markdown,
  php,
  python,
  ruby,
  rust,
  sql,
  typescript,
  xml,
  yaml,
}

Object.entries(LANGUAGES).forEach(([name, def]) => hljs.registerLanguage(name, def))

// Markdown 里常见的别名，让 ```ts / ```html / ```sh 都能命中高亮
const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'xml',
  vue: 'xml',
  svg: 'xml',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
  golang: 'go',
  'c#': 'csharp',
  'c++': 'cpp',
  cs: 'csharp',
  md: 'markdown',
  jsonc: 'json',
  psql: 'sql',
  postgres: 'sql',
  toml: 'ini',
  conf: 'ini',
  env: 'ini',
}

export function normalizeLanguage(raw: string) {
  const key = raw.trim().toLowerCase()
  if (!key) return ''
  const target = ALIASES[key] ?? key
  return hljs.getLanguage(target) ? target : ''
}

marked.setOptions({ gfm: true, breaks: true })

/*
 * 关于被删掉的一整块逻辑：
 *
 * 云端版本里正文图片用的是自定义伪协议 cloud:shared/<uid>/images/x.png，
 * 数据库只存对象键，渲染前必须异步换取短时签名地址；换不到的还要替换成
 * 「登录后查看」占位 —— 因为当时对象存储的读权限只给登录用户。
 *
 * 现在文件由后端存在自己的磁盘上，通过静态资源映射公开对外，
 * Markdown 里直接写 /uploads/images/x.png 即可，浏览器自己能解析。
 * 于是 CLOUD_REF_RE / extractCloudRefs / applyCloudRefs / 媒体占位这一整套
 * 都不再需要，渲染也从异步回到了同步。
 */

/**
 * Markdown → 安全 HTML。
 * marked 只负责解析；消毒交给 DOMPurify 的白名单。
 * 代码高亮**不在这里做** —— 它在 DOM 落地之后单独跑，这样就不需要覆写
 * marked 的 renderer（那套签名在每个大版本里都改过）。
 */
export function renderMarkdown(markdown: string): string {
  const raw = marked.parse(markdown ?? '', { async: false }) as string
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['iframe', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  })
}

/**
 * 代码高亮：针对已经在 DOM 里的节点执行。
 *
 * 不用 `hljs.highlightElement`（它会自己去读 class，遇到未注册的语言会在控制台
 * 告警），而是先归一化语言名再手动 highlight，未注册的语言静默降级为纯文本。
 */
export function highlightAll(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('pre code').forEach((el) => {
    if (el.dataset.highlighted === 'yes') return
    const declared = /(?:^|\s)language-([\w+#.-]+)/.exec(el.className)?.[1] ?? ''
    const lang = normalizeLanguage(declared)
    try {
      if (lang) {
        // hljs.highlight 会对源码做 HTML 转义，输出可以安全地写进 innerHTML
        el.innerHTML = hljs.highlight(el.textContent ?? '', {
          language: lang,
          ignoreIllegals: true,
        }).value
      }
      el.classList.add('hljs')
    } catch {
      el.classList.add('hljs')
    }
    el.dataset.highlighted = 'yes'
  })
}

/** 给每个代码块加语言角标与复制按钮 */
export function decorateCodeBlocks(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block')) return
    const code = pre.querySelector('code')
    if (!code) return

    const declared = /(?:^|\s)language-([\w+#.-]+)/.exec(code.className)?.[1] ?? ''
    const lang = normalizeLanguage(declared) || declared || 'text'

    const wrap = document.createElement('div')
    wrap.className = 'code-block'

    const bar = document.createElement('div')
    bar.className = 'code-block__bar'

    const label = document.createElement('span')
    label.className = 'code-block__lang'
    label.textContent = lang

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-block__copy'
    btn.textContent = '复制'
    btn.addEventListener('click', () => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(code.innerText)
          btn.textContent = '已复制'
        } catch {
          btn.textContent = '复制失败'
        }
        window.setTimeout(() => {
          btn.textContent = '复制'
        }, 1500)
      })()
    })

    bar.append(label, btn)
    // 先插到 pre 的位置，再把 pre 移进去，避免 React 之外的重排丢失内容
    pre.replaceWith(wrap)
    wrap.append(bar, pre)
  })
}

export type TocItem = { id: string; text: string; level: number }

/** 从已渲染的 DOM 里抽目录，不需要第二套解析器 */
export function buildToc(root: HTMLElement): TocItem[] {
  const items: TocItem[] = []
  root.querySelectorAll<HTMLElement>('h1, h2, h3').forEach((el, i) => {
    const id = `sec-${i + 1}`
    el.id = id
    items.push({
      id,
      text: (el.textContent ?? '').trim(),
      level: Number(el.tagName.slice(1)),
    })
  })
  return items
}

/**
 * 收尾处理：
 * - 图片懒加载
 * - 外链补 target / rel
 * - 去掉 javascript: 伪协议链接（消毒器之外再兜一道）
 *
 * 返回值里的 lockedMedia 只为兼容旧调用方保留：文件现在是公开静态资源，
 * 不会再出现「换不到地址」的图片。
 */
export function finalizeContent(root: HTMLElement) {
  const lockedMedia = 0

  root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    img.loading = 'lazy'
    img.decoding = 'async'
    if (!img.alt) img.alt = ''
  })

  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    }
  })

  root.querySelectorAll<HTMLAnchorElement>('a[href^="javascript:"]').forEach((a) => {
    a.removeAttribute('href')
  })

  return { lockedMedia }
}
