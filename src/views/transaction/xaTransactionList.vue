<template>
  <div class="app-container xa-task-manager">
    <el-card>
      <div class="xa-task-manager__header">
        <div>
          <h2 class="xa-task-manager__title">跨域协同任务</h2>
          <p class="xa-task-manager__desc">基于 XA 跨链事务，协调多个链网络中的数据操作并保证一致提交或回滚。</p>
        </div>
        <el-button
          id="sendxaTransaction"
          type="primary"
          icon="el-icon-s-order"
          @click="onStartXATransaction"
        >创建协同任务</el-button>
      </div>

      <el-row :gutter="16" class="xa-task-manager__content">
        <el-col class="xa-task-manager__col" :xs="24" :sm="24" :md="6" :lg="5">
          <el-card class="xa-network-panel">
            <div slot="header" class="xa-network-panel__header">
              <div>
                <span class="xa-network-panel__title">协同网络</span>
                <p class="xa-network-panel__desc">请选择需要查看的链网络</p>
              </div>
              <!-- <el-tooltip id="resourceHelp" effect="light" content="如何使用跨域协同任务？" placement="top">
                <el-button type="text" size="mini" class="xa-network-panel__help" @click="howToUseResource">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip> -->
            </div>
            <div class="xa-network-panel__tree">
              <ChainExplorer
                id="ChainExplorer"
                :chain="currentChain"
                @zone-click="onZoneClick"
                @chain-click="onChainClick"
              />
            </div>
          </el-card>
        </el-col>
        <el-col class="xa-task-manager__col" :xs="24" :sm="24" :md="18" :lg="19">
          <el-card id="xaTransactionListExplorer" class="xa-task-panel">
            <div slot="header" class="xa-task-panel__header">
              <div class="xa-task-panel__heading">
                <span class="xa-task-panel__title">协同任务列表</span>
                <div class="xa-task-panel__chain">
                  <span>当前协同网络：</span>
                  <el-tag v-if="currentChain" type="info" size="mini">{{ currentChain }}</el-tag>
                  <span v-else class="xa-task-panel__chain-empty">未选择</span>
                </div>
              </div>
              <el-button
                icon="el-icon-refresh"
                size="mini"
                :disabled="!currentChain"
                @click="refresh"
              >刷新</el-button>
            </div>

            <div v-loading="loadingList" class="xa-task-panel__body">
              <el-alert
                v-if="partialListWarning"
                title="部分协同任务数据存在异常，当前展示后端已返回的可用结果。"
                type="warning"
                show-icon
                :closable="false"
                class="xa-task-panel__alert"
              />

              <div v-if="!currentChain" class="xa-task-empty">
                <i class="el-icon-connection xa-task-empty__icon" />
                <div class="xa-task-empty__title">请先选择协同网络</div>
                <div class="xa-task-empty__desc">从左侧选择一个链网络后，可查看其中的跨域协同任务。</div>
              </div>

              <div v-else-if="listLoadFailed" class="xa-task-empty">
                <i class="el-icon-warning-outline xa-task-empty__icon xa-task-empty__icon--error" />
                <div class="xa-task-empty__title">协同任务加载失败</div>
                <div class="xa-task-empty__desc">请检查网络或后端服务后重试。</div>
                <el-button type="primary" size="small" icon="el-icon-refresh" @click="refresh">重新加载</el-button>
              </div>

              <div v-else-if="xaList.length === 0 && !loadingList" class="xa-task-empty">
                <i class="el-icon-document xa-task-empty__icon" />
                <div class="xa-task-empty__title">当前协同网络暂无任务</div>
                <div class="xa-task-empty__desc">可点击“创建协同任务”，关联多个数据资产并发起跨域协同。</div>
              </div>

              <template v-else>
                <el-table
                  ref="singleTable"
                  :data="xaList"
                  fit
                  stripe
                  height="calc(100% - 52px)"
                  style="width: 100%"
                  tooltip-effect="light"
                  :expand-row-keys="expands"
                  :row-key="getRowKey"
                  @expand-change="onExpandChange"
                >
                  <el-table-column label="创建时间" width="160">
                    <template slot-scope="scope">
                      <span class="nowrap-cell">{{ formatTimestamp(scope.row.timestamp) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="xaTransactionID" label="协同任务标识" min-width="180">
                    <template slot-scope="scope">
                      <div class="task-id-cell">
                        <clipboard :input-data="scope.row.xaTransactionID" />
                        <span>{{ scope.row.xaTransactionID }}</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="发起身份" width="110">
                    <template slot-scope="scope">
                      <el-tag v-if="!nonNull(scope.row.username)" type="info" effect="plain">unknown</el-tag>
                      <span v-else class="single-line-cell">{{ scope.row.username }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="关联数据资产" min-width="170">
                    <template slot-scope="scope">
                      <el-popover
                        v-if="getTaskPaths(scope.row).length"
                        placement="top-start"
                        width="360"
                        trigger="hover"
                      >
                        <div class="path-popover">
                          <div
                            v-for="path in getTaskPaths(scope.row)"
                            :key="path"
                            class="path-popover__item"
                          >{{ path }}</div>
                        </div>
                        <div slot="reference" class="asset-path-cell">
                          <span>{{ getFirstPath(scope.row) }}</span>
                          <el-tag v-if="getMorePathCount(scope.row) > 0" size="mini" type="info">+{{ getMorePathCount(scope.row) }} 项</el-tag>
                        </div>
                      </el-popover>
                      <span v-else>--</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="执行状态" width="100">
                    <template slot-scope="scope">
                      <el-tooltip
                        v-if="isUnknownTaskStatus(scope.row.status)"
                        effect="light"
                        :content="'后端返回状态：' + stringifyStatus(scope.row.status)"
                        placement="top"
                      >
                        <el-tag :type="getTaskStatusTag(scope.row.status)" effect="dark">{{ getTaskStatusLabel(scope.row.status) }}</el-tag>
                      </el-tooltip>
                      <el-tag v-else :type="getTaskStatusTag(scope.row.status)" effect="dark">{{ getTaskStatusLabel(scope.row.status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="完成时间" width="160">
                    <template slot-scope="scope">
                      <span class="nowrap-cell">{{ getFinishTime(scope.row) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column type="expand" label="详情" width="76">
                    <template slot-scope="scope">
                      <div v-loading="loadingXA" class="table-expand">
                        <div class="task-overview">
                          <div class="task-overview__title">任务概览</div>
                          <el-row :gutter="16">
                            <el-col :xs="24" :sm="12" :md="8">
                              <span class="task-overview__label">协同任务标识：</span>
                              <span class="task-overview__value">{{ getExpandedTask(scope.row).xaTransactionID }}</span>
                            </el-col>
                            <el-col :xs="24" :sm="12" :md="8">
                              <span class="task-overview__label">执行状态：</span>
                              <span class="task-overview__value">{{ getTaskStatusLabel(getExpandedTask(scope.row).status) }}</span>
                            </el-col>
                            <el-col v-if="hasCreateTime(getExpandedTask(scope.row))" :xs="24" :sm="12" :md="8">
                              <span class="task-overview__label">创建时间：</span>
                              <span class="task-overview__value nowrap-cell">{{ formatTimestamp(getExpandedTask(scope.row).timestamp) }}</span>
                            </el-col>
                            <el-col :xs="24" :sm="12" :md="8">
                              <span class="task-overview__label">关联数据资产：</span>
                              <span class="task-overview__value">{{ getTaskPaths(getExpandedTask(scope.row)).length }} 项</span>
                            </el-col>
                            <el-col :xs="24" :sm="12" :md="8">
                              <span class="task-overview__label">完成时间：</span>
                              <span class="task-overview__value nowrap-cell">{{ getFinishTime(getExpandedTask(scope.row)) }}</span>
                            </el-col>
                          </el-row>
                        </div>

                        <div class="task-step-title">协同执行步骤</div>
                        <el-table
                          :data="getExpandedSteps(scope.row)"
                          max-height="400px"
                          fit
                          empty-text="无协同执行步骤"
                          tooltip-effect="light"
                        >
                          <el-table-column label="执行时间" width="170">
                            <template slot-scope="step">
                              <span class="nowrap-cell">{{ formatTimestamp(step.row.timestamp) }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column prop="xaTransactionSeq" label="步骤序号" width="110" show-overflow-tooltip />
                          <el-table-column label="操作主体" width="140">
                            <template slot-scope="step">
                              <el-tag v-if="!nonNull(step.row.username)" type="info" effect="plain">unknown</el-tag>
                              <span v-else class="single-line-cell">{{ step.row.username }}</span>
                            </template>
                          </el-table-column>
                          <el-table-column prop="path" label="数据资产标识" min-width="180" show-overflow-tooltip />
                          <el-table-column prop="method" label="调用方法" width="130" show-overflow-tooltip />
                          <el-table-column label="调用参数" min-width="180" show-overflow-tooltip>
                            <template slot-scope="step">
                              <span class="single-line-cell">{{ formatStepArgs(step.row.args) }}</span>
                            </template>
                          </el-table-column>
                        </el-table>

                        <div v-if="isCommittedTask(getExpandedTask(scope.row))" class="task-result-line">
                          提交时间：{{ formatTimestamp(getExpandedTask(scope.row).commitTimestamp) }}
                        </div>
                        <div v-if="isRolledbackTask(getExpandedTask(scope.row))" class="task-result-line">
                          回滚时间：{{ formatTimestamp(getExpandedTask(scope.row).rollbackTimestamp) }}
                        </div>
                        <div v-if="shouldShowContinueButton(scope.row)" class="task-action-line">
                          <el-button
                            type="primary"
                            :disabled="!canContinueTask(scope.row)"
                            @click="onExecXATransaction(getContinueTransactionID(scope.row), getContinuePaths(scope.row))"
                          >继续执行任务</el-button>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="xa-task-pagination">
                  <el-button
                    :disabled="preClickDisable"
                    size="small"
                    icon="el-icon-back"
                    @click="handlePrevClick"
                  >上一页</el-button>
                  <span class="xa-task-pagination__page">第 {{ currentPage }} 页</span>
                  <el-button
                    :disabled="nextClickDisable"
                    size="small"
                    @click="handleNextClick"
                  >
                    下一页
                    <i class="el-icon-right" />
                  </el-button>
                </div>
              </template>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import { parseTime } from '@/utils'
import ChainExplorer from '@/components/ChainExplorer'
import { getXATransaction, listXATransactions } from '@/api/transaction'
import { buildXAResponseError } from '@/utils/transaction'
import { xaTransactionManagerSteps } from './transactionSteps/xaTransactionStep.js'
import { handleErrorMsgBox, handleWarningMsgBox } from '@/utils/messageBox'
import Clipboard from '@/components/Clipboard'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'
export default {
  name: 'XATransactionList',
  components: { Clipboard, ChainExplorer },
  filters: {
    formatDate(time) {
      time = time * 1000
      const date = new Date(time)
      return parseTime(date, null)
    }
  },
  props: {},
  data() {
    return {
      loadingList: false,
      loadingXA: false,
      tableSize: 10,
      expands: [],
      currentPage: 1,
      isFinished: false,
      offsetsCache: [{}],
      offsets: new Map(),
      preClickDisable: true,
      nextClickDisable: false,
      listLoadFailed: false,
      partialListWarning: false,
      xaList: [
      ],
      xaTransaction: {
        username: null,
        xaTransactionID: null,
        status: null,
        commitTimestamp: 0,
        rollbackTimestamp: 0,
        paths: [],
        xaTransactionSteps: [
          {
            timestamp: 0,
            username: null,
            xaTransactionSeq: 0,
            path: null,
            method: null,
            args: null
          }
        ]
      },
      currentChainData: {},
      currentZone: undefined,
      currentChain: undefined
    }
  },
  created() {
    // this.refresh()
  },
  mounted() {},
  methods: {
    howToUseResource() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: xaTransactionManagerSteps
      }).start()
    },
    onZoneClick(path) {
      if (this.currentZone !== path) {
        this.currentZone = path
      }
    },
    onChainClick(path, data) {
      if (this.currentChain !== path) {
        this.currentChain = path
        this.currentChainData = data
        this.currentZone = path.split('.')[0]
        this.resetAllData()
        this.fetchXATransactionList()
      }
    },
    resetAllData() {
      this.currentPage = 1
      this.isFinished = false
      this.offsetsCache = [{}]
      this.offsets = new Map()
      this.xaList = []
      this.xaTransaction = null
      this.preClickDisable = true
      this.nextClickDisable = false
      this.listLoadFailed = false
      this.partialListWarning = false
    },
    refresh() {
      this.resetAllData()
      this.fetchXATransactionList()
    },
    filterTag(tag) {
      return this.getTaskStatusTag(tag)
    },
    filterData(data) {
      return this.getTaskStatusLabel(data)
    },
    nonNull(data) {
      return typeof data !== 'undefined' && data !== null
    },
    isValidTimestamp(time) {
      const timestamp = Number(time)
      return Number.isFinite(timestamp) && timestamp > 0
    },
    formatTimestamp(time) {
      if (!this.nonNull(time) || time === '') {
        return '--'
      }
      const timestamp = Number(time)
      if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return '--'
      }
      const timeMs = timestamp > 9999999999 ? timestamp : timestamp * 1000
      return parseTime(new Date(timeMs), null)
    },
    hasCreateTime(row) {
      return row && this.isValidTimestamp(row.timestamp)
    },
    formatStepArgs(args) {
      if (!this.nonNull(args) || args === '') {
        return '--'
      }
      if (Array.isArray(args)) {
        const values = args
          .filter(item => this.nonNull(item) && String(item).trim() !== '')
          .map(item => this.formatSingleArg(item))
        return values.length ? values.join(', ') : '--'
      }
      if (typeof args === 'object') {
        const keys = Object.keys(args)
        return keys.length ? JSON.stringify(args) : '--'
      }
      const value = this.formatSingleArg(args)
      return value && value !== '[]' && value !== 'null' && value !== 'undefined' ? value : '--'
    },
    formatSingleArg(arg) {
      const value = String(arg).trim()
      if (!value || value === '[]' || value === 'null' || value === 'undefined') {
        return ''
      }
      const decoded = this.decodeAbiTextArg(value)
      if (decoded) {
        return decoded
      }
      const numberText = this.decodeAbiNumberArg(value)
      if (numberText) {
        return numberText
      }
      return this.compactLongArg(value)
    },
    decodeAbiTextArg(value) {
      const hex = this.normalizeHex(value)
      if (!hex || hex.length < 128 || hex.length % 64 !== 0) {
        return null
      }
      const offset = parseInt(hex.slice(0, 64), 16)
      if (!Number.isFinite(offset) || offset < 0) {
        return null
      }
      const lengthStart = offset * 2
      if (lengthStart + 64 > hex.length) {
        return null
      }
      const textLength = parseInt(hex.slice(lengthStart, lengthStart + 64), 16)
      const dataStart = lengthStart + 64
      const dataEnd = dataStart + textLength * 2
      if (!Number.isFinite(textLength) || textLength <= 0 || dataEnd > hex.length) {
        return null
      }
      const text = this.hexToAscii(hex.slice(dataStart, dataEnd))
      return text && this.isReadableText(text) ? text : null
    },
    decodeAbiNumberArg(value) {
      const hex = this.normalizeHex(value)
      if (!hex || hex.length !== 64) {
        return null
      }
      const number = parseInt(hex, 16)
      if (!Number.isSafeInteger(number)) {
        return null
      }
      return String(number)
    },
    normalizeHex(value) {
      const hex = String(value).replace(/\s+/g, '').replace(/^0x/i, '')
      return /^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0 ? hex : null
    },
    hexToAscii(hex) {
      const chars = []
      for (let index = 0; index < hex.length; index += 2) {
        const code = parseInt(hex.slice(index, index + 2), 16)
        if (!Number.isFinite(code)) {
          return ''
        }
        chars.push(String.fromCharCode(code))
      }
      return chars.join('')
    },
    isReadableText(text) {
      return /^[\x20-\x7E]+$/.test(text)
    },
    compactLongArg(value) {
      return value.length > 72 ? value.slice(0, 36) + '...' + value.slice(-16) : value
    },
    stringifyStatus(status) {
      if (!this.nonNull(status) || status === '') {
        return '空值'
      }
      return String(status)
    },
    normalizeTaskStatus(status) {
      const normalized = this.nonNull(status) ? String(status).trim().toLowerCase() : ''
      const aliases = {
        执行中: 'processing',
        已提交: 'committed',
        已回滚: 'rolledback',
        执行异常: 'failed',
        running: 'processing',
        pending: 'processing',
        rollbacked: 'rolledback'
      }
      return aliases[normalized] || normalized
    },
    getTaskStatusLabel(status) {
      const labels = {
        processing: '执行中',
        committed: '已提交',
        rolledback: '已回滚',
        failed: '执行异常',
        error: '执行异常'
      }
      return labels[this.normalizeTaskStatus(status)] || '状态未知'
    },
    getTaskStatusTag(status) {
      const tags = {
        processing: 'warning',
        committed: 'success',
        rolledback: 'danger',
        failed: 'danger',
        error: 'danger'
      }
      return tags[this.normalizeTaskStatus(status)] || 'info'
    },
    isUnknownTaskStatus(status) {
      return !['processing', 'committed', 'rolledback', 'failed', 'error'].includes(this.normalizeTaskStatus(status))
    },
    isProcessingTask(row) {
      return row && this.normalizeTaskStatus(row.status) === 'processing'
    },
    isCommittedTask(row) {
      return row && this.normalizeTaskStatus(row.status) === 'committed'
    },
    isRolledbackTask(row) {
      return row && this.normalizeTaskStatus(row.status) === 'rolledback'
    },
    isFinalTask(row) {
      const status = row ? this.normalizeTaskStatus(row.status) : ''
      return ['committed', 'rolledback', 'failed', 'error'].includes(status)
    },
    getTaskPaths(row) {
      if (!row || !Array.isArray(row.paths)) {
        return []
      }
      return row.paths.filter(path => this.nonNull(path) && path !== '')
    },
    getFirstPath(row) {
      return this.getTaskPaths(row)[0] || '--'
    },
    getMorePathCount(row) {
      return Math.max(this.getTaskPaths(row).length - 1, 0)
    },
    getFinishTimestamp(row) {
      if (!row) {
        return null
      }
      const committedFields = ['commitTimestamp', 'committedTimestamp', 'commitTime', 'committedTime']
      const rolledbackFields = ['rollbackTimestamp', 'rolledbackTimestamp', 'rollbackTime', 'rolledbackTime']
      const commonFields = ['finishTimestamp', 'finishedTimestamp', 'completeTimestamp', 'completedTimestamp', 'endTimestamp', 'endTime', '__finishTimestamp']
      const fields = this.isCommittedTask(row)
        ? committedFields.concat(commonFields)
        : this.isRolledbackTask(row)
          ? rolledbackFields.concat(commonFields)
          : commonFields
      for (const field of fields) {
        if (this.isValidTimestamp(row[field])) {
          return row[field]
        }
      }
      return null
    },
    getRawFinishTimestamp(row) {
      if (!row) {
        return null
      }
      const fields = [
        'finishTimestamp',
        'finishedTimestamp',
        'completeTimestamp',
        'completedTimestamp',
        'endTimestamp',
        'endTime',
        'commitTimestamp',
        'committedTimestamp',
        'commitTime',
        'committedTime',
        'rollbackTimestamp',
        'rolledbackTimestamp',
        'rollbackTime',
        'rolledbackTime',
        '__finishTimestamp'
      ]
      for (const field of fields) {
        if (this.isValidTimestamp(row[field])) {
          return row[field]
        }
      }
      return null
    },
    getFinishTime(row) {
      return this.formatTimestamp(this.getFinishTimestamp(row))
    },
    getExpandedTask(row) {
      const merged = Object.assign({}, row || {}, this.xaTransaction || {})
      const detailStatus = this.xaTransaction ? this.normalizeTaskStatus(this.xaTransaction.status) : ''
      if (!detailStatus || this.isUnknownTaskStatus(detailStatus)) {
        merged.status = row ? row.status : merged.status
      } else {
        merged.status = detailStatus
      }
      return merged
    },
    getExpandedSteps(row) {
      const task = this.getExpandedTask(row)
      return Array.isArray(task.xaTransactionSteps) ? task.xaTransactionSteps : []
    },
    getContinueTransactionID(row) {
      return this.getExpandedTask(row).xaTransactionID || (row ? row.xaTransactionID : null)
    },
    getContinuePaths(row) {
      const task = this.getExpandedTask(row)
      return Array.isArray(task.paths) && task.paths.length > 0
        ? task.paths
        : row && Array.isArray(row.paths)
          ? row.paths
          : []
    },
    canContinueTask(row) {
      return Boolean(this.getContinueTransactionID(row)) && this.getContinuePaths(row).length > 0
    },
    shouldShowContinueButton(row) {
      const expandedTask = this.getExpandedTask(row)
      if (this.isProcessingTask(row) || this.isProcessingTask(expandedTask)) {
        return true
      }
      if (this.isFinalTask(row) || this.isFinalTask(expandedTask)) {
        return false
      }
      return this.canContinueTask(row) && !this.getFinishTimestamp(expandedTask)
    },
    onStartXATransaction() {
      this.$router.push({ path: 'xaTransaction' })
    },
    fetchXATransactionList() {
      if (!this.currentChain) {
        this.$message.error('请先从zone-chain导航中选择对应的链')
        return
      }
      this.loadingList = true
      this.listLoadFailed = false
      this.partialListWarning = false
      this.xaList = []
      listXATransactions({
        version: '1.0',
        data: {
          path: this.currentChain,
          size: this.tableSize,
          offsets: this.offsets
        }
      })
        .then((response) => {
          this.loadingList = false

          if (!response) {
            this.listLoadFailed = true
            return
          }

          if (
            typeof response.errorCode === 'undefined' ||
            response.errorCode !== 0
          ) {
            this.listLoadFailed = true
            return
          }

          if (!response.data) {
            this.listLoadFailed = true
            return
          }

          const xaResponse = response.data.xaResponse
          if (typeof xaResponse !== 'undefined' && xaResponse.status !== 0) {
            this.partialListWarning = true
          }

          this.isFinished = response.data.finished
          this.offsets = response.data.nextOffsets
          this.xaList = Array.isArray(response.data.xaList) ? response.data.xaList : []

          // update offsets cache
          this.offsetsCache[this.currentPage] = this.offsets

          // update disable button
          this.updateDisableButtonStatus()
          this.fillListFinishTimes()
        })
        .catch((error) => {
          this.loadingList = false
          this.listLoadFailed = true
          console.error('fetch xa transaction list failed: ', error)
        })
    },
    onExecXATransaction(xaTID, xaPaths) {
      this.$store.commit('transaction/SET_TRANSACTION', {
        transactionID: xaTID,
        paths: xaPaths
      })
      this.$router.push({ path: 'xaTransaction', query: { isExec: 'true' }})
    },
    getRowKey(row) {
      return row.xaTransactionID
    },
    onExpandChange(row, expandedRows) {
      if (expandedRows.length) {
        this.expands = []
        if (row) {
          this.expands.push(row.xaTransactionID)
          this.fetchXATransaction(row.xaTransactionID, row.paths)
        }
      } else {
        this.expands = []
      }
    },
    fetchXATransaction(xaTransactionID, paths) {
      console.log('paths ', paths)
      this.loadingXA = true
      this.xaTransaction = null
      getXATransaction({
        version: '1',
        data: {
          xaTransactionID: xaTransactionID,
          paths: paths
        }
      })
        .then((response) => {
          this.loadingXA = false

          if (
            typeof response.errorCode === 'undefined' ||
            response.errorCode !== 0
          ) {
            handleErrorMsgBox(
              '查询事务详情失败: ',
              '错误',
              buildXAResponseError(response),
              null
            ).catch((_) => {})
            return
          }

          const xaResponse = response.data.xaResponse
          if (typeof xaResponse !== 'undefined' && xaResponse.status !== 0) {
            handleWarningMsgBox(
              '警告，有错误发生: ',
              '警告',
              buildXAResponseError(response),
              null
            ).catch((_) => {})
          }

          this.xaTransaction = response.data.xaTransaction
        })
        .catch((error) => {
          this.loadingXA = false
          this.$message({
            message: '网络异常，详情：' + error,
            type: 'error',
            duration: 5000
          })
        })
    },
    fillListFinishTimes() {
      const tasks = this.xaList.filter(row => {
        return (this.isCommittedTask(row) || this.isRolledbackTask(row)) &&
          !this.getRawFinishTimestamp(row) &&
          row.xaTransactionID &&
          Array.isArray(row.paths)
      })
      tasks.forEach(row => {
        getXATransaction({
          version: '1',
          data: {
            xaTransactionID: row.xaTransactionID,
            paths: row.paths
          }
        }).then(response => {
          if (
            response &&
            response.errorCode === 0 &&
            response.data &&
            response.data.xaTransaction
          ) {
            const detail = response.data.xaTransaction
            const finishTimestamp = this.isCommittedTask(row)
              ? detail.commitTimestamp
              : detail.rollbackTimestamp
            if (this.isValidTimestamp(finishTimestamp)) {
              this.$set(row, '__finishTimestamp', finishTimestamp)
            }
          }
        }).catch(error => {
          console.error('fetch xa finish time failed: ', error)
        })
      })
    },
    handleNextClick() {
      if (!this.isFinished) {
        this.currentPage = this.currentPage + 1
        this.updateCurrentOffsets()
        this.fetchXATransactionList()
      }
    },
    handlePrevClick() {
      this.currentPage = this.currentPage - 1
      this.updateCurrentOffsets()
      this.fetchXATransactionList()
    },
    updateCurrentOffsets() {
      this.offsets = this.offsetsCache[this.currentPage - 1]
    },
    updateDisableButtonStatus() {
      // next page
      this.nextClickDisable = this.isFinished
      // prev page
      this.preClickDisable = this.currentPage <= 1
    }
  }
}
</script>

<style lang="scss" scoped>
.xa-task-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.xa-task-manager__title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.xa-task-manager__desc {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.xa-task-manager__content {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.xa-task-manager__col {
  display: flex;
}

.xa-network-panel,
.xa-task-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 560px;
  min-height: 0;
}

.xa-network-panel {
  margin-bottom: 0;
}

.xa-network-panel::v-deep .el-card__body {
  flex: 1;
  height: auto;
  min-height: 0;
  padding: 0;
}

.xa-task-panel::v-deep .el-card__body {
  box-sizing: border-box;
  flex: 1;
  height: auto;
  min-height: 0;
  padding: 12px 16px 0;
}

.xa-network-panel__header,
.xa-task-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.xa-network-panel__title,
.xa-task-panel__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.xa-network-panel__desc {
  margin: 2px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}

.xa-network-panel__help {
  padding: 0;
  margin-left: 10px;
}

.xa-network-panel__tree {
  height: 100%;
  overflow-y: auto;
  padding: 12px 16px;
}

.xa-task-panel__heading {
  min-width: 0;
}

.xa-task-panel__chain {
  display: flex;
  align-items: center;
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.xa-task-panel__chain .el-tag {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xa-task-panel__chain-empty {
  color: #909399;
}

.xa-task-panel__body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.xa-task-panel__alert {
  margin-bottom: 12px;
}

.xa-task-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  color: #909399;
  text-align: center;
}

.xa-task-empty__icon {
  color: #c0c4cc;
  font-size: 42px;
}

.xa-task-empty__icon--error {
  color: #f56c6c;
}

.xa-task-empty__title {
  margin-top: 14px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.xa-task-empty__desc {
  margin: 8px 0 16px;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.nowrap-cell,
.single-line-cell {
  white-space: nowrap;
}

.single-line-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}

.task-id-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-id-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-path-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.asset-path-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-popover {
  max-height: 240px;
  overflow-y: auto;
}

.path-popover__item {
  color: #606266;
  font-size: 13px;
  line-height: 22px;
  word-break: break-all;
}

.table-expand {
  padding: 12px 24px 18px;
  background: #fafcff;
}

.task-overview {
  margin-bottom: 16px;
}

.task-overview__title,
.task-step-title {
  margin-bottom: 10px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.task-overview__label {
  color: #909399;
  font-size: 13px;
  line-height: 28px;
}

.task-overview__value {
  color: #303133;
  font-size: 13px;
  line-height: 28px;
}

.task-result-line,
.task-action-line {
  margin-top: 16px;
  color: #606266;
  font-size: 13px;
  line-height: 24px;
}

.xa-task-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 48px;
  margin-top: 4px;
}

.xa-task-pagination__page {
  color: #909399;
  font-size: 13px;
}

@media (max-width: 991px) {
  .xa-network-panel {
    margin-bottom: 16px;
  }

  .xa-network-panel,
  .xa-task-panel {
    height: 520px;
  }
}
</style>
