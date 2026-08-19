import {
  VERIFY_TYPES,
  buildRecordKey,
  getVerifyChainLabel,
  getVerifyChainPath,
  getVerifyPath,
  getVerifyRecord,
  interchainQueryRecord,
  waitLastCallbackResult,
  writeVerifyRecord
} from '@/api/trafficVerifyChain'

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
  if (result && result.success) return
  const error = new Error(title + '失败')
  error.result = result
  throw error
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitRecordAvailable(chain, businessId, verifyType) {
  for (let retry = 0; retry < 10; retry++) {
    const result = await getVerifyRecord(chain, businessId, verifyType)
    if (result.exists) return result
    if (retry < 9) await delay(1000)
  }
  throw new Error(`${getVerifyChainLabel(chain)} 交易已提交，但验证记录暂未可查询，请稍后再试`)
}

function errorMessage(error, verificationLabel) {
  if (error && error.message) return error.message
  return `可信账本同步或 ${verificationLabel} 跨链验证失败`
}

function normalizeArguments(optionsOrUpdate, maybeUpdate) {
  if (typeof optionsOrUpdate === 'function') {
    return {
      options: { sourceChain: 'bcos3', verificationChain: 'fabric' },
      onUpdate: optionsOrUpdate
    }
  }
  return {
    options: Object.assign({ sourceChain: 'bcos3', verificationChain: 'fabric' }, optionsOrUpdate || {}),
    onUpdate: maybeUpdate
  }
}

export function buildCrossChainRecord(result, verifyType, sourceChain, verificationChain) {
  return {
    businessId: result.businessId,
    verifyType,
    recordId: result.recordId,
    chain: sourceChain,
    sourceChain,
    verificationChain,
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

export async function syncCrossChainVerification(result, verifyType, optionsOrUpdate, maybeUpdate) {
  if (!Object.values(VERIFY_TYPES).includes(verifyType)) {
    throw new Error('不支持的验证类型：' + verifyType)
  }

  const { options, onUpdate } = normalizeArguments(optionsOrUpdate, maybeUpdate)
  const sourceChain = options.sourceChain
  const verificationChain = options.verificationChain
  if (!sourceChain || !verificationChain || sourceChain === verificationChain) {
    throw new Error('数据写入链和数据验证链必须选择不同的链')
  }

  const sourceLabel = getVerifyChainLabel(sourceChain)
  const verificationLabel = getVerifyChainLabel(verificationChain)
  const sourcePath = getVerifyPath(sourceChain)
  const verificationPath = getVerifyPath(verificationChain)
  const record = buildCrossChainRecord(result, verifyType, sourceChain, verificationChain)
  let current = updateState(result, {
    enabled: true,
    status: 'PENDING',
    sourceChain,
    chainPath: getVerifyChainPath(sourceChain),
    resourcePath: sourcePath,
    message: `正在提交至 ${sourceLabel} 可信账本`
  }, {
    enabled: true,
    status: 'PENDING',
    sourceChain,
    verificationChain,
    resourcePath: verificationPath,
    message: `等待 ${sourceLabel} 同步完成后发起 ${verificationLabel} 验证`
  })
  notify(onUpdate, current)

  try {
    const writeResult = await writeVerifyRecord(sourceChain, record.businessId, verifyType, record)
    assertTxSuccess(writeResult, `${sourceLabel} 可信账本同步`)
    await waitRecordAvailable(sourceChain, record.businessId, verifyType)

    current = updateState(current, {
      enabled: true,
      status: 'SUCCESS',
      sourceChain,
      chainPath: getVerifyChainPath(sourceChain),
      resourcePath: sourcePath,
      txHash: writeResult.txhash,
      message: `已同步至 ${sourceLabel} 可信账本`
    }, {
      enabled: true,
      status: 'PENDING',
      sourceChain,
      verificationChain,
      resourcePath: verificationPath,
      message: `正在通过 ${verificationLabel} 发起验证`
    })
    notify(onUpdate, current)

    const crossResult = await interchainQueryRecord(
      verificationChain,
      sourceChain,
      record.businessId,
      verifyType
    )
    assertTxSuccess(crossResult, `${verificationLabel} 跨链验证`)
    const callbackResult = await waitLastCallbackResult(verificationChain, {
      recordKey: buildRecordKey(record.businessId, verifyType)
    })
    if (!callbackResult.exists) {
      throw new Error(`${verificationLabel} 未查询到 ${sourceLabel} 验证记录`)
    }

    current = updateState(current, {
      enabled: true,
      status: 'SUCCESS',
      sourceChain,
      chainPath: getVerifyChainPath(sourceChain),
      resourcePath: sourcePath,
      txHash: writeResult.txhash,
      message: `已同步至 ${sourceLabel} 可信账本`
    }, {
      enabled: true,
      status: 'SUCCESS',
      sourceChain,
      verificationChain,
      resourcePath: verificationPath,
      txHash: crossResult.txhash,
      message: `已通过 ${verificationLabel} 完成跨链验证`,
      recordKey: callbackResult.recordKey,
      record: callbackResult.record
    })
    notify(onUpdate, current)
    return current
  } catch (error) {
    const message = errorMessage(error, verificationLabel)
    const ledgerSucceeded = current.ledger && current.ledger.status === 'SUCCESS'
    current = updateState(current, ledgerSucceeded
      ? { message: current.ledger.message }
      : {
        enabled: true,
        status: 'FAILED',
        sourceChain,
        chainPath: getVerifyChainPath(sourceChain),
        resourcePath: sourcePath,
        message
      }, {
      enabled: true,
      status: 'FAILED',
      sourceChain,
      verificationChain,
      resourcePath: verificationPath,
      message
    })
    notify(onUpdate, current)
    return current
  }
}
