import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { uploadFile, uploadToShared } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Attachment } from '../lib/types'
import { cn, extOf, formatBytes } from '../lib/utils'
import { IconClose, IconFile, IconPaperclip, IconSearch, IconUpload } from './icons'
import { Notice, Spinner } from './ui'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
const MAX_IMAGE = 6 * 1024 * 1024
const MAX_FILE = 20 * 1024 * 1024
const MAX_FILES = 8

function pickFiles(accept: string, multiple: boolean) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      input.remove()
      resolve(files)
    })
    // 用户取消时 change 不触发，靠窗口重新获得焦点兜底清理
    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (document.body.contains(input)) {
            input.remove()
            resolve([])
          }
        }, 400)
      },
      { once: true },
    )
    input.click()
  })
}

function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return '只支持 PNG / JPEG / WebP / GIF / AVIF 图片'
  if (file.size > MAX_IMAGE) return `图片不能超过 ${formatBytes(MAX_IMAGE)}`
  return null
}

/* ------------------------------------------------------------------ */
/* 封面                                                                 */
/* ------------------------------------------------------------------ */

export function CoverPicker({
  value,
  onChange,
  preview,
}: {
  value: string | null
  onChange: (path: string | null) => void
  preview?: string | null
}) {
  const { uid } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    if (!uid) {
      setError('请先登录再上传封面')
      return
    }
    const [file] = await pickFiles(IMAGE_TYPES.join(','), false)
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadToShared(uid, 'covers', file))
    } catch (e: any) {
      setError(e?.message ?? '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cover-picker">
      <div className="cover-picker__preview">
        {preview ? (
          <img src={preview} alt="封面预览" />
        ) : (
          <span className="cover-picker__ph">未设置封面</span>
        )}
      </div>
      <div className="cover-picker__side">
        <div className="cover-picker__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={choose} disabled={busy}>
            {busy ? <Spinner /> : <IconUpload width={15} height={15} />}
            {value ? '更换封面' : '上传封面'}
          </button>
          {value ? (
            <button
              type="button"
              className="btn btn--sm btn--danger-ghost"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <IconClose width={14} height={14} />
              移除
            </button>
          ) : null}
        </div>
        <p className="field__hint">
          图片存放在云端对象存储，数据库只保存对象键；页面展示时换取短时签名地址。
        </p>
        {value ? <code className="path-chip">{value.replace(/^shared\//, '')}</code> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 正文插图                                                             */
/* ------------------------------------------------------------------ */

export function InlineImageButton({
  onInsert,
  className,
}: {
  onInsert: (markdownSnippet: string) => void
  className?: string
}) {
  const { uid } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!uid) {
      setError('请先登录再插入图片')
      return
    }
    const [file] = await pickFiles(IMAGE_TYPES.join(','), false)
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const uploaded = await uploadFile('images', file)
      const alt = file.name.replace(/\.[^.]+$/, '')
      onInsert(`\n![${alt}](${uploaded.url})\n`)
    } catch (e: any) {
      setError(e?.message ?? '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className={cn('inline-upload', className)}>
      <button type="button" className="btn btn--sm btn--ghost" onClick={run} disabled={busy}>
        {busy ? <Spinner /> : <IconUpload width={14} height={14} />}
        插入图片
      </button>
      {error ? <span className="inline-upload__err">{error}</span> : null}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* 附件                                                                 */
/* ------------------------------------------------------------------ */

export function AttachmentPicker({
  value,
  onChange,
  previewUrls,
}: {
  value: Attachment[]
  onChange: (next: Attachment[]) => void
  previewUrls: Record<string, string>
}) {
  const { uid } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const run = async () => {
    if (!uid) {
      setError('请先登录再上传附件')
      return
    }
    const files = await pickFiles('*/*', true)
    if (!files.length) return

    const room = MAX_FILES - valueRef.current.length
    if (room <= 0) {
      setError(`最多保留 ${MAX_FILES} 个附件`)
      return
    }
    const chosen = files.slice(0, room)

    setBusy(true)
    setError(null)
    const added: Attachment[] = []
    try {
      for (const file of chosen) {
        if (file.size > MAX_FILE) {
          setError(`「${file.name}」超过 ${formatBytes(MAX_FILE)}，已跳过`)
          continue
        }
        const path = await uploadToShared(uid, 'attachments', file)
        added.push({
          name: file.name,
          path,
          size: file.size,
          mime: file.type || 'application/octet-stream',
        })
      }
      if (added.length) onChange([...valueRef.current, ...added])
    } catch (e: any) {
      if (added.length) onChange([...valueRef.current, ...added])
      setError(e?.message ?? '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="attach-picker">
      <div className="attach-picker__head">
        <button type="button" className="btn btn--ghost btn--sm" onClick={run} disabled={busy}>
          {busy ? <Spinner /> : <IconPaperclip width={15} height={15} />}
          上传附件
        </button>
        <span className="field__hint">
          单个不超过 {formatBytes(MAX_FILE)}，最多 {MAX_FILES} 个
        </span>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {value.length ? (
        <ul className="attach-list">
          {value.map((a) => (
            <li key={a.path} className="attach-list__item">
              <span className="attach-list__icon">
                {previewUrls[a.path] ? (
                  <img src={previewUrls[a.path]} alt="" />
                ) : (
                  <IconFile width={16} height={16} />
                )}
              </span>
              <span className="attach-list__name" title={a.name}>
                {a.name}
              </span>
              <span className="attach-list__size">
                {formatBytes(a.size)}
                {extOf(a.name) ? <em>{extOf(a.name)}</em> : null}
              </span>
              <button
                type="button"
                className="attach-list__remove"
                onClick={() => onChange(value.filter((x) => x.path !== a.path))}
                aria-label={`移除 ${a.name}`}
              >
                <IconClose width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="attach-picker__empty">还没有附件。附件会和文章一起保存，读者可在文末下载。</p>
      )}
    </div>
  )
}

/** 编辑器顶部工具条上的搜索图标占位导出，避免未使用告警 */
export const SearchGlyph = IconSearch

/* 让编辑器在卸载时释放临时 objectURL */
export function useRevokeOnUnmount(urls: Record<string, string>) {
  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
