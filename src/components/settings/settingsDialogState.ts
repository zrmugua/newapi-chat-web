import { create } from 'zustand'
import { useSettings } from '../../services/settings.js'

/** 设置弹窗的分组：API 连接、通用设置、数据管理 */
export type SettingsSection = 'connection' | 'general' | 'data'

/** 设置弹窗：侧边栏底部、没有 API Key 时的操作与 401 提示都可以打开；section 为打开时选中的分组 */
export const useSettingsDialog = create(() => ({
  open: false,
  section: 'general' as SettingsSection,
}))

export const openSettings = (section: SettingsSection) =>
  useSettingsDialog.setState({ open: true, section })

export const closeSettings = () => useSettingsDialog.setState({ open: false })

/** 连接信息不完整时打开 API 连接设置，返回连接是否可用 */
export const ensureApiKey = () => {
  if (useSettings.getState().apiKey && useSettings.getState().baseUrl) {
    return true
  }
  openSettings('connection')
  return false
}
