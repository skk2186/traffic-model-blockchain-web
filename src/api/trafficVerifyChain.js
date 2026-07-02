import { call, sendTransaction } from '@/api/transaction'

export const BCOS3_VERIFY_PATH = 'payment.bcos3.TrafficVerifyStore'
export const FABRIC_VERIFY_PATH = 'payment.fabric.traffic_verify_store'

export const VERIFY_TYPES = {
  MERKLE: 'MERKLE',
  ZKP: 'ZKP',
  THRESHOLD_SIGNATURE: 'THRESHOLD_SIGNATURE'
}

const METHOD_SET_RECORD = 'setRecord'
const METHOD_GET_RECORD_WITH_STATUS = 'getRecordWithStatus'
const METHOD_INTERCHAIN = 'interchain'
const METHOD_CALLBACK = 'callback'
const METHOD_GET_LAST_CALLBACK_RESULT = 'getLastCallbackResult'

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function parseJsonIfPossible(value) {
  if (typeof value !== 'string') {
    return value
  }
  const text = value.trim()
  if (!text) {
    return value
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    return value
  }
}

function unwrapSingleArray(value) {
  if (Array.isArray(value) && value.length === 1 && Array.isArray(value[0])) {
    return value[0]
  }
  return value
}

function extractResultPayload(response) {
  if (!isObject(response)) {
    return response
  }
  if (hasOwn(response, 'result')) {
    return extractResultPayload(response.result)
  }
  if (hasOwn(response, 'Result')) {
    return extractResultPayload(response.Result)
  }
  if (hasOwn(response, 'data')) {
    return extractResultPayload(response.data)
  }
  return response
}

function normalizeBoolean(value) {
  if (value === true || value === 1) {
    return true
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  return false
}

function parseRecordJson(value) {
  const parsed = parseJsonIfPossible(value)
  if (isObject(parsed)) {
    return parsed
  }
  return null
}

function getRecordKeyFromObject(result) {
  if (hasOwn(result, 'recordKey')) {
    return result.recordKey
  }
  if (hasOwn(result, 'key')) {
    return result.key
  }
  return ''
}

function getRecordValueFromObject(result) {
  if (hasOwn(result, 'record')) {
    return result.record
  }
  if (hasOwn(result, 'recordJson')) {
    return result.recordJson
  }
  if (hasOwn(result, 'value')) {
    return result.value
  }
  return null
}

function parseRecordPayload(payload, raw, depth) {
  if (depth > 5) {
    return {
      exists: false,
      recordKey: '',
      record: null,
      raw
    }
  }

  let result = parseJsonIfPossible(payload)
  result = unwrapSingleArray(result)

  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
    result = result[0]
  }

  if (Array.isArray(result) && result.length === 1) {
    const nested = parseJsonIfPossible(result[0])
    if (Array.isArray(nested) || isObject(nested)) {
      return parseRecordPayload(nested, raw, depth + 1)
    }
  }

  if (Array.isArray(result) && result.length === 2) {
    const nested = parseJsonIfPossible(result[1])
    if (Array.isArray(nested) || isObject(nested)) {
      return parseRecordPayload(nested, raw, depth + 1)
    }
  }

  if (Array.isArray(result)) {
    const exists = normalizeBoolean(result[0])
    const recordKey = result[1] == null ? '' : String(result[1])
    const record = exists ? parseRecordJson(result[2]) : null
    return {
      exists,
      recordKey,
      record,
      raw
    }
  }

  if (isObject(result)) {
    if (hasOwn(result, 'result') || hasOwn(result, 'Result') || hasOwn(result, 'data')) {
      return parseRecordPayload(parseWeCrossResult(result), raw, depth + 1)
    }

    const exists = normalizeBoolean(result.exists)
    const recordKey = getRecordKeyFromObject(result)
    const record = exists ? parseRecordJson(getRecordValueFromObject(result)) : null
    return {
      exists,
      recordKey: recordKey == null ? '' : String(recordKey),
      record,
      raw
    }
  }

  return {
    exists: false,
    recordKey: '',
    record: null,
    raw
  }
}

function responseErrorCode(response) {
  if (!isObject(response)) {
    return 0
  }
  if (hasOwn(response, 'errorCode')) {
    return response.errorCode
  }
  return 0
}

function nestedResponseErrorCode(response) {
  if (!isObject(response) || !isObject(response.data)) {
    return 0
  }
  if (hasOwn(response.data, 'errorCode')) {
    return response.data.errorCode
  }
  return 0
}

function findField(value, names, depth) {
  if (depth > 5 || value == null) {
    return null
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findField(item, names, depth + 1)
      if (found != null) {
        return found
      }
    }
    return null
  }
  if (!isObject(value)) {
    return null
  }
  for (const name of names) {
    if (hasOwn(value, name) && value[name] != null) {
      return value[name]
    }
  }
  for (const key of Object.keys(value)) {
    const found = findField(value[key], names, depth + 1)
    if (found != null) {
      return found
    }
  }
  return null
}

function buildResourceRequest(path, method, args) {
  return {
    version: '1',
    path,
    data: {
      method,
      args: normalizeArgs(args)
    }
  }
}

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function hasCallbackRecord(result) {
  return result.exists || result.recordKey !== '' || result.record !== null
}

function isExpectedCallbackRecord(result, recordKey) {
  if (!hasCallbackRecord(result)) {
    return false
  }
  if (!recordKey) {
    return true
  }
  return result.recordKey === recordKey
}

export function getVerifyPath(chain) {
  if (chain === 'bcos3') {
    return BCOS3_VERIFY_PATH
  }
  if (chain === 'fabric') {
    return FABRIC_VERIFY_PATH
  }
  throw new Error('Unsupported verify chain: ' + chain)
}

export function getOtherChain(chain) {
  if (chain === 'bcos3') {
    return 'fabric'
  }
  if (chain === 'fabric') {
    return 'bcos3'
  }
  throw new Error('Unsupported verify chain: ' + chain)
}

export function buildRecordKey(businessId, verifyType) {
  return String(businessId) + ':' + String(verifyType)
}

export function normalizeArgs(args) {
  if (!Array.isArray(args)) {
    return []
  }
  return args.map(arg => {
    if (arg == null) {
      return ''
    }
    if (typeof arg === 'string') {
      return arg
    }
    if (typeof arg === 'object') {
      return JSON.stringify(arg)
    }
    return String(arg)
  })
}

export function parseWeCrossResult(response) {
  return unwrapSingleArray(extractResultPayload(response))
}

export function parseRecordResult(response) {
  const payload = parseWeCrossResult(response)
  return parseRecordPayload(payload, response, 0)
}

export function parseTxResult(response) {
  const result = parseWeCrossResult(response)
  const errorCode = responseErrorCode(response)
  const innerErrorCode = nestedResponseErrorCode(response)
  const txhash = findField(result, ['txhash', 'txHash', 'transactionHash', 'transaction_hash'], 0)
  const blockNum = findField(result, ['blockNum', 'blockNumber', 'block_number'], 0)
  return {
    success: errorCode === 0 && innerErrorCode === 0,
    txhash: txhash == null ? null : txhash,
    blockNum: blockNum == null ? null : blockNum,
    result,
    raw: response
  }
}

export function writeVerifyRecord(chain, businessId, verifyType, record) {
  const path = getVerifyPath(chain)
  const recordKey = buildRecordKey(businessId, verifyType)
  return sendTransaction(buildResourceRequest(path, METHOD_SET_RECORD, [
    recordKey,
    businessId,
    verifyType,
    JSON.stringify(record)
  ])).then(parseTxResult)
}

export function getVerifyRecord(chain, businessId, verifyType) {
  const path = getVerifyPath(chain)
  const recordKey = buildRecordKey(businessId, verifyType)
  return call(buildResourceRequest(path, METHOD_GET_RECORD_WITH_STATUS, [
    recordKey
  ])).then(parseRecordResult)
}

export function interchainQueryRecord(fromChain, targetChain, businessId, verifyType) {
  const fromPath = getVerifyPath(fromChain)
  const targetPath = getVerifyPath(targetChain)
  const recordKey = buildRecordKey(businessId, verifyType)
  return sendTransaction(buildResourceRequest(fromPath, METHOD_INTERCHAIN, [
    targetPath,
    METHOD_GET_RECORD_WITH_STATUS,
    recordKey,
    fromPath,
    METHOD_CALLBACK
  ])).then(parseTxResult)
}

export function getLastCallbackResult(chain) {
  const path = getVerifyPath(chain)
  return call(buildResourceRequest(path, METHOD_GET_LAST_CALLBACK_RESULT, [])).then(parseRecordResult)
}

export async function waitLastCallbackResult(chain, options = {}) {
  const maxRetry = typeof options.maxRetry === 'number' ? options.maxRetry : 10
  const interval = typeof options.interval === 'number' ? options.interval : 1000
  const recordKey = options.recordKey || ''

  let lastResult = null

  for (let retry = 0; retry < maxRetry; retry++) {
    const result = await getLastCallbackResult(chain)
    lastResult = result
    if (isExpectedCallbackRecord(result, recordKey)) {
      return result
    }
    if (retry < maxRetry - 1) {
      await delay(interval)
    }
  }

  const error = new Error('跨链回调超时')
  error.result = lastResult
  throw error
}
