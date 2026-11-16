import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { buildPreviewDocument, type PreviewKind } from '../../services/markdown/preview.js'
import { CollapseIcon, CodeIcon, ExpandIcon, PreviewIcon } from '../base/ActionIcons.js'
import { IconButton } from '../base/IconButton.js'
import { IconDownloadOutline16, IconRefreshOutline16 } from '../base/icons.js'
import { CopyButton } from '../messages/CopyButton.js'
import styles from './ArtifactPreview.module.css'

export const ArtifactPreview = ({
  code,
  kind,
  loading,
  sourceHtml,
}: {
  code: string
  kind: PreviewKind
  loading: boolean
  sourceHtml: string
}) => {
  const t = useTranslate()
  const [showPreview, setShowPreview] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [revision, setRevision] = useState(0)
  const [renderedCode, setRenderedCode] = useState(code)
  const latestCode = useRef(code)
  latestCode.current = code
  useEffect(() => {
    if (!loading) {
      return
    }
    const timer = setInterval(() => setRenderedCode(latestCode.current), 600)
    return () => clearInterval(timer)
  }, [loading])
  useEffect(() => {
    if (!loading) {
      setRenderedCode(code)
    }
  }, [code, loading])
  const document = useMemo(
    () => buildPreviewDocument(renderedCode, kind, true),
    [renderedCode, kind]
  )
  useEffect(() => {
    if (!expanded) {
      return
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [expanded])
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([code], { type: kind === 'svg' ? 'image/svg+xml' : 'text/html' })
    )
    const link = window.document.createElement('a')
    link.href = url
    link.download = `artifact.${kind}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div
      className={expanded ? styles.expanded : styles.preview}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded || undefined}
      aria-label={t('artifactPreview')}
    >
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label={t('artifactView')}>
          <button type="button" aria-pressed={showPreview} onClick={() => setShowPreview(true)}>
            <PreviewIcon />
            <span>{t('artifactPreview')}</span>
          </button>
          <button type="button" aria-pressed={!showPreview} onClick={() => setShowPreview(false)}>
            <CodeIcon />
            <span>{t('mermaidCode')}</span>
          </button>
        </div>
        <div className={styles.controls}>
          <span className={styles.language}>{kind.toUpperCase()}</span>
          <CopyButton text={code} />
          <IconButton
            className={styles.iconButton}
            icon={<IconRefreshOutline16 />}
            tooltip={t('refreshPreview')}
            onClick={() => {
              setRenderedCode(code)
              setRevision((n) => n + 1)
            }}
          />
          <button type="button" className={styles.download} onClick={download}>
            <IconDownloadOutline16 />
            <span>{t('downloadArtifact')}</span>
          </button>
          <IconButton
            className={styles.iconButton}
            icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
            tooltip={t(expanded ? 'collapsePreview' : 'expandPreview')}
            onClick={() => setExpanded(!expanded)}
          />
        </div>
      </div>
      {showPreview ? (
        <iframe
          key={revision}
          title={`${kind.toUpperCase()} ${t('artifactPreview')}`}
          className={styles.frame}
          sandbox="allow-scripts"
          srcDoc={document}
          referrerPolicy="no-referrer"
          allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'"
        />
      ) : (
        <pre className={styles.source}>
          <code dangerouslySetInnerHTML={{ __html: sourceHtml }} />
        </pre>
      )}
      {loading ? <div className={styles.progress} aria-label={t('previewStreaming')} /> : null}
    </div>
  )
}
