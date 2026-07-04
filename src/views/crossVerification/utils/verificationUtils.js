const HISTORY_KEY = 'cross-verification-history'
const MAX_RECENT_RECORDS = 20

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

export function buildLocalRecord(result) {
  const current = result || {}
  return {
    recordId: current.recordId || '',
    verifyType: current.verifyType || '',
    verifyName: current.verifyName || '',
    businessId: current.businessId || '',
    algorithm: current.algorithm || '',
    status: current.status || '',
    message: current.message || '',
    inputHash: current.inputHash || '',
    proofHash: current.proofHash || '',
    resultHash: current.resultHash || '',
    ledger: current.ledger || null,
    ledgerStatus: current.ledgerStatus || (current.ledger && current.ledger.status) || '',
    chainVerification: current.chainVerification || null,
    txHash: current.txHash || (current.ledger && current.ledger.txHash) || '',
    detail: current.detail || null,
    timestamp: current.timestamp || new Date().toISOString(),
    raw: current
  }
}

export function saveRecentRecord(record) {
  if (!record) {
    return loadRecentRecords()
  }
  const recordId = record.recordId || `local-${Date.now()}`
  const nextRecord = Object.assign({}, record, { recordId })
  const records = loadRecentRecords()
  const nextRecords = [
    nextRecord,
    ...records.filter(item => item.recordId !== recordId)
  ].slice(0, MAX_RECENT_RECORDS)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextRecords))
  return nextRecords
}

export function loadRecentRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(records) ? records : []
  } catch (error) {
    return []
  }
}

export function clearRecentRecords() {
  localStorage.removeItem(HISTORY_KEY)
  return []
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
