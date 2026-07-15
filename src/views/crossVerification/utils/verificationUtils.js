export function isHex64(value) {
  return /^[0-9a-fA-F]{64}$/.test(String(value || '').trim())
}

export function formatVerifyStatus(status) {
  const statusMap = {
    PASS: { text: '验证通过', type: 'success' },
    FAIL: { text: '验证未通过', type: 'danger' },
    ERROR: { text: '验证异常', type: 'danger' }
  }
  return statusMap[status] || { text: status || '未返回', type: 'info' }
}

export function formatLedgerStatus(status) {
  const statusMap = {
    LEDGER_SUCCESS: { text: '已同步可信账本', type: 'success' },
    LEDGER_FAILED: { text: '同步失败', type: 'danger' },
    SUCCESS: { text: '已同步可信账本', type: 'success' },
    FAILED: { text: '同步失败', type: 'danger' },
    PENDING: { text: '同步状态待确认', type: 'warning' },
    DISABLED: { text: '未启用同步', type: 'info' }
  }
  return statusMap[status] || { text: status || '未启用同步', type: 'info' }
}

export function copyText(text) {
  const value = String(text == null ? '' : text)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value)
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'readonly')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (error) {
      reject(error)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

export function safeJsonParse(text) {
  if (typeof text !== 'string') {
    return text
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}
