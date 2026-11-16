import { useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { loadModels } from '../../services/api/client.js'
import { normalizeBaseUrl, type ApiProtocol } from '../../services/connection.js'
import {
  setApiKey,
  setConnection,
  setModel,
  setProtocol,
  useSettings,
} from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'
import styles from './ConnectionSettings.module.css'

export const ConnectionSettings = () => {
  const t = useTranslate()
  const [baseUrl, setBaseUrl] = useState(() => useSettings.getState().baseUrl)
  const [apiKey, setKey] = useState(() => useSettings.getState().apiKey ?? '')
  const [model, setModelValue] = useState(() => useSettings.getState().model)
  const [protocol, setProtocolValue] = useState(() => useSettings.getState().protocol)
  const [models, setModels] = useState(() => useSettings.getState().models)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const controller = useRef<AbortController>()
  useEffect(() => () => controller.current?.abort(), [])

  const refresh = async () => {
    controller.current?.abort()
    const task = new AbortController()
    controller.current = task
    setBusy(true)
    setError('')
    try {
      const result = await loadModels({ baseUrl, apiKey }, task.signal)
      if (task.signal.aborted) {
        return
      }
      setModels(result)
      if (!model && result[0]) {
        setModelValue(result[0])
      }
      if (result.length === 0) {
        setError(t('modelsEmpty'))
      }
    } catch (e) {
      if (!task.signal.aborted) {
        setError(e instanceof Error ? e.message : t('unknownError'))
      }
    } finally {
      if (!task.signal.aborted) {
        setBusy(false)
      }
    }
  }
  const save = () => {
    setError('')
    try {
      normalizeBaseUrl(baseUrl)
      if (!apiKey.trim() || !model.trim()) {
        setError(t('connectionRequired'))
        return
      }
      setConnection(baseUrl, apiKey.trim())
      setModel(model)
      setProtocol(protocol)
      useSettings.setState({ models })
      showToast({ key: 'connectionSaved' })
    } catch {
      setError(t('apiBaseInvalid'))
    }
  }
  const changeConnection = () => {
    controller.current?.abort()
    setBusy(false)
    setModels([])
    setError('')
  }
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <span>{t('apiProtocol')}</span>
        <Select<ApiProtocol>
          className={styles.protocol}
          ariaLabel={t('apiProtocol')}
          value={protocol}
          onChange={setProtocolValue}
          options={[
            { value: 'chat-completions', label: 'Chat Completions' },
            { value: 'responses', label: 'Responses' },
          ]}
        />
      </div>
      <label className={styles.field}>
        <span>{t('apiBaseUrl')}</span>
        <input
          type="url"
          value={baseUrl}
          placeholder="https://api.example.com/v1"
          autoComplete="off"
          onChange={(e) => {
            changeConnection()
            setBaseUrl(e.target.value)
          }}
        />
        <small>{t('apiBaseHelp')}</small>
      </label>
      <div className={styles.field}>
        <label htmlFor="connection-key">API Key</label>
        <div className={styles.keyRow}>
          <input
            id="connection-key"
            type={visible ? 'text' : 'password'}
            value={apiKey}
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              changeConnection()
              setKey(e.target.value)
            }}
          />
          <button type="button" onClick={() => setVisible(!visible)}>
            {t(visible ? 'hideKey' : 'showKey')}
          </button>
        </div>
      </div>
      <label className={styles.field}>
        <span>{t('chatModel')}</span>
        <div className={styles.modelRow}>
          <input
            list="connection-models"
            value={model}
            placeholder="deepseek-chat"
            spellCheck={false}
            onChange={(e) => setModelValue(e.target.value)}
          />
          <Button
            variant="outlined"
            size="s"
            disabled={busy || !baseUrl || !apiKey}
            onClick={() => void refresh()}
          >
            {t(busy ? 'modelsLoading' : 'fetchModels')}
          </Button>
        </div>
        <datalist id="connection-models">
          {models.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <small>{t('modelHelp')}</small>
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button onClick={save}>{t('saveConnection')}</Button>
        <Button
          variant="outlined"
          onClick={() => {
            setApiKey(null)
            setKey('')
            setModels([])
            showToast({ key: 'keyCleared' })
          }}
          disabled={!apiKey}
        >
          {t('clearKey')}
        </Button>
      </div>
      <p className={styles.note}>{t('connectionStorageHelp')}</p>
    </div>
  )
}
