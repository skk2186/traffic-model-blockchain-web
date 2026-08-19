<template>
  <section
    v-loading="loading"
    class="verification-result-panel"
    element-loading-text="正在执行验证并同步链上结果，请稍候..."
    element-loading-background="rgba(255, 255, 255, 0.86)"
  >
    <div class="section-title result-title">
      <h3>{{ title }}</h3>
      <el-tag v-if="result" :type="verifyStatus.type">{{ verifyStatus.text }}</el-tag>
    </div>

    <el-alert
      v-if="loading"
      class="result-loading-hint"
      title="正在执行验证并同步可信账本，请稍候..."
      type="info"
      :closable="false"
      show-icon
    />

    <dl class="result-meta">
      <div v-for="item in metaRows" :key="item.label" :class="{ wide: item.wide }">
        <dt>{{ item.label }}</dt>
        <dd>
          <el-tag v-if="item.tag" class="status-tag" :type="item.tag.type" size="mini">{{ item.tag.text }}</el-tag>
          <code v-else-if="item.code" class="inline-code">{{ item.value || '-' }}</code>
          <span v-else>{{ item.value || '-' }}</span>
        </dd>
      </div>
    </dl>

    <div class="status-summary">
      <div v-for="item in statusRows" :key="item.label" class="status-item">
        <span>{{ item.label }}</span>
        <el-tag
          v-if="item.tag"
          class="status-tag"
          :type="item.tag.type"
          size="mini"
        >{{ item.tag.text }}</el-tag>
        <em v-else>-</em>
      </div>
    </div>

    <div class="values">
      <div v-for="item in valueRows" :key="item.label" class="value-row">
        <span>{{ item.label }}</span>
        <code>{{ item.value || '-' }}</code>
        <el-button
          type="text"
          icon="el-icon-document-copy"
          title="复制"
          :disabled="!item.value"
          @click="copyValue(item.value)"
        />
      </div>
    </div>

    <el-collapse v-if="result" class="detail-collapse">
      <el-collapse-item>
        <template slot="title">
          <div class="detail-collapse-title">
            <span>查看完整验证详情</span>
            <el-button
              type="text"
              icon="el-icon-document-copy"
              @click.stop="copyValue(prettyResult, '完整验证详情已复制')"
            >复制</el-button>
          </div>
        </template>
        <pre>{{ prettyResult }}</pre>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<script>
import { copyText, formatLedgerStatus, formatVerifyStatus } from '../utils/verificationUtils'

export default {
  name: 'VerificationResultPanel',
  props: {
    result: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '验证结果'
    },
    verifyType: {
      type: String,
      default: ''
    }
  },
  computed: {
    recordId() {
      return this.result && this.result.recordId
    },
    verifyStatus() {
      return formatVerifyStatus(this.result && this.result.status)
    },
    ledgerStatus() {
      const status = this.getLedgerStatus()
      const current = formatLedgerStatus(status)
      if (this.isSuccessStatus(status)) {
        return Object.assign({}, current, { text: '已同步' })
      }
      return current
    },
    metaRows() {
      const current = this.result || {}
      return [
        { label: '验证类型', value: this.getVerifyName() },
        { label: '算法', value: current.algorithm },
        { label: '业务标识', value: current.businessId },
        { label: '生成时间', value: this.formatTime(current.timestamp) },
        { label: '记录 ID', value: this.recordId, code: true, wide: true }
      ]
    },
    statusRows() {
      return [
        { label: '验证状态', tag: this.result ? this.verifyStatus : null },
        { label: this.getLedgerLabel(), tag: this.result ? this.ledgerStatus : null },
        { label: this.getChainVerificationLabel(), tag: this.result ? this.getChainVerificationStatus() : null }
      ]
    },
    valueRows() {
      if (!this.result) {
        return this.defaultValueRows()
      }
      const rows = [
        ...this.extraRows(),
        { label: '结果 Hash', value: this.getResultHash() },
        { label: `${this.getLedgerLabel()}交易哈希`, value: this.getTxHash() },
        { label: `${this.getChainVerificationLabel()}交易哈希`, value: this.getChainVerificationTxHash() }
      ]
      return rows
    },
    prettyResult() {
      return this.result ? JSON.stringify(this.result, null, 2) : ''
    }
  },
  methods: {
    getVerifyName() {
      if (this.result) {
        return this.result.verifyName || this.result.verifyType || ''
      }
      const nameMap = {
        merkle: '数据完整性验证',
        zkp: '隐私证明验证',
        threshold: '多方签名验证'
      }
      return nameMap[this.verifyType] || ''
    },
    defaultValueRows() {
      const commonRows = [
        { label: '结果 Hash', value: '' },
        { label: '交易哈希', value: '' },
        { label: '跨链验证交易哈希', value: '' }
      ]
      if (this.verifyType === 'zkp') {
        return [
          { label: '零知识证明规则', value: '' },
          { label: '证明 Hash', value: '' },
          { label: '公开条件 Hash', value: '' },
          ...commonRows
        ]
      }
      if (this.verifyType === 'threshold') {
        return [
          { label: '总节点数', value: '' },
          { label: '签名阈值', value: '' },
          { label: '参与节点数量', value: '' },
          { label: '消息 Hash', value: '' },
          { label: '签名 Hash', value: '' },
          ...commonRows
        ]
      }
      return [
        { label: 'Merkle Root', value: '' },
        { label: '叶子总数', value: '' },
        { label: '抽样索引', value: '' },
        { label: '证明 Hash', value: '' },
        ...commonRows
      ]
    },
    getResultHash() {
      const detail = this.result.detail || {}
      return this.result.resultHash || detail.resultHash || detail.rootHash || detail.merkleRoot || ''
    },
    getMerkleRoot() {
      const detail = this.result.detail || {}
      return this.result.merkleRoot || detail.merkleRoot || detail.rootHash || this.result.resultHash || ''
    },
    getLeafCount() {
      const detail = this.result.detail || {}
      return this.result.leafCount ||
        this.result.leafTotal ||
        detail.leafCount ||
        detail.leafTotal ||
        detail.totalLeaves ||
        ''
    },
    getSampleIndex() {
      const detail = this.result.detail || {}
      const value = this.result.sampleIndex != null ? this.result.sampleIndex : detail.sampleIndex
      return value == null || value === '' ? '' : String(value)
    },
    extraRows() {
      const rows = []
      const merkleRoot = this.getMerkleRoot()
      const leafCount = this.getLeafCount()
      const sampleIndex = this.getSampleIndex()
      const circuitId = this.getCircuitId()
      const proofHash = this.getProofHash()
      const publicInputHash = this.getPublicInputHash()
      const thresholdRows = this.getThresholdRows()
      if (circuitId) {
        rows.push({ label: '零知识证明规则', value: circuitId, tooltip: true })
      }
      thresholdRows.forEach(item => rows.push(item))
      if (merkleRoot) {
        rows.push({ label: 'Merkle Root', value: merkleRoot, tooltip: true, wide: true })
      }
      if (leafCount !== '') {
        rows.push({ label: '叶子总数', value: String(leafCount) })
      }
      if (sampleIndex !== '') {
        rows.push({ label: '抽样索引', value: sampleIndex })
      }
      if (proofHash) {
        rows.push({ label: '证明 Hash', value: proofHash, tooltip: true, wide: true })
      }
      if (publicInputHash) {
        rows.push({ label: '公开条件 Hash', value: publicInputHash, tooltip: true, wide: true })
      }
      return rows
    },
    getCircuitId() {
      const detail = this.result.detail || {}
      return this.result.circuitId || detail.circuitId || ''
    },
    getProofHash() {
      const detail = this.result.detail || {}
      const proofSummary = detail.proofSummary || {}
      return this.result.proofHash || detail.proofHash || proofSummary.proofHash || ''
    },
    getPublicInputHash() {
      if (!this.isZkpResult()) {
        return ''
      }
      const detail = this.result.detail || {}
      return this.result.publicInputHash || this.result.inputHash || detail.publicInputHash || detail.inputHash || ''
    },
    isZkpResult() {
      const detail = this.result.detail || {}
      const verifyType = String(this.result.verifyType || '').toUpperCase()
      return verifyType === 'ZKP' || Boolean(detail.circuitId)
    },
    getThresholdRows() {
      if (!this.isThresholdResult()) {
        return []
      }
      const detail = this.result.detail || {}
      const rows = [
        { label: '总节点数', value: detail.totalNodes || this.result.totalNodes || '' },
        { label: '签名阈值', value: detail.threshold || this.result.threshold || '' },
        { label: '参与节点数量', value: detail.participantCount || this.result.participantCount || '' },
        { label: '消息 Hash', value: detail.messageHash || this.result.inputHash || '', tooltip: true, wide: true },
        { label: '签名 Hash', value: detail.signatureHash || this.result.proofHash || '', tooltip: true, wide: true },
        { label: '参与节点集合 Hash', value: detail.participantSetHash || '', tooltip: true, wide: true }
      ]
      return rows.filter(item => item.value !== '')
    },
    isThresholdResult() {
      const detail = this.result.detail || {}
      const verifyType = String(this.result.verifyType || '').toUpperCase()
      return verifyType === 'THRESHOLD_SIGNATURE' || detail.threshold != null || detail.participantSetHash
    },
    getLedgerStatus() {
      const ledger = this.result && this.result.ledger
      if (this.result && this.result.ledgerStatus) {
        return this.result.ledgerStatus
      }
      if (ledger && ledger.status) {
        return ledger.status
      }
      return 'DISABLED'
    },
    getTxHash() {
      const ledger = this.result && this.result.ledger
      return this.result.txHash ||
        this.result.txhash ||
        this.result.txid ||
        this.result.txId ||
        this.result.txID ||
        this.result.transactionId ||
        this.result.transactionID ||
        this.result.transactionHash ||
        (ledger && (ledger.txHash || ledger.txhash || ledger.txid || ledger.txId || ledger.txID || ledger.transactionId || ledger.transactionID || ledger.transactionHash)) ||
        ''
    },
    getLedgerLabel() {
      const ledger = this.result && this.result.ledger
      const chainName = ledger && (ledger.sourceChainLabel || ledger.sourceChain)
      const labels = {
        bcos3: 'FISCO BCOS 3.0',
        fabric: 'Fabric 1.4',
        chainmaker: 'ChainMaker'
      }
      return chainName ? `${labels[chainName] || chainName} 写入` : '账本同步'
    },
    getChainVerificationStatus() {
      const chain = this.result && this.result.chainVerification
      const status = chain && chain.status ? chain.status : 'DISABLED'
      const current = formatLedgerStatus(status)
      if (this.isSuccessStatus(status)) {
        return Object.assign({}, current, { text: '已验证' })
      }
      if (status === 'FAILED' || status === 'LEDGER_FAILED' || status === 'ERROR') {
        return Object.assign({}, current, { text: '验证失败' })
      }
      if (status === 'PENDING') {
        return Object.assign({}, current, { text: '验证待确认' })
      }
      if (status === 'DISABLED') {
        return Object.assign({}, current, { text: '未验证' })
      }
      return current
    },
    getChainVerificationLabel() {
      const chain = this.result && this.result.chainVerification
      const chainName = chain && (chain.verificationChainLabel || chain.verificationChain)
      const labels = {
        bcos3: 'FISCO BCOS 3.0',
        fabric: 'Fabric 1.4',
        chainmaker: 'ChainMaker'
      }
      return chainName ? `${labels[chainName] || chainName} 验证` : '目标链验证'
    },
    getChainVerificationTxHash() {
      const chain = this.result && this.result.chainVerification
      return chain && (chain.txHash || chain.txhash || chain.txid || chain.txId || chain.txID || chain.transactionId || chain.transactionID || chain.transactionHash) || ''
    },
    copyValue(value, successMessage = '已复制') {
      if (!value) return
      copyText(value)
        .then(() => this.$message.success(successMessage))
        .catch(() => this.$message.warning('请手动选择内容复制'))
    },
    isSuccessStatus(status) {
      return ['SUCCESS', 'LEDGER_SUCCESS', 'PASS'].includes(status)
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/common.scss';

.verification-result-panel {
  position: relative;
  min-height: 260px;
  padding: 0 0 18px;
  color: #303133;
  font-size: 13px;
  line-height: 20px;
  overflow: visible;
}
.result-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.result-title h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}
.result-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border: 1px solid #ebeef5;
  border-bottom: 0;
}
.result-meta div {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  min-width: 0;
  min-height: 38px;
  border-bottom: 1px solid #ebeef5;
}
.result-meta div:nth-child(odd):not(.wide) {
  border-right: 1px solid #ebeef5;
}
.result-meta .wide {
  grid-column: 1 / -1;
}
.result-meta dt,
.result-meta dd {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0;
  padding: 8px 10px;
  line-height: 20px;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.result-meta dt {
  color: #909399;
  background: #f5f7fa;
}
.result-meta dd {
  color: #303133;
  overflow: hidden;
}
.status-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0 16px;
}
.status-item {
  display: grid;
  grid-template-columns: minmax(58px, max-content) minmax(76px, 1fr);
  align-items: center;
  column-gap: 10px;
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  border: 1px solid #dce8f5;
  border-left: 3px solid #7aa7d9;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(31, 93, 143, 0.06);
}
.status-item span {
  min-width: 0;
  overflow: hidden;
  color: #4f5f70;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-item .status-tag {
  justify-self: end;
  max-width: 100%;
  min-width: 76px;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-item em {
  justify-self: end;
  color: #909399;
  font-style: normal;
  line-height: 20px;
}
.values {
  margin: 16px 0;
  border-top: 1px solid #ebeef5;
}
.value-row {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) 34px;
  align-items: center;
  min-height: 46px;
  border-bottom: 1px solid #ebeef5;
}
.value-row span {
  color: #606266;
  font-size: 13px;
}
.value-row code,
.inline-code {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  color: #1f5d8f;
  font: 12px Consolas, monospace;
  line-height: 20px;
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}
.value-row code {
  padding-right: 10px;
}
.value-row code::-webkit-scrollbar,
.inline-code::-webkit-scrollbar {
  height: 4px;
}
.value-row code::-webkit-scrollbar-thumb,
.inline-code::-webkit-scrollbar-thumb {
  background: #c7d7e8;
  border-radius: 999px;
}
.result-loading-hint {
  margin-bottom: 14px;
}
.detail-collapse {
  margin-top: 4px;
}
.detail-collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 10px;
}
.detail-collapse-title span {
  color: #303133;
  font-size: 13px;
}
.detail-collapse-title .el-button {
  padding: 0;
  font-size: 13px;
}
pre {
  max-height: 310px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #303133;
  font: 12px/1.6 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
@media (max-width: 900px) {
  .result-title {
    align-items: flex-start;
    flex-direction: column;
  }
  .result-meta {
    grid-template-columns: 1fr;
  }
  .result-meta div {
    grid-template-columns: 116px minmax(0, 1fr);
  }
  .result-meta div:nth-child(odd):not(.wide) {
    border-right: 0;
  }
  .value-row {
    grid-template-columns: 116px minmax(0, 1fr) 34px;
  }
  .status-summary {
    grid-template-columns: 1fr;
  }
}
</style>
