import { useTranslate } from '../../i18n/index.js'
import { useSettings } from '../../services/settings.js'
import { getRequestMetrics } from '../../services/chat/metrics.js'
import type { AssistantMessage } from '../../services/chat/types.js'
import { ClockIcon, InputTokensIcon, OutputTokensIcon } from '../base/ActionIcons.js'
import styles from './RequestStats.module.css'

export const RequestStats = ({ message }: { message: AssistantMessage }) => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const metrics = getRequestMetrics(message)
  const number = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString(locale)
  const duration =
    metrics.durationMs === undefined ? '—' : `${(metrics.durationMs / 1000).toFixed(2)} ${t('secondsUnit')}`
  return (
    <div className={styles.stats} aria-label={t('requestStats')}>
      <time dateTime={new Date(metrics.startedAt).toISOString()}>
        {new Date(metrics.startedAt).toLocaleTimeString(locale, { hour12: false })}
      </time>
      <span className={styles.duration} aria-label={`${t('responseTime')} ${duration}`}>
        <ClockIcon />
        <b>{duration}</b>
      </span>
      <span
        aria-label={`${t('inputTokens')} ${number(metrics.inputTokens)}`}
        title={metrics.inputTokens === undefined ? t('usageUnavailable') : undefined}
      >
        <InputTokensIcon />
        <b>{number(metrics.inputTokens)}</b>
      </span>
      <span
        aria-label={`${t('outputTokens')} ${number(metrics.outputTokens)}`}
        title={metrics.outputTokens === undefined ? t('usageUnavailable') : undefined}
      >
        <OutputTokensIcon />
        <b>{number(metrics.outputTokens)}</b>
      </span>
    </div>
  )
}
