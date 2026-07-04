<template>
  <section v-loading="loading" class="verification-result-panel cross-verification-result">
    <div class="panel-header">
      <h3>{{ title }}</h3>
      <div class="panel-actions">
        <el-button
          size="mini"
          icon="el-icon-document-copy"
          :disabled="!recordId"
          @click="copyRecordId"
        >复制记录 ID</el-button>
        <el-button
          size="mini"
          type="primary"
          plain
          icon="el-icon-view"
          :disabled="!result"
          @click="$emit('show-json', result)"
        >查看完整结果</el-button>
      </div>
    </div>

    <el-empty v-if="!result" description="暂无验证结果" :image-size="88" />
    <template v-else>
      <dl class="result-grid">
        <div v-for="item in resultRows" :key="item.label" :class="{ wide: item.wide }">
          <dt>{{ item.label }}</dt>
          <dd>
            <el-tag v-if="item.tag" class="status-tag" :type="item.tag.type" size="mini">{{ item.tag.text }}</el-tag>
            <el-tooltip
              v-else-if="item.tooltip"
              :content="item.value || '-'"
              placement="top"
              effect="light"
            >
              <code class="value-code hash-cell is-truncated">{{ item.value || '-' }}</code>
            </el-tooltip>
            <span v-else>{{ item.value || '-' }}</span>
          </dd>
        </div>
      </dl>
      <el-alert
        v-if="result.message"
        class="result-message"
        :title="result.message"
        type="info"
        :closable="false"
        show-icon
      />
    </template>
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
      return formatLedgerStatus(this.getLedgerStatus())
    },
    resultRows() {
      return [
        { label: '记录 ID', value: this.recordId, tooltip: true, wide: true },
        { label: '验证方式', value: this.getVerifyName() },
        { label: '业务标识', value: this.result.businessId, tooltip: true },
        { label: '算法', value: this.result.algorithm },
        { label: '验证状态', tag: this.verifyStatus },
        ...this.extraRows,
        { label: '结果 Hash', value: this.getResultHash(), tooltip: true, wide: true },
        { label: '可信账本同步状态', tag: this.ledgerStatus },
        { label: '交易哈希', value: this.getTxHash(), tooltip: true, wide: true },
        { label: 'Fabric 跨链验证状态', tag: this.getChainVerificationStatus() },
        { label: 'Fabric 跨链交易哈希', value: this.getChainVerificationTxHash(), tooltip: true, wide: true }
      ]
    }
  },
  methods: {
    getVerifyName() {
      return this.result.verifyName || this.result.verifyType || ''
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
        this.result.transactionHash ||
        (ledger && (ledger.txHash || ledger.transactionHash)) ||
        ''
    },
    getChainVerificationStatus() {
      const chain = this.result && this.result.chainVerification
      return formatLedgerStatus(chain && chain.status ? chain.status : 'DISABLED')
    },
    getChainVerificationTxHash() {
      const chain = this.result && this.result.chainVerification
      return chain && (chain.txHash || chain.transactionHash) || ''
    },
    copyRecordId() {
      if (!this.recordId) return
      copyText(this.recordId)
        .then(() => this.$message.success('记录 ID 已复制'))
        .catch(() => this.$message.warning('请手动选择记录 ID 复制'))
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/common.scss';

.verification-result-panel {
  min-height: 260px;
  padding: 4px 2px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.panel-header h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}
.panel-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid #ebeef5;
  border-left: 1px solid #ebeef5;
}
.result-grid div {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  min-width: 0;
  min-height: 40px;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.result-grid .wide {
  grid-column: 1 / -1;
}
.result-grid dt,
.result-grid dd {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  line-height: 20px;
}
.result-grid dt {
  color: #909399;
  background: #f5f7fa;
}
.result-grid dd {
  color: #303133;
}
.value-code {
  display: inline-block;
  max-width: 100%;
  color: #1f5d8f;
  font: 12px Consolas, monospace;
  vertical-align: bottom;
}
.is-truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-message {
  margin-top: 14px;
}
@media (max-width: 900px) {
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .result-grid {
    grid-template-columns: 1fr;
  }
  .result-grid div {
    grid-template-columns: 116px minmax(0, 1fr);
  }
}
</style>
