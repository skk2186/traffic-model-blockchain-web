<template>
  <div v-loading="listLoading" class="resource-explorer">
    <div v-if="!chain" class="resource-empty">
      <i class="el-icon-connection resource-empty__icon" />
      <div class="resource-empty__title">请先选择协同网络</div>
      <div class="resource-empty__desc">从左侧选择一个链网络后，可查看其中已登记的数据资产</div>
    </div>

    <template v-else>
      <div v-if="resources.length === 0" class="resource-empty">
        <i class="el-icon-folder-opened resource-empty__icon" />
        <div class="resource-empty__title">当前协同网络暂无数据资产</div>
        <div class="resource-empty__desc">可点击“登记数据资产”接入新的链上数据服务</div>
      </div>

      <el-table
        v-else
        class="resource-table"
        :data="resources"
        height="100%"
        tooltip-effect="light"
      >
        <el-table-column label="数据资产标识" min-width="180" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="resource-path">{{ scope.row.path }}</span>
          </template>
        </el-table-column>
        <el-table-column label="链适配类型" min-width="130" show-overflow-tooltip>
          <template slot-scope="scope">
            <el-tag type="info" class="resource-type-tag">{{ scope.row.stubType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="链上元数据" min-width="180" show-overflow-tooltip>
          <template slot-scope="scope">
            <div class="metadata-cell">
              <clipboard :input-data="JSON.stringify(scope.row.properties)" />
              <span class="metadata-cell__text">{{ formatProperties(scope.row.properties) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template slot-scope="scope">
            <div class="resource-actions">
              <el-button
                plain
                size="mini"
                icon="el-icon-edit-outline"
                class="resource-actions__button"
                @click="onSend(scope.row.path)"
              >发起共享</el-button>
              <el-button
                plain
                size="mini"
                icon="el-icon-view"
                class="resource-actions__button"
                @click="onCall(scope.row.path)"
              >查询状态</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

    </template>

    <el-dialog class="asset-call-dialog" :title="'数据资产调用'" :visible.sync="callDialogOpen" :destroy-on-close="true" width="52%">
      <el-row>
        <el-col :span="20" :offset="2">
          <el-form v-loading="loading">
            <transaction-form
              ref="transactionForm"
              asset-mode
              show-cancel
              :transaction="transactionData"
              @submitClick="onSubmit"
              @clearClick="onClearTransaction"
              @cancelClick="callDialogOpen = false"
            >
              <el-input slot="path" v-model="transactionData.path" readonly />
            </transaction-form>
          </el-form>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script>
import {
  getResourceList
} from '@/api/resource'

import { call, sendTransaction } from '@/api/transaction'
import Clipboard from '@/components/Clipboard'

export default {
  name: 'ResourceExplorer',
  components: {
    Clipboard,
    TransactionForm: () => import('@/views/transaction/components/TransactionForm')
  },
  props: {
    chain: {
      type: String,
      default: () => { return null }
    },
    pageSize: {
      type: Number,
      default: () => { return 0 }
    }},
  data: function() {
    return {
      total: 0,
      page: 1,
      resources: [],
      queryStatus: {},
      callDialogOpen: false,
      transactionData: {
        transactionID: null,
        path: null,
        method: null,
        args: [{
          value: '',
          key: 0
        }],
        execMethod: 'sendTransaction',
        isXATransaction: false
      },
      selection: null,
      listLoading: false,
      loading: false
    }
  },
  watch: {
    chain: function(value) {
      this.page = 1
      if (value) {
        this.refresh()
      } else {
        this.resources = []
        this.total = 0
      }
    }
  },
  methods: {
    refresh(showLoading = false) {
      this.selection = null
      var path = this.chain
      if (!path) {
        this.resources = []
        this.total = 0
        return Promise.resolve()
      }
      if (showLoading) {
        this.setListLoading(true)
      }

      return getResourceList({
        path: path,
        offset: (this.page - 1) * this.pageSize,
        size: this.pageSize
      }, null).then((response) => {
        if (response.errorCode === 0) {
          this.resources = response.data.resourceDetails
          this.total = response.data.total
        } else {
          this.$message({
            type: 'error',
            message: '查询数据资产目录失败，错误信息: ' + response.message
          })
        }
      }).catch((error) => {
        console.log(error)
        this.$message({
          type: 'error',
          message: '网络异常'
        })
      }).finally(() => {
        if (showLoading) {
          this.setListLoading(false)
        }
      })
    },
    formatProperties(properties) {
      return JSON.stringify(properties)
    },
    setListLoading(value) {
      this.listLoading = value
      this.$emit('loading-change', value)
    },
    onCall(path) {
      this.onClearTransaction()
      this.selection = path
      this.transactionData.path = path
      this.transactionData.execMethod = 'call'
      this.callDialogOpen = true
    },
    onSend(path) {
      this.onClearTransaction()
      this.selection = path
      this.transactionData.path = path
      this.transactionData.execMethod = 'sendTransaction'
      this.callDialogOpen = true
    },
    onClearTransaction() {
      this.transactionData.method = null
      this.transactionData.args = [{
        value: '',
        key: 0
      }]
      this.transactionData.path = this.selection
    },
    onSubmit() {
      this.loading = true
      const args = []
      for (const arg of this.transactionData.args) {
        args.push(arg.value)
      }
      if (this.transactionData.execMethod === 'sendTransaction') {
        sendTransaction({
          version: '1',
          path: this.transactionData.path,
          data: {
            method: this.transactionData.method,
            args: args
          }
        }).then(response => {
          this.onResponse(response)
        }).catch(error => {
          this.loading = false
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        })
      } else {
        call({
          version: '1',
          path: this.transactionData.path,
          data: {
            method: this.transactionData.method,
            args: args
          }
        }).then(response => {
          this.onResponse(response)
        }).catch(error => {
          this.loading = false
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        })
      }
    },
    onResponse(response) {
      this.loading = false
      this.$refs.transactionForm.onResponse(response)
    }
  }
}
</script>

<style lang="scss" scoped>
.resource-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.resource-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  padding: 48px 16px;
  color: #909399;
  text-align: center;
}

.resource-empty__icon {
  margin-bottom: 16px;
  color: #c0c4cc;
  font-size: 44px;
}

.resource-empty__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.resource-empty__desc {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
  line-height: 22px;
}

.resource-table {
  width: 100%;
}

.resource-table::v-deep .el-table__cell {
  padding: 12px 0;
}

.resource-table::v-deep .cell {
  line-height: 32px;
}

.resource-path {
  display: block;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-type-tag {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.metadata-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.metadata-cell::v-deep > div {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.metadata-cell::v-deep .el-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.metadata-cell__text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.resource-actions__button {
  width: 88px;
  height: 32px;
  padding: 0;
  line-height: 30px;
  white-space: nowrap;
}

.resource-actions__button + .resource-actions__button {
  margin-left: 0;
}

.asset-call-dialog::v-deep .el-input,
.asset-call-dialog::v-deep .el-textarea {
  width: 100%;
}
</style>
