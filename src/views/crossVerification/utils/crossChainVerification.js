import {
  BCOS3_VERIFY_PATH,
  FABRIC_VERIFY_PATH,
  VERIFY_TYPES,
  buildRecordKey,
  getVerifyRecord,
  interchainQueryRecord,
  waitLastCallbackResult,
  writeVerifyRecord
} from '@/api/trafficVerifyChain'

const TARGET_CHAIN = 'bcos3'
const VERIFY_FROM_CHAIN = 'fabric'

function updateState(result, ledgerPatch, chainPatch) {
  return Object.assign({}, result, {
    ledger: Object.assign({}, result.ledger || {}, ledgerPatch || {}),
    ledgerStatus: (ledgerPatch && ledgerPatch.status) || result.ledgerStatus,
    chainVerification: Object.assign({}, result.chainVerification || {}, chainPatch || {})
  })
}

function notify(callback, result) {
  if (typeof callback === 'function') callback(result)
}

function assertTxSuccess(result, title) {
  if (result && result.success && result.txhash) return
  const error = new Error(title + '失败')
  error.result = result
  throw error
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitRecordAvailable(businessId, verifyType) {
  for (let retry = 0; retry < 10; retry++) {
    const result = await getVerifyRecord(TARGET_CHAIN, businessId, verifyType)
    if (result.exists) return result
    if (retry < 9) await delay(1000)
  }
  throw new Error('bcos3 交易已提交，但验证记录暂未可查询，请稍后再试')
}

function errorMessage(error) {
  if (error && error.message) return error.message
  return '可信账本同步或 Fabric 跨链验证失败'
}

export function buildCrossChainRecord(result, verifyType) {
  return {
    businessId: result.businessId,
    verifyType,
    recordId: result.recordId,
    chain: TARGET_CHAIN,
    algorithm: result.algorithm,
    createdAt: result.timestamp ? new Date(result.timestamp).toISOString() : new Date().toISOString(),
    status: result.status,
    inputHash: result.inputHash || '',
    dataHash: result.inputHash || '',
    proofHash: result.proofHash || '',
    resultHash: result.resultHash || '',
    detailHash: result.proofHash || result.resultHash || '',
    detail: result.detail || {}
  }
}

export async function syncCrossChainVerification(result, verifyType, onUpdate) {
  if (!Object.values(VERIFY_TYPES).includes(verifyType)) {
    throw new Error('不支持的验证类型：' + verifyType)
  }

  const record = buildCrossChainRecord(result, verifyType)
  let current = updateState(result, {
    enabled: true,
    status: 'PENDING',
    message: '正在提交至 bcos3 可信账本',
    chainPath: 'payment.bcos3',
    resourcePath: BCOS3_VERIFY_PATH
  }, {
    enabled: true,
    status: 'PENDING',
    message: '等待 bcos3 同步完成后发起 Fabric 跨链验证',
    chainPath: 'payment.fabric',
    resourcePath: FABRIC_VERIFY_PATH
  })
  notify(onUpdate, current)

  try {
    const writeResult = await writeVerifyRecord(TARGET_CHAIN, record.businessId, verifyType, record)
    assertTxSuccess(writeResult, 'bcos3 可信账本同步')
    current = updateState(current, {
      status: 'SUCCESS',
      txHash: writeResult.txhash,
      message: '已同步至 bcos3 可信账本'
    }, {
      status: 'PENDING',
      message: '正在通过 Fabric 发起跨链验证'
    })
    notify(onUpdate, current)

    await waitRecordAvailable(record.businessId, verifyType)
    const crossResult = await interchainQueryRecord(
      VERIFY_FROM_CHAIN,
      TARGET_CHAIN,
      record.businessId,
      verifyType
    )
    assertTxSuccess(crossResult, 'Fabric 跨链验证')
    const callbackResult = await waitLastCallbackResult(VERIFY_FROM_CHAIN, {
      recordKey: buildRecordKey(record.businessId, verifyType)
    })
    if (!callbackResult.exists) {
      throw new Error('Fabric 未查询到 bcos3 验证记录')
    }

    current = updateState(current, {
      status: 'SUCCESS',
      txHash: writeResult.txhash,
      message: '已同步至 bcos3 可信账本'
    }, {
      status: 'SUCCESS',
      txHash: crossResult.txhash,
      message: '已通过 Fabric 完成跨链验证',
      recordKey: callbackResult.recordKey,
      record: callbackResult.record
    })
    notify(onUpdate, current)
    return current
  } catch (error) {
    const message = errorMessage(error)
    const ledgerSucceeded = current.ledger && current.ledger.status === 'SUCCESS'
    current = updateState(current, ledgerSucceeded
      ? { message: current.ledger.message }
      : { status: 'FAILED', message, resourcePath: BCOS3_VERIFY_PATH }, {
      status: 'FAILED',
      message,
      resourcePath: FABRIC_VERIFY_PATH
    })
    notify(onUpdate, current)
    return current
  }
}
