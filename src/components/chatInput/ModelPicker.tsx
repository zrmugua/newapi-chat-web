import { useTranslate } from '../../i18n/index.js'
import { setModel, useSettings } from '../../services/settings.js'
import { Select } from '../base/Select.js'
import { openSettings } from '../settings/settingsDialogState.js'
import styles from './ModelPicker.module.css'

export const ModelPicker = () => {
  const t = useTranslate()
  const model = useSettings((state) => state.model)
  const models = useSettings((state) => state.models)
  return models.length ? (
    <Select
      className={styles.picker}
      value={model}
      ariaLabel={t('chatModel')}
      placeholder={t('modelSelectPlaceholder')}
      options={models.map((value) => ({ value, label: value }))}
      onChange={setModel}
    />
  ) : (
    <button
      type="button"
      className={styles.picker}
      onClick={() => openSettings('connection')}
      title={t('chatModel')}
    >
      {model || t('modelSelectPlaceholder')}
      <span aria-hidden>⌄</span>
    </button>
  )
}
