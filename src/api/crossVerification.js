import request from '@/utils/request'

export function getCrossVerificationHealth() {
  return request({
    url: '/api/cross-verification/health',
    method: 'get'
  })
}

export function verifyMerkle(data) {
  return request({
    url: '/api/cross-verification/merkle/verify',
    method: 'post',
    data
  })
}

export function verifyZkp(data) {
  return request({
    url: '/api/cross-verification/zkp/verify',
    method: 'post',
    data
  })
}

export function verifyThresholdSignature(data) {
  return request({
    url: '/api/cross-verification/threshold-signature/verify',
    method: 'post',
    data
  })
}

export function listVerificationRecords(params) {
  return request({
    url: '/api/cross-verification/records',
    method: 'get',
    params
  })
}

export function getVerificationRecord(recordId) {
  return request({
    url: `/api/cross-verification/records/${recordId}`,
    method: 'get'
  })
}
