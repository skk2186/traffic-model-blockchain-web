<template>
  <div class="app-container cross-verification-page verification-records-page">
    <el-card class="page-shell cross-verification-card">
      <header class="page-header cross-verification-header">
        <div>
          <h2>验证记录</h2>
          <p>查询三类跨链可信验证方式产生的验证结果与可信账本同步状态。</p>
        </div>
        <el-button
          type="primary"
          plain
          icon="el-icon-refresh"
          :loading="loading"
          @click="fetchRecords"
        >刷新</el-button>
      </header>

      <section class="filter-panel cross-verification-toolbar">
        <el-form :model="filters" label-width="92px" class="filter-form">
          <el-row :gutter="12">
            <el-col :xs="24" :md="6">
              <el-form-item label="验证方式">
                <el-select v-model="filters.verifyType" placeholder="全部" clearable style="width: 100%">
                  <el-option label="全部" value="" />
                  <el-option label="数据完整性验证" value="MERKLE" />
                  <el-option label="隐私证明验证" value="ZKP" />
                  <el-option label="多方签名验证" value="THRESHOLD_SIGNATURE" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="7">
              <el-form-item label="业务标识">
                <el-input
                  v-model.trim="filters.businessId"
                  placeholder="请输入业务标识"
                  clearable
                  @keyup.enter.native="handleSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="6">
              <el-form-item label="验证状态">
                <el-select v-model="filters.status" placeholder="全部" clearable style="width: 100%">
                  <el-option label="全部" value="" />
                  <el-option label="验证通过" value="PASS" />
                  <el-option label="验证未通过" value="FAIL" />
                  <el-option label="验证异常" value="ERROR" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="5">
              <el-form-item label-width="0" class="filter-actions">
                <el-button type="primary" icon="el-icon-search" :loading="loading" @click="handleSearch">查询</el-button>
                <el-button icon="el-icon-refresh-left" @click="resetFilters">重置</el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </section>

      <section class="table-panel">
        <el-alert
          v-if="loadError"
          class="table-alert"
          :title="loadError"
          type="error"
          :closable="false"
          show-icon
        />
        <el-table
          v-loading="loading"
          :data="records"
          border
          size="small"
          empty-text="暂无验证记录。"
          class="records-table cross-verification-table"
        >
          <el-table-column label="记录信息" min-width="210">
            <template slot-scope="{ row }">
              <div class="record-cell">
                <el-tooltip :content="row.recordId || '-'" placement="top" effect="light">
                  <code>{{ row.recordId || '-' }}</code>
                </el-tooltip>
                <span>{{ row.businessId || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="验证信息" min-width="150">
            <template slot-scope="{ row }">
              <div class="record-cell">
                <strong>{{ formatVerifyType(row.verifyType, row.verifyName) }}</strong>
                <span>{{ row.algorithm || '-' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="210">
            <template slot-scope="{ row }">
              <div class="status-stack">
                <el-tag class="status-tag" :type="verifyStatusMeta(row.status).type" size="mini">
                  {{ verifyStatusMeta(row.status).text }}
                </el-tag>
                <el-tag class="status-tag" :type="ledgerStatusMeta(row.ledgerStatus).type" size="mini">
                  {{ ledgerStatusMeta(row.ledgerStatus).text }}
                </el-tag>
                <el-tag class="status-tag" :type="crossChainStatusMeta(getCrossChainStatus(row)).type" size="mini">
                  {{ crossChainStatusMeta(getCrossChainStatus(row)).text }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="链上信息" min-width="220">
            <template slot-scope="{ row }">
              <div class="chain-cell">
                <div>
                  <span>写入链</span>
                  <em>{{ getSourceChainLabel(row) }}</em>
                </div>
                <div>
                  <span>写入交易</span>
                  <el-tooltip :content="getTxHash(row)" placement="top" effect="light">
                    <code>{{ getTxHash(row) }}</code>
                  </el-tooltip>
                </div>
                <div>
                  <span>验证链</span>
                  <em>{{ getVerificationChainLabel(row) }}</em>
                </div>
                <div>
                  <span>验证交易</span>
                  <el-tooltip :content="getCrossChainTxHash(row)" placement="top" effect="light">
                    <code>{{ getCrossChainTxHash(row) }}</code>
                  </el-tooltip>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template slot-scope="{ row }">
              <span class="nowrap">{{ formatTime(row.createdAt || row.timestamp) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center">
            <template slot-scope="{ row }">
              <div class="row-actions">
                <el-button type="text" size="mini" @click="openDetail(row)">查看详情</el-button>
                <el-button type="text" size="mini" @click="copyRecordId(row.recordId)">复制 ID</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            background
            :current-page="pagination.page"
            :page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </section>
    </el-card>

    <el-dialog
      class="record-detail-dialog-wrapper"
      custom-class="record-detail-dialog"
      title="验证记录详情"
      :visible.sync="detailVisible"
      width="780px"
      append-to-body
    >
      <div v-loading="detailLoading">
        <el-alert
          v-if="detailError"
          class="detail-alert"
          :title="detailError"
          type="error"
          :closable="false"
          show-icon
        />
        <template v-if="detailRecord">
          <dl class="detail-summary">
            <div v-for="item in detailSummaryRows" :key="item.label" :class="{ wide: item.wide }">
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
          <pre class="json-content cross-verification-json">{{ formattedDetailJson }}</pre>
        </template>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!detailRecord"
          @click="copyDetail"
        >复制全部</el-button>
        <el-button size="small" type="primary" @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getVerificationRecord, listVerificationRecords } from '@/api/crossVerification'
import { copyText } from './utils/verificationUtils'

export default {
  name: 'VerificationRecords',
  data() {
    return {
      loading: false,
      hasLoaded: false,
      loadError: '',
      filters: this.createFilters(),
      records: [],
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      detailVisible: false,
      detailLoading: false,
      detailError: '',
      detailRecord: null
    }
  },
  computed: {
    detailSummaryRows() {
      if (!this.detailRecord) return []
      const record = this.detailRecord
      return [
        { label: '记录 ID', value: record.recordId, tooltip: true, wide: true },
        { label: '验证方式', value: this.formatVerifyType(record.verifyType, record.verifyName) },
        { label: '业务标识', value: record.businessId, tooltip: true },
        { label: '算法', value: record.algorithm },
        { label: '验证状态', tag: this.verifyStatusMeta(record.status) },
        { label: '结果 Hash', value: record.resultHash, tooltip: true, wide: true },
        { label: '可信账本状态', tag: this.ledgerStatusMeta(this.getLedgerStatus(record)) },
        { label: '数据写入链', value: this.getSourceChainLabel(record) },
        { label: '写入交易哈希', value: this.getTxHash(record), tooltip: true, wide: true },
        { label: '数据验证链', value: this.getVerificationChainLabel(record) },
        { label: '验证交易哈希', value: this.getCrossChainTxHash(record), tooltip: true, wide: true },
        { label: '创建时间', value: this.formatTime(record.createdAt || record.timestamp) }
      ]
    },
    formattedDetailJson() {
      return this.detailRecord ? JSON.stringify(this.detailRecord, null, 2) : ''
    }
  },
  created() {
    this.fetchRecords()
  },
  activated() {
    if (this.hasLoaded) this.fetchRecords()
  },
  methods: {
    createFilters() {
      return {
        verifyType: '',
        businessId: '',
        status: ''
      }
    },
    buildQueryParams() {
      const params = {
        page: this.pagination.page,
        size: this.pagination.size
      }
      if (this.filters.verifyType) params.verifyType = this.filters.verifyType
      if (this.filters.businessId) params.businessId = this.filters.businessId
      if (this.filters.status) params.status = this.filters.status
      return params
    },
    async fetchRecords() {
      this.loading = true
      this.loadError = ''
      try {
        const response = await listVerificationRecords(this.buildQueryParams())
        const normalized = this.normalizeListResponse(response)
        this.records = normalized.records
        this.pagination.page = normalized.page
        this.pagination.size = normalized.size
        this.pagination.total = normalized.total
      } catch (error) {
        this.records = []
        this.pagination.total = 0
        this.loadError = '验证记录加载失败，请稍后重试。'
        this.$message.error(this.loadError)
      } finally {
        this.loading = false
        this.hasLoaded = true
      }
    },
    normalizeListResponse(response) {
      if (Array.isArray(response)) {
        return {
          records: response,
          page: this.pagination.page,
          size: this.pagination.size,
          total: response.length
        }
      }
      const source = response || {}
      const records = this.pickRecords(source)
      const metaSource = source.data && !Array.isArray(source.data) ? source.data : {}
      const springPage = this.pickNumber([source.number, metaSource.number], null)
      const page = this.pickNumber([
        source.page,
        source.current,
        source.pageNum,
        metaSource.page,
        metaSource.current,
        metaSource.pageNum
      ], springPage == null ? this.pagination.page : springPage + 1)
      const size = this.pickNumber([
        source.size,
        source.pageSize,
        source.limit,
        metaSource.size,
        metaSource.pageSize,
        metaSource.limit
      ], this.pagination.size)
      const total = this.pickNumber([
        source.total,
        source.totalElements,
        source.totalCount,
        source.count,
        metaSource.total,
        metaSource.totalElements,
        metaSource.totalCount,
        metaSource.count
      ], records.length)
      return {
        records,
        page,
        size,
        total
      }
    },
    pickNumber(values, fallback) {
      for (const value of values) {
        if (value === '' || value == null) continue
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
      }
      return fallback
    },
    pickRecords(source) {
      if (Array.isArray(source.records)) return source.records
      if (Array.isArray(source.list)) return source.list
      if (Array.isArray(source.content)) return source.content
      if (source.data) {
        if (Array.isArray(source.data)) return source.data
        if (Array.isArray(source.data.records)) return source.data.records
        if (Array.isArray(source.data.list)) return source.data.list
        if (Array.isArray(source.data.content)) return source.data.content
      }
      return []
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchRecords()
    },
    resetFilters() {
      this.filters = this.createFilters()
      this.pagination.page = 1
      this.fetchRecords()
    },
    handleSizeChange(size) {
      this.pagination.size = size
      this.pagination.page = 1
      this.fetchRecords()
    },
    handlePageChange(page) {
      this.pagination.page = page
      this.fetchRecords()
    },
    async openDetail(row) {
      if (!row || !row.recordId) return
      this.detailVisible = true
      this.detailLoading = true
      this.detailError = ''
      this.detailRecord = null
      try {
        this.detailRecord = await getVerificationRecord(row.recordId)
      } catch (error) {
        this.detailError = '验证记录详情加载失败，请稍后重试。'
        this.$message.error(this.detailError)
      } finally {
        this.detailLoading = false
      }
    },
    copyRecordId(recordId) {
      if (!recordId) return
      copyText(recordId)
        .then(() => this.$message.success('记录 ID 已复制'))
        .catch(() => this.$message.warning('请手动选择记录 ID 复制'))
    },
    copyDetail() {
      copyText(this.formattedDetailJson)
        .then(() => this.$message.success('验证记录详情已复制'))
        .catch(() => this.$message.warning('请手动选择内容复制'))
    },
    formatVerifyType(type, name) {
      const typeMap = {
        MERKLE: '数据完整性验证',
        ZKP: '隐私证明验证',
        THRESHOLD_SIGNATURE: '多方签名验证'
      }
      return name || typeMap[type] || type || '-'
    },
    verifyStatusMeta(status) {
      const statusMap = {
        PASS: { text: '验证通过', type: 'success' },
        FAIL: { text: '验证未通过', type: 'danger' },
        ERROR: { text: '验证异常', type: 'danger' }
      }
      return statusMap[status] || { text: status || '未返回', type: 'info' }
    },
    ledgerStatusMeta(status) {
      const statusMap = {
        SUCCESS: { text: '已同步可信账本', type: 'success' },
        FAILED: { text: '同步失败', type: 'danger' },
        DISABLED: { text: '未启用同步', type: 'info' },
        PENDING: { text: '同步中', type: 'warning' },
        LEDGER_SUCCESS: { text: '已同步可信账本', type: 'success' },
        LEDGER_FAILED: { text: '同步失败', type: 'danger' }
      }
      return statusMap[status] || { text: status || '未启用同步', type: 'info' }
    },
    crossChainStatusMeta(status) {
      const statusMap = {
        SUCCESS: { text: '跨链成功', type: 'success' },
        FAILED: { text: '跨链失败', type: 'danger' },
        PENDING: { text: '跨链中', type: 'warning' }
      }
      return statusMap[status] || { text: '未执行', type: 'info' }
    },
    getCrossChainStatus(record) {
      const chain = record && record.chainVerification
      return record.crossChainStatus || (chain && chain.status) || ''
    },
    getCrossChainTxHash(record) {
      const chain = record && record.chainVerification
      return record.crossChainTxHash || (chain && (
        chain.txHash ||
        chain.txhash ||
        chain.txid ||
        chain.transactionHash ||
        chain.txId ||
        chain.txID ||
        chain.transactionId ||
        chain.transactionID
      )) || '-'
    },
    getSourceChainLabel(record) {
      const ledger = record && record.ledger
      const detail = record && record.detail
      const values = [
        record && record.sourceChain,
        ledger && ledger.sourceChainLabel,
        ledger && ledger.sourceChain,
        detail && detail.sourceChain,
        record && record.chainPath,
        record && record.resourcePath,
        ledger && ledger.chainPath,
        ledger && ledger.resourcePath
      ]
      return this.firstChainLabel(values, '未标记')
    },
    getVerificationChainLabel(record) {
      const chain = record && record.chainVerification
      const detail = record && record.detail
      const detailChain = detail && detail.chainVerification
      const values = [
        record && record.verificationChain,
        chain && chain.verificationChainLabel,
        chain && chain.verificationChain,
        detail && detail.verificationChain,
        detailChain && detailChain.verificationChainLabel,
        detailChain && detailChain.verificationChain,
        chain && chain.resourcePath,
        detailChain && detailChain.resourcePath
      ]
      return this.firstChainLabel(values, '验证链')
    },
    firstChainLabel(values, fallback) {
      for (const value of values) {
        const label = this.formatChainLabel(value, '')
        if (label) return label
      }
      return fallback
    },
    formatChainLabel(value, fallback) {
      const raw = String(value || '').trim()
      const text = raw.toLowerCase()
      if (!raw || this.looksLikeTransactionId(raw)) return fallback
      if (text.includes('bcos3')) return 'FISCO BCOS 3.0'
      if (text.includes('fabric')) return 'Fabric 1.4'
      if (text.includes('chainmaker')) return 'ChainMaker'
      return raw || fallback
    },
    looksLikeTransactionId(value) {
      return /^(0x)?[0-9a-f]{32,128}$/i.test(String(value || '').trim())
    },
    getLedgerStatus(record) {
      const ledger = record && record.ledger
      return record.ledgerStatus || (ledger && ledger.status) || 'DISABLED'
    },
    getTxHash(record) {
      const ledger = record && record.ledger
      return record.txHash || (ledger && (
        ledger.txHash ||
        ledger.txhash ||
        ledger.txid ||
        ledger.transactionHash ||
        ledger.txId ||
        ledger.txID ||
        ledger.transactionId ||
        ledger.transactionID
      )) || '-'
    },
    getChainPath(resourcePath) {
      const value = String(resourcePath || '')
      if (!value.includes('.')) return ''
      return value.slice(0, value.lastIndexOf('.'))
    },
    formatTime(value) {
      if (!value) return '-'
      const date = typeof value === 'number' ? new Date(value) : new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleString('zh-CN', { hour12: false })
    }
  }
}
</script>

<style lang="scss" scoped>
@import './styles/common.scss';

.page-shell {
  min-height: calc(100vh - 124px);
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.page-shell::v-deep .el-card__body {
  padding: 20px 20px 22px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}
.page-header p {
  margin: 8px 0 0;
  color: #909399;
  font-size: 14px;
  line-height: 22px;
}
.filter-panel {
  padding: 14px 14px 2px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.filter-form::v-deep .el-form-item {
  margin-bottom: 12px;
}
.filter-actions::v-deep .el-form-item__content {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
}
.filter-actions::v-deep .el-button + .el-button {
  margin-left: 0;
}
.table-alert {
  margin-bottom: 12px;
}
.records-table {
  width: 100%;
}
.records-table::v-deep .el-table__cell {
  vertical-align: top;
}
.record-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.record-cell strong,
.record-cell span,
.record-cell code {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-cell strong {
  color: #303133;
  font-weight: 600;
}
.record-cell span {
  color: #606266;
}
.record-cell code,
.chain-cell code {
  color: #1f5d8f;
  font: 12px Consolas, monospace;
}
.status-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.status-stack .status-tag {
  min-width: 68px;
}
.chain-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.chain-cell div {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  column-gap: 8px;
}
.chain-cell span {
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
}
.chain-cell em,
.chain-cell code {
  min-width: 0;
  overflow: hidden;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
}
.row-actions .el-button + .el-button {
  margin-left: 0;
}
.nowrap {
  white-space: nowrap;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.detail-alert {
  margin-bottom: 12px;
}
.detail-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 0 16px;
  border-top: 1px solid #ebeef5;
  border-left: 1px solid #ebeef5;
}
.detail-summary div {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  min-width: 0;
  min-height: 40px;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.detail-summary .wide {
  grid-column: 1 / -1;
}
.detail-summary dt,
.detail-summary dd {
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  line-height: 20px;
}
.detail-summary dt {
  color: #909399;
  background: #f5f7fa;
}
.detail-summary dd {
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
.json-content {
  max-height: 420px;
  min-height: 180px;
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
.dialog-footer {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
}
.record-detail-dialog-wrapper::v-deep .record-detail-dialog {
  max-width: calc(100vw - 40px);
}
@media (max-width: 900px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
  .detail-summary {
    grid-template-columns: 1fr;
  }
  .detail-summary div {
    grid-template-columns: 116px minmax(0, 1fr);
  }
}
</style>
