<template>
  <div v-loading="buttonState.loading" class="audit-list">
    <div v-if="!chainValue" class="audit-empty">
      <i class="el-icon-connection audit-empty__icon" />
      <div class="audit-empty__title">请先选择协同网络</div>
      <div class="audit-empty__desc">从左侧选择一个链网络后，可查看其中的数据调用和共享审计记录</div>
    </div>

    <template v-else>
      <div v-if="transactionList.length === 0 && !buttonState.loading" class="audit-empty">
        <i class="el-icon-document audit-empty__icon" />
        <div class="audit-empty__title">当前协同网络暂无共享审计记录</div>
        <div class="audit-empty__desc">该链网络尚未查询到可展示的数据调用或链上交易记录</div>
      </div>

      <el-table
        v-else
        ref="singleTable"
        class="audit-table"
        :data="transactionList"
        stripe
        fit
        tooltip-effect="light"
        height="calc(100% - 56px)"
      >
        <el-table-column label="可信记录哈希" show-overflow-tooltip>
          <template slot-scope="item">
            <div class="audit-hash-cell">
              <clipboard :input-data="item.row.txHash" />
              <span class="audit-hash-cell__text">{{ item.row.txHash }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作主体" width="120" show-overflow-tooltip>
          <template slot-scope="item">
            <unknown-value v-if="item.row.username === 'unknown'" :tx-hash="item.row.txHash" />
            <el-tag v-else :type="ua.admin ? 'warning' : 'success'" effect="plain" class="audit-subject-tag">
              {{ item.row.username }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="调用标识" width="112" align="center" show-overflow-tooltip>
          <template slot-scope="item">
            <unknown-value v-if="item.row.txID === 'unknown'" :tx-hash="item.row.txHash" />
            <span v-else class="audit-id-cell">{{ formatTxID(item.row.txID) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="账本高度" width="88" align="center">
          <template slot-scope="item">
            <unknown-value v-if="item.row.blockNumber === 'unknown'" :tx-hash="item.row.txHash" />
            <span v-else>{{ item.row.blockNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column label="数据资产标识" show-overflow-tooltip>
          <template slot-scope="item">
            <unknown-value v-if="item.row.path === 'unknown'" :tx-hash="item.row.txHash" />
            <span v-else class="audit-text-cell" :title="item.row.path">{{ formatAssetName(item.row.path) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="调用方法" width="90" show-overflow-tooltip>
          <template slot-scope="item">
            <unknown-value v-if="item.row.method === 'unknown'" :tx-hash="item.row.txHash" />
            <span v-else class="audit-text-cell">{{ item.row.method }}</span>
          </template>
        </el-table-column>
        <el-table-column label="执行凭证" width="88" align="center">
          <template slot-scope="item">
            <el-button type="text" size="small" @click="handleReceiptDetails(item.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="audit-pagination">
        <el-button
          class="audit-pagination__button"
          :disabled="buttonState.disablePreClick"
          :loading="buttonState.loading"
          size="small"
          icon="el-icon-back"
          @click="handlePrevClick"
        >上一页</el-button>
        <el-button
          class="audit-pagination__button"
          :disabled="buttonState.disableNextClick"
          :loading="buttonState.loading"
          size="small"
          icon="el-icon-right"
          @click="handleNextClick"
        >下一页</el-button>
      </div>
    </template>

    <el-dialog
      class="receipt-dialog"
      title="链上执行凭证"
      :visible.sync="receiptDialogVisible"
      width="760px"
      :destroy-on-close="true"
    >
      <div v-loading="receiptLoading" class="receipt-dialog__body">
        <el-alert
          v-if="receiptError"
          type="error"
          :closable="false"
          title="执行凭证加载失败，请稍后重试。"
        />
        <template v-else-if="txReceipt">
          <div class="receipt-summary">
            <div class="receipt-summary__item">
              <span>可信记录哈希：</span>
              <strong>{{ displayValue(activeReceiptRow.txHash) }}</strong>
            </div>
            <div class="receipt-summary__item">
              <span>账本高度：</span>
              <strong>{{ displayValue(activeReceiptRow.blockNumber) }}</strong>
            </div>
            <div class="receipt-summary__item">
              <span>数据资产标识：</span>
              <strong>{{ displayValue(activeReceiptRow.path) }}</strong>
            </div>
            <div class="receipt-summary__item">
              <span>调用方法：</span>
              <strong>{{ displayValue(activeReceiptRow.method) }}</strong>
            </div>
            <div class="receipt-summary__item">
              <span>操作主体：</span>
              <strong>{{ displayValue(activeReceiptRow.username) }}</strong>
            </div>
            <div class="receipt-summary__item">
              <span>调用标识：</span>
              <strong>{{ displayValue(activeReceiptRow.txID) }}</strong>
            </div>
          </div>
          <div class="receipt-json-head">
            <span>完整执行凭证</span>
            <clipboard :input-data="JSON.stringify(txReceipt)" />
          </div>
          <div class="receipt-json">
            <vue-json-pretty
              :expand-depth="2"
              :deep="3"
              show-length
              copyable
              :data="txReceipt"
              @click="handleClick"
            />
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listTransactions } from '@/api/transaction'
import { getTransaction } from '@/api/transaction'
import Clipboard from '@/components/Clipboard/index'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { handleErrorMsgBox } from '@/utils/messageBox'
import { limitString } from '@/utils'
import { getUsername } from '@/utils/auth'

const UnknownValue = {
  name: 'UnknownValue',
  props: {
    txHash: {
      type: String,
      default: ''
    }
  },
  methods: {
    limitString(str) {
      return limitString(str, 10)
    }
  },
  render(h) {
    return h('el-tooltip', {
      props: {
        effect: 'light',
        placement: 'top'
      }
    }, [
      h('div', {
        slot: 'content'
      }, '该记录不是由当前平台发起，部分业务字段无法识别。'),
      h('el-tag', {
        class: 'audit-unknown-tag',
        props: {
          type: 'warning',
          effect: 'plain'
        }
      }, '未识别')
    ])
  }
}

export default {
  name: 'TransactionList',
  components: {
    VueJsonPretty,
    Clipboard,
    UnknownValue
  },
  props: {
    chain: {
      type: String,
      default: () => {
        return null
      }
    }
  },
  data() {
    return {
      buttonState: {
        loading: false,
        disablePreClick: true,
        disableNextClick: false
      },
      chainValue: null,
      transactionList: [],
      nextOffset: 0,
      nextBlockNumber: -1,
      currentStep: 0,
      historyData: [],
      txReceipt: null,
      activeReceiptRow: {},
      receiptDialogVisible: false,
      receiptLoading: false,
      receiptError: false,
      controlVersion: 0
    }
  },
  computed: {
    ua() {
      const roles = this.$store.getters.roles || []
      return {
        admin: roles.includes('admin')
      }
    }
  },
  watch: {
    chain: function(val) {
      if (val) {
        this.handleSearch(val)
      } else {
        this.reset()
        this.chainValue = null
      }
    }
  },

  methods: {
    limitString(str) {
      return limitString(str, 10)
    },
    displayValue(value) {
      if (value === null || typeof value === 'undefined' || value === '') {
        return '-'
      }
      return value === 'unknown' ? '未识别' : value
    },
    formatTxID(value) {
      if (value === 0 || value === '0') {
        return '默认标识'
      }
      return value
    },
    formatAssetName(path) {
      if (!this.isKnownValue(path)) {
        return path
      }
      const parts = String(path).split('.')
      return parts[parts.length - 1] || path
    },
    isKnownValue(value) {
      return value !== null &&
        typeof value !== 'undefined' &&
        value !== '' &&
        value !== 'unknown'
    },
    defaultValue(value, defaultValue) {
      if (value === 0) {
        return value
      }
      if (!value) {
        return defaultValue
      }
      return value
    },
    getRecordProperties(record) {
      if (
        record &&
        record.properties &&
        typeof record.properties === 'object'
      ) {
        return record.properties
      }
      if (
        record &&
        record.properties &&
        typeof record.properties === 'string'
      ) {
        try {
          return JSON.parse(record.properties)
        } catch (e) {
          return {}
        }
      }
      return {}
    },
    isProxyRecord(record) {
      const properties = this.getRecordProperties(record)
      return record &&
        (
          record.byProxy === true ||
          record.byProxy === 'true' ||
          properties.byProxy === true ||
          properties.byProxy === 'true'
        )
    },
    resolveUsername(record) {
      const properties = this.getRecordProperties(record)
      const candidates = [
        record && record.username,
        record && record.userName,
        record && record.account,
        record && record.user,
        properties.username,
        properties.userName,
        properties.account,
        properties.user
      ]
      const username = candidates.find(this.isKnownValue)
      if (username) {
        return username
      }
      if (this.isProxyRecord(record)) {
        return getUsername() || 'unknown'
      }
      return 'unknown'
    },
    buildTransactionRow(record) {
      if (!record) {
        return {}
      }
      return {
        txHash: this.defaultValue(record.txHash, 'unknown'),
        username: this.resolveUsername(record),
        txID: this.defaultValue(record.xaTransactionID, 'unknown'),
        blockNumber: this.defaultValue(record.blockNumber, 'unknown'),
        path: this.defaultValue(record.path, 'unknown'),
        method: this.defaultValue(record.method, 'unknown'),
        properties: this.defaultValue(record.properties || record, 'unknown')
      }
    },
    mergeTransactionRow(baseRow, patchRow) {
      const mergedRow = { ...baseRow }
      Object.keys(patchRow).forEach((key) => {
        if (this.isKnownValue(patchRow[key]) || patchRow[key] === 0) {
          mergedRow[key] = patchRow[key]
        }
      })
      return mergedRow
    },
    updateTransactionRow(row) {
      const index = this.transactionList.findIndex((item) => {
        return item.txHash === row.txHash
      })
      if (index !== -1) {
        this.$set(this.transactionList, index, row)
      }
    },
    updateHistoryRow(historyIndex, row) {
      const historyRows = this.historyData[historyIndex]
      if (!Array.isArray(historyRows)) {
        return
      }
      const rowIndex = historyRows.findIndex((item) => {
        return item.txHash === row.txHash
      })
      if (rowIndex !== -1) {
        this.$set(historyRows, rowIndex, row)
      }
    },
    async hydrateTransactionRow(chainValue, row) {
      if (
        row.username !== 'unknown' ||
        !this.isKnownValue(row.txHash) ||
        !this.isKnownValue(row.blockNumber)
      ) {
        return row
      }

      const response = await getTransaction({
        path: chainValue,
        txHash: row.txHash,
        blockNumber: row.blockNumber
      }).catch(() => {
        return null
      })

      if (
        !response ||
        typeof response.errorCode === 'undefined' ||
        response.errorCode !== 0
      ) {
        return row
      }

      delete response.data.txBytes
      delete response.data.receiptBytes

      const rowFromReceipt = this.buildTransactionRow(response.data)
      const hydratedRow = this.mergeTransactionRow(row, rowFromReceipt)
      hydratedRow.properties = response.data
      return hydratedRow
    },
    hydrateTransactionRows(version, chainValue, rows, historyIndex) {
      rows.forEach((row) => {
        this.hydrateTransactionRow(chainValue, row).then((hydratedRow) => {
          if (
            this.controlVersion !== version ||
            hydratedRow === row
          ) {
            return
          }
          this.updateTransactionRow(hydratedRow)
          this.updateHistoryRow(historyIndex, hydratedRow)
        })
      })
    },
    reset() {
      this.transactionList = []
      this.nextOffset = 0
      this.nextBlockNumber = -1
      this.currentStep = 0
      this.historyData = []
      this.buttonState.disablePreClick = true
      this.buttonState.disableNextClick = false
    },
    async handleReceiptDetails(val) {
      this.receiptDialogVisible = true
      this.receiptLoading = true
      this.receiptError = false
      this.txReceipt = null
      this.activeReceiptRow = val

      if (
        val.properties &&
        typeof val.properties.byProxy !== 'undefined'
      ) {
        const rowFromReceipt = this.buildTransactionRow(val.properties)
        const updatedRow = this.mergeTransactionRow(val, rowFromReceipt)
        updatedRow.properties = val.properties
        this.txReceipt = val
        this.activeReceiptRow = updatedRow
        this.updateTransactionRow(updatedRow)
        this.receiptLoading = false
        return
      }

      const response = await getTransaction({
        path: this.chainValue,
        txHash: val.txHash,
        blockNumber: val.blockNumber
      }).catch(
        (error) => {
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        }
      )
      if (
        !response ||
        typeof response.errorCode === 'undefined' ||
        response.errorCode !== 0
      ) {
        this.receiptError = true
        this.receiptLoading = false
        return
      }
      const rowFromReceipt = this.buildTransactionRow(response.data)
      const updatedRow = this.mergeTransactionRow(this.activeReceiptRow, rowFromReceipt)
      updatedRow.properties = response.data
      this.txReceipt = response.data
      this.activeReceiptRow = updatedRow
      this.updateTransactionRow(updatedRow)
      this.receiptLoading = false
    },
    handlePrevClick() {
      if (this.currentStep <= 0) {
        this.$message({
          type: 'warning',
          message: '回退完毕！'
        })
      } else {
        this.currentStep = this.currentStep - 1
        this.transactionList = this.historyData[this.currentStep - 1]
      }
      this.updateButtonStatus()
    },
    handleNextClick() {
      if (this.currentStep < this.historyData.length) {
        this.transactionList = this.historyData[this.currentStep]
        this.currentStep += 1
        this.updateButtonStatus()
      } else {
        this.controlVersion = this.controlVersion + 1
        this.updateTransactionListForm(this.controlVersion, this.chainValue)
      }
    },
    handleClick(row) {
    },
    handleSearch(chainValue) {
      if (!chainValue) {
        this.reset()
        this.chainValue = null
        return
      }
      this.reset()
      this.controlVersion = this.controlVersion + 1
      this.chainValue = chainValue
      this.updateTransactionListForm(this.controlVersion, chainValue)
    },
    updateButtonStatus() {
      this.buttonState.loading = false
      this.buttonState.disableNextClick =
        this.nextBlockNumber <= 0 &&
        this.currentStep >= this.historyData.length
      this.buttonState.disablePreClick = this.currentStep <= 1
    },
    async fetchAllTx(chainValue, txHashes) {
      var txs = []

      if (txHashes.length === 0) {
        return txs
      }

      for (const tx of txHashes) {
        if (!tx.txHash) {
          throw new Error('可信记录哈希不存在，详情: ' + JSON.stringify(tx))
        }

        const response = await getTransaction({
          path: chainValue,
          txHash: tx.txHash,
          blockNumber: tx.blockNumber
        }).catch(
          (error) => {
            this.$message({
              message: '网络异常：' + error,
              type: 'error',
              duration: 5000
            })
          }
        )
        if (
          !response ||
          typeof response.errorCode === 'undefined' ||
            response.errorCode !== 0
        ) {
          throw new Error(
            '查询执行凭证失败，可信记录哈希: ' +
              tx.txhash +
              '，详情: ' +
              JSON.stringify(response)
          )
        }

        delete response.data.txBytes
        delete response.data.receiptBytes

        var newTx = this.buildTransactionRow(response.data)

        if (typeof response.data.errorCode !== 'undefined' && response.data.errorCode !== null && response.data.errorCode !== 0) {
          newTx.errorCode = response.data.errorCode
          newTx.message = this.defaultValue(response.data.message, 'unknown')
        }
        txs[txs.length] = newTx
      }

      return txs
    },
    async updateTransactionListForm(version, chainValue) {
      if (chainValue === null) {
        return
      }

      this.buttonState.loading = true
      await listTransactions({
        path: chainValue,
        blockNumber: this.nextBlockNumber,
        offset: this.nextOffset,
        size: 10
      })
        .then(async(resp) => {
          if (typeof resp.errorCode === 'undefined' || resp.errorCode !== 0) {
            handleErrorMsgBox('查询共享审计记录失败, 请手动刷新后再尝试, 详情: ', '错误', JSON.stringify(resp), null)
            this.buttonState.loading = false
            return
          }
          const transactions = Array.isArray(resp.data.transactions) ? resp.data.transactions : []
          const transactionWithDetails = Array.isArray(resp.data.transactionWithDetails) ? resp.data.transactionWithDetails : []
          if (transactions.length === 0 && transactionWithDetails.length === 0) {
            this.updateButtonStatus()
            return
          }
          if (transactionWithDetails.length !== 0) {
            this.nextBlockNumber = resp.data.nextBlockNumber
            this.nextOffset = resp.data.nextOffset
            var txs = []
            if (transactionWithDetails.length === 0) {
              return txs
            }
            if (this.controlVersion !== version) {
              return
            }
            for (const tx of transactionWithDetails) {
              var newTx = this.buildTransactionRow(tx)
              txs[txs.length] = newTx
            }
            const historyIndex = this.currentStep
            this.transactionList = txs
            this.historyData[historyIndex] = txs
            this.currentStep += 1
            this.updateButtonStatus()
            this.hydrateTransactionRows(version, chainValue, txs, historyIndex)
          }
          if (transactions.length !== 0) {
            this.fetchAllTx(chainValue, transactions)
              .then((response) => {
                this.buttonState.loading = false
                this.nextBlockNumber = resp.data.nextBlockNumber
                this.nextOffset = resp.data.nextOffset
                if (response.length === 0) {
                  this.updateButtonStatus()
                  return
                }
                if (this.controlVersion !== version) {
                  return
                }
                this.transactionList = response
                this.historyData[this.currentStep] = response
                this.currentStep += 1
                this.updateButtonStatus()
              })
              .catch((err) => {
                this.buttonState.loading = false
                this.$message({ type: 'error', message: err.toString() })
              })
          }
        })
        .catch((error) => {
          this.buttonState.loading = false
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        })
    }
  }
}
</script>

<style lang="scss">
.vjs-key {
  color: #BC2C10;
}
.vjs-tree {
  .vjs-value__string {
    color: #458385;
  }
  .vjs-value__number {
    color: #9D2DA7;
  }
  .vjs-value__null {
    color: #fb030d;
  }
}
</style>

<style lang="scss" scoped>
.audit-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.audit-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 48px 16px;
  color: #909399;
  text-align: center;
}

.audit-empty__icon {
  margin-bottom: 16px;
  color: #c0c4cc;
  font-size: 44px;
}

.audit-empty__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.audit-empty__desc {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
  line-height: 22px;
}

.audit-table {
  width: 100%;
}

.audit-table::v-deep .el-table__cell {
  padding: 12px 0;
}

.audit-table::v-deep .cell {
  display: flex;
  align-items: center;
  min-width: 0;
  line-height: 32px;
}

.audit-table::v-deep th .cell {
  display: flex;
  align-items: center;
  min-height: 36px;
  overflow: visible;
  line-height: 18px;
  text-overflow: clip;
  white-space: normal;
  word-break: break-all;
}

.audit-table::v-deep .is-center .cell {
  justify-content: center;
}

.audit-hash-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.audit-hash-cell::v-deep > div {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.audit-hash-cell::v-deep .el-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.audit-hash-cell__text,
.audit-text-cell,
.audit-id-cell {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-id-cell {
  text-align: center;
}

.audit-subject-tag {
  max-width: 104px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.audit-table::v-deep .audit-unknown-tag {
  display: inline-flex;
  align-items: center;
  max-width: 72px;
  height: 24px;
  line-height: 22px;
}

.audit-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 56px;
  border-top: 1px solid #ebeef5;
}

.audit-pagination__button {
  width: 88px;
  height: 32px;
  padding: 0;
  white-space: nowrap;
}

.audit-pagination__button + .audit-pagination__button {
  margin-left: 0;
}

.receipt-dialog::v-deep .el-dialog {
  max-width: calc(100vw - 40px);
}

.receipt-dialog__body {
  min-height: 180px;
}

.receipt-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  padding-bottom: 16px;
}

.receipt-summary__item {
  display: flex;
  gap: 8px;
  min-width: 0;
  color: #606266;
  font-size: 13px;
  line-height: 22px;
}

.receipt-summary__item span {
  flex: 0 0 98px;
  color: #909399;
}

.receipt-summary__item strong {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #303133;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-json-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  line-height: 24px;
}

.receipt-json {
  max-height: 420px;
  padding: 16px;
  overflow: auto;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
</style>
