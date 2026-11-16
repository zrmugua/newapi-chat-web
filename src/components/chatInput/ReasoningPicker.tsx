import { useTranslate } from '../../i18n/index.js'
import { reasoningEfforts } from '../../services/connection.js'
import { setReasoningEffort, useSettings } from '../../services/settings.js'
import { Select } from '../base/Select.js'
import { IconThinkOutline14 } from '../base/icons.js'
import styles from './ModelPicker.module.css'

export const ReasoningPicker = () => {
  const t = useTranslate()
  const value = useSettings((state) => state.reasoningEffort)
  return (
    <Select
      className={styles.picker}
      ariaLabel={t('reasoningLevel')}
      prefix={<IconThinkOutline14 />}
      value={value}
      options={reasoningEfforts.map((effort) => ({ value: effort, label: effort }))}
      onChange={setReasoningEffort}
    />
  )
}
