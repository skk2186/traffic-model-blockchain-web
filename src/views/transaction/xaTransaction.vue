<template>
  <div class="app-container xa-create-page">
    <el-card class="xa-page-card">
      <template slot="header">
        <el-page-header content="创建跨域协同任务" title="跨域协同任务" @back="() => {$router.push({ path: 'xaTransactionList' })}" />
      </template>
      <div class="xa-page-intro">
        依次选择数据资产、执行协同操作，并在最后确认提交或回滚
      </div>
      <el-steps :active="stepActive" align-center finish-status="finish" class="xa-steps">
        <el-step title="步骤1 选择协同资产" description="关联需要纳入一致性控制的数据资产" />
        <el-step title="步骤2 配置协同操作" description="执行跨链数据调用并形成步骤记录" />
        <el-step title="步骤3 确认任务结果" description="检查执行结果后提交或回滚任务" />
      </el-steps>
    </el-card>

    <el-collapse-transition>
      <el-row v-if="stepActive === 0" class="xa-step-row">
        <el-card class="xa-step-card">
          <template slot="header">
            <div class="xa-section-header">
              <div>
                <span class="xa-section-title">选择协同资产</span>
                <p class="xa-section-desc">选择需要在同一 XA 事务中保持一致性的数据资产，事务开启后，这些资产将被当前任务关联</p>
              </div>
              <el-tooltip class="XAHelp" effect="light" content="如何选择协同资产？" placement="top">
                <el-button type="text" size="mini" class="xa-help-button" @click="howToStartXA">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip>
            </div>
          </template>

          <el-alert
            v-if="startErrorMessage"
            :title="startErrorMessage"
            type="error"
            show-icon
            :closable="false"
            class="xa-alert"
          />
          <div v-if="startErrorMessage" class="xa-error-actions">
            <el-button type="danger" size="mini" plain @click="startTransaction">重新开启</el-button>
          </div>
          <el-alert
            v-if="selectionErrorVisible"
            title="请至少关联一个数据资产后再开启任务。"
            type="warning"
            show-icon
            :closable="false"
            class="xa-alert"
          />

          <el-form
            ref="transactionForm"
            class="xa-id-form"
            label-width="132px"
            label-position="right"
            :model="transactionForm"
          >
            <el-form-item
              id="XAID"
              label="协同任务标识："
              :rules="[
                { required: true, message: '事务ID不能为空', trigger: 'change' },
                { pattern: /^[0-9a-fA-F]+$/, required: true, message: '请检查事务ID格式：16进制', trigger: 'change' },
                { required: true, message: '事务ID长度不能超过128', trigger: 'change', max: 128 }
              ]"
              prop="transactionID"
            >
              <div class="xa-id-row">
                <el-input
                  v-model.trim="transactionForm.transactionID"
                  placeholder="请输入协同任务标识"
                  class="xa-id-input"
                />
                <el-button type="primary" icon="el-icon-refresh" class="xa-id-button" @click="creatUUID">重新生成</el-button>
              </div>
            </el-form-item>
          </el-form>

          <resource-transfer
            id="XAPath"
            height="430px"
            source-title="可选数据资产"
            source-column-label="数据资产标识"
            target-title="已关联数据资产"
            add-button-text="关联"
            remove-button-text="移除"
            filter-placeholder="搜索数据资产"
            show-target-count
            :page-object="pageObject"
            :resource-data="resourceData"
            :to-data.sync="toResourceData"
            @current-change="setPage"
            @chain-click="onChainClick"
          />
        </el-card>
      </el-row>
    </el-collapse-transition>

    <el-collapse-transition>
      <el-row v-if="stepActive === 1" class="xa-step-row">
        <el-card class="xa-operation-card">
          <div slot="header" class="xa-two-column-header">
            <div>
              <span class="xa-section-title">执行协同操作</span>
              <el-tooltip class="XAHelp" effect="light" content="如何执行协同操作？" placement="top">
                <el-button type="text" size="mini" class="xa-help-button" @click="howToExecXA">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip>
            </div>
            <span class="xa-section-title">任务步骤记录</span>
          </div>

          <el-row :gutter="18" class="xa-operation-layout">
            <el-col id="xaForm" :xs="24" :md="11" class="xa-operation-col">
              <el-alert
                v-if="stepExecutionError"
                :title="stepExecutionError.title"
                :description="stepExecutionError.description"
                type="error"
                show-icon
                :closable="false"
                class="xa-alert"
              />
              <div v-if="stepExecutionError" class="xa-error-actions">
                <el-button type="primary" size="small" @click="retryCurrentStep">重试当前步骤</el-button>
                <el-button type="danger" plain size="small" @click="rollbackTransaction">结束并回滚</el-button>
              </div>
              <transaction-form
                ref="originTransaction"
                :transaction="transactionForm"
                context="xa"
                class="xa-operation-form"
                @clearClick="clearTransaction"
                @submitClick="execTransaction"
              >
                <el-select
                  slot="path"
                  v-model="transactionForm.path"
                  placeholder="请选择数据资产标识"
                  class="xa-path-select"
                  filterable
                  default-first-option
                  @change="onSelectionChange"
                >
                  <el-option
                    v-for="path in $store.getters.XAPaths"
                    :key="path"
                    :value="path"
                    :label="limitString(path)"
                  />
                </el-select>
              </transaction-form>
            </el-col>
            <el-col id="xaList" :xs="24" :md="13" class="xa-operation-col">
              <div class="xa-current-id">
                <span>当前任务标识：</span>
                <el-tooltip effect="light" :content="$store.getters.transactionID" placement="top-start">
                  <span class="xa-current-id__text">{{ limitString($store.getters.transactionID) }}</span>
                </el-tooltip>
                <clipboard :input-data="$store.getters.transactionID" />
              </div>
              <el-table stripe fit height="360px" :data="transactionStep" tooltip-effect="light">
                <el-table-column prop="timestamp" label="执行时间" width="160" show-overflow-tooltip>
                  <template slot-scope="props">
                    <span>{{ props.row.timestamp | formatDate }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="xaTransactionSeq" label="步骤序号" width="110" show-overflow-tooltip />
                <el-table-column prop="username" label="操作主体" width="120" show-overflow-tooltip />
                <el-table-column prop="path" label="数据资产标识" width="220" show-overflow-tooltip />
                <el-table-column prop="method" label="调用方法" width="120" show-overflow-tooltip />
              </el-table>
            </el-col>
          </el-row>
        </el-card>
      </el-row>
    </el-collapse-transition>

    <el-collapse-transition>
      <el-row v-if="stepActive === 2" class="xa-step-row">
        <el-card class="xa-confirm-card">
          <template slot="header">
            <div>
              <span class="xa-section-title">确认任务结果</span>
              <p class="xa-section-desc">请检查已执行的协同操作，并选择提交或回滚当前任务。</p>
            </div>
          </template>

          <el-alert
            v-if="finalActionError"
            :title="finalActionError.title"
            :description="finalActionError.description"
            type="error"
            show-icon
            :closable="false"
            class="xa-alert"
          />
          <div v-if="finalActionError" class="xa-error-actions">
            <el-button size="small" icon="el-icon-refresh" @click="reloadXADetail">重新查询状态</el-button>
            <el-button v-if="finalActionError.action === 'commit'" type="primary" size="small" @click="commitTransaction">再次提交</el-button>
            <el-button v-if="finalActionError.action === 'rollback'" type="danger" plain size="small" @click="rollbackTransaction">再次回滚</el-button>
            <el-button size="small" @click="() => {$router.push({ path: 'xaTransactionList' })}">返回任务列表</el-button>
          </div>

          <div class="xa-summary">
            <div><span>协同任务标识：</span><strong>{{ taskSummary.xaTransactionID || transactionForm.transactionID }}</strong></div>
            <div><span>发起身份：</span><strong>{{ taskSummary.username || 'unknown' }}</strong></div>
            <div v-if="hasValidTimestamp(taskSummary.startTimestamp)"><span>创建时间：</span><strong>{{ taskSummary.startTimestamp | formatDate }}</strong></div>
            <div><span>已执行步骤：</span><strong>{{ transactionStep.length }} 项</strong></div>
            <div><span>关联数据资产：</span><strong>{{ taskPaths.length }} 项</strong></div>
            <div><span>当前状态：</span><strong>{{ getTaskStatusLabel(taskSummary.status || 'processing') }}</strong></div>
          </div>

          <el-table stripe fit height="330px" :data="transactionStep" tooltip-effect="light">
            <el-table-column prop="timestamp" label="执行时间" width="160" show-overflow-tooltip>
              <template slot-scope="step">
                <span>{{ step.row.timestamp | formatDate }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="xaTransactionSeq" label="步骤序号" width="110" show-overflow-tooltip />
            <el-table-column prop="username" label="操作主体" width="120" show-overflow-tooltip />
            <el-table-column prop="path" label="数据资产标识" width="240" show-overflow-tooltip />
            <el-table-column prop="method" label="调用方法" width="120" show-overflow-tooltip />
          </el-table>

          <div class="xa-confirm-actions">
            <el-button icon="el-icon-back" @click="stepActive = 1">返回继续执行</el-button>
            <el-button
              v-loading.fullscreen.lock="loading"
              type="danger"
              plain
              icon="el-icon-refresh-left"
              @click="rollbackTransaction"
            >回滚任务</el-button>
            <el-button
              v-loading.fullscreen.lock="loading"
              type="primary"
              icon="el-icon-check"
              @click="commitTransaction"
            >提交任务</el-button>
          </div>
        </el-card>
      </el-row>
    </el-collapse-transition>

    <el-collapse-transition>
      <el-row v-if="stepActive === 3" class="xa-step-row">
        <el-card class="xa-completion-card">
          <div :class="['xa-completion-icon', completionStatusClass]">
            <i :class="completionIcon" />
          </div>
          <div class="xa-completion-title">{{ completionTitle }}</div>
          <div class="xa-completion-desc">{{ completionDesc }}</div>
          <div class="xa-completion-actions">
            <el-button
              v-if="completionStatus !== 'unknown'"
              type="primary"
              icon="el-icon-circle-plus-outline"
              @click="reloadTransaction"
            >创建新任务</el-button>
            <el-button icon="el-icon-search" @click="() => {$router.push({ path: 'xaTransactionList' })}">查看任务列表</el-button>
          </div>
        </el-card>
      </el-row>
    </el-collapse-transition>

    <el-card v-if="stepActive < 2" class="xa-step-actions">
      <el-button
        v-loading.fullscreen.lock="loading"
        type="primary"
        :disabled="stepActive === 2 || stepActive === 3"
        @click="stepBtnClick"
      >
        {{ stepForwardBtnText }}
        <i class="el-icon-arrow-right el-icon--right" />
      </el-button>
    </el-card>
  </div>
</template>

<script>
import TransactionForm from '@/views/transaction/components/TransactionForm'
import ResourceTransfer from '@/components/ResourceTransfer/index'
import Clipboard from '@/components/Clipboard/index'
import { getResourceList } from '@/api/resource'
import { call, getXATransaction, sendTransaction } from '@/api/transaction'
import { parseTime, limitString } from '@/utils'
import { buildXAResponseError, removeXATX } from '@/utils/transaction'
import { execXASteps, startXASteps } from '@/views/transaction/transactionSteps/xaTransactionStep'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'

export default {
  name: 'XATransaction',
  components: {
    TransactionForm,
    ResourceTransfer,
    Clipboard
  },
  filters: {
    formatDate(time) {
      time = time * 1000
      const date = new Date(time)
      return parseTime(date, null)
    }
  },
  data() {
    return {
      stepActive: 0,
      stepBackBtnText: '上一步',
      stepForwardBtnText: '开启任务',
      transactionDetail: [],
      transactionStep: [],
      resourceData: [],
      toResourceData: [],
      selectionErrorVisible: false,
      startErrorMessage: '',
      stepExecutionError: null,
      finalActionError: null,
      completionStatus: null,

      currentChain: null,
      pageObject: {
        currentPage: 1,
        totalPageNumber: 0,
        pageSize: 10
      },
      transactionForm: {
        transactionID: null,
        path: null,
        method: null,
        args: [{
          value: '',
          key: 0
        }],
        execMethod: 'sendTransaction',
        isXATransaction: true
      },
      loading: false,
      startXASteps: startXASteps,
      execXASteps: execXASteps
    }
  },
  computed: {
    taskSummary() {
      return this.transactionDetail.length > 0 ? this.transactionDetail[0] : {}
    },
    taskPaths() {
      if (Array.isArray(this.taskSummary.paths) && this.taskSummary.paths.length > 0) {
        return this.taskSummary.paths
      }
      return this.$store.getters.XAPaths || []
    },
    completionTitle() {
      const titles = {
        committed: '协同任务已提交',
        rolledback: '协同任务已回滚',
        alreadyCommitted: '该任务已在其他位置提交',
        alreadyRolledback: '该任务已在其他位置回滚',
        unknown: '任务最终状态暂未确认'
      }
      return titles[this.completionStatus] || titles.unknown
    },
    completionDesc() {
      const descs = {
        committed: '所有协同操作已完成一致性提交。',
        rolledback: '当前任务中的协同操作已完成回退。',
        alreadyCommitted: '所有协同操作已完成一致性提交。',
        alreadyRolledback: '当前任务中的协同操作已按事务机制回退。',
        unknown: '请前往任务列表重新查询。'
      }
      return descs[this.completionStatus] || descs.unknown
    },
    completionIcon() {
      return this.completionStatus === 'unknown' ? 'el-icon-warning-outline' : 'el-icon-circle-check'
    },
    completionStatusClass() {
      if (this.completionStatus === 'unknown') {
        return 'is-unknown'
      }
      if (this.completionStatus === 'rolledback' || this.completionStatus === 'alreadyRolledback') {
        return 'is-rolledback'
      }
      return 'is-committed'
    }
  },
  watch: {
    stepActive(value) {
      if (value === 1) {
        this.stepForwardBtnText = '确认任务结果'
        this.stepBackBtnText = '上一步'
        this.getXADetail()
      }
    }
  },
  created() {
    this.creatUUID()
    this.loadXATransaction(this.$route.query.isExec)
  },
  methods: {
    limitString(str) {
      return limitString(str)
    },
    stepBtnClick() {
      switch (this.stepForwardBtnText) {
        case '开启任务':
          this.startTransaction()
          break
        case '确认任务结果':
          this.endTransaction()
          break
      }
    },
    onSelectionChange() {
      const tempPath = this.transactionForm.path
      this.$refs.originTransaction.clearForm()
      this.transactionForm.path = tempPath
    },
    loadXATransaction(isExec) {
      const xaID = this.$store.getters.transactionID
      if (xaID !== null && typeof (isExec) === 'undefined') {
        const h = this.$createElement
        this.$msgbox({
          title: '提示',
          message: h('div', null, [
            h('h3', { style: 'font-weight: bold; margin-left:10px; white-space: nowrap;' }, '检测到一个尚未结束的跨域协同任务，是否继续执行？'),
            h('div', { style: 'font-weight: bold; margin-left:10px' }, '协同任务标识：'),
            h('p', { style: { margin: '5px 0', padding: '8px 10px' }}, limitString(xaID)),
            h('div', { style: 'font-weight: bold; margin-left:10px' }, '关联数据资产：' + this.$store.getters.XAPaths.length + ' 项'),
            h('div', { style: { color: '#606266', margin: '5px 0', padding: '8px 10px', maxHeight: '120px', overflowY: 'auto', lineHeight: '22px' }}, this.$store.getters.XAPaths.map(item => limitString(item)).join('，'))
          ]),
          showClose: false,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          showCancelButton: true,
          confirmButtonText: '继续任务',
          cancelButtonText: '放弃本地恢复并新建',
          customClass: 'xa-recover-messagebox'
        }).then(_ => {
          getXATransaction({
            version: 1,
            data: {
              xaTransactionID: this.$store.getters.transactionID,
              paths: this.$store.getters.XAPaths
            }
          }).then(response => {
            if (response.errorCode !== 0) {
              this.$message.error({
                message: '获取事务详情失败，错误：' + buildXAResponseError(response),
                center: true,
                duration: 5000
              })
              removeXATX()
              this.$store.commit('transaction/RESET_STATE')
            } else {
              if (response.data.xaResponse.status !== 0) {
                this.$message.warning({
                  message: '警告：获取事务详情有错误：' + buildXAResponseError(response),
                  center: true,
                  duration: 5000
                })
                removeXATX()
                this.$store.commit('transaction/RESET_STATE')
              }
              if (response.data.xaTransaction.status !== 'processing') {
                this.$msgbox('恢复事务失败，该事务已经回滚/提交！', '错误', 'error')
                console.log('get xaTransaction error, this xaTransaction is not processing')
                removeXATX()
                this.$store.commit('transaction/RESET_STATE')
              } else {
                this.transactionForm.transactionID = this.$store.getters.transactionID
                this.transactionForm.path = this.$store.getters.XAPaths
                this.stepActive = 1
              }
            }
          }).catch(error => {
            this.$message({
              message: '网络异常：' + error,
              type: 'error',
              duration: 5000
            })
          })
        }).catch(_ => {
          removeXATX()
          this.$store.commit('transaction/RESET_STATE')
        })
      } else if (xaID !== null && typeof (isExec) !== 'undefined') {
        this.transactionForm.transactionID = this.$store.getters.transactionID
        this.transactionForm.path = this.$store.getters.XAPaths
        this.stepActive = 1
      }
    },
    refresh() {
      const path = this.currentChain
      this.resourceData = []
      getResourceList({
        path: path,
        offset: (this.pageObject.currentPage - 1) * this.pageObject.pageSize,
        size: this.pageObject.pageSize
      }, null).then((response) => {
        if (response.errorCode === 0) {
          const resourceList = response.data.resourceDetails
          for (const resource of resourceList) {
            this.resourceData.push({
              path: resource.path
            })
          }
          this.pageObject.totalPageNumber = response.data.total
        } else {
          this.$message({
            type: 'error',
            message: '查询资源列表失败, errorCode: ' + response.errorCode + '，错误信息：' + response.message
          })
        }
      }).catch((error) => {
        console.log(error)
        this.$message({
          type: 'error',
          message: '网络异常'
        })
      })
    },
    setPage(value) {
      this.pageObject.currentPage = value
      this.refresh()
    },
    onChainClick(path) {
      this.currentChain = path
      this.resourceData = []
      this.pageObject.currentPage = 1
      this.refresh()
    },
    creatUUID() {
      const { v4: uuidV4 } = require('uuid')
      this.transactionForm.transactionID = uuidV4().replace(/-/g, '')
    },
    clearTransaction() {
      this.stepExecutionError = null
      this.transactionForm.method = null
      this.transactionForm.path = null
      this.transactionForm.args = [{
        value: '',
        key: 0
      }]
    },
    endTransaction() {
      this.finalActionError = null
      // turn to step3
      this.stepActive = 2
    },
    startTransaction() {
      this.startErrorMessage = ''
      this.selectionErrorVisible = false
      this.$refs['transactionForm'].validate(validate => {
        if (this.toResourceData == null || this.toResourceData.length < 1) {
          this.selectionErrorVisible = true
          return
        }
        if (validate) {
          this.loading = true
          const chosenData = []
          for (const data of this.toResourceData) {
            chosenData.push(data.path)
          }
          this.$store.dispatch('transaction/startTransaction', {
            version: '1',
            data: {
              xaTransactionID: this.transactionForm.transactionID,
              paths: chosenData
            }
          }).then(() => {
            this.loading = false
            this.stepActive = 1
          }).catch(error => {
            this.loading = false
            this.startErrorMessage = '开启任务失败，请检查网络或后端服务后重试。'
            if (error) {
              this.startErrorMessage = '开启任务失败：' + error.toString()
            }
          })
        }
      })
    },
    execTransaction(transaction) {
      this.loading = true
      this.stepExecutionError = null
      const args = []
      for (const arg of transaction.args) {
        args.push(arg.value)
      }
      if (transaction.execMethod === 'sendTransaction') {
        sendTransaction({
          version: '1',
          path: transaction.path,
          data: {
            method: transaction.method,
            args: args,
            options: {
              'XA_TRANSACTION_ID': this.$store.getters.transactionID,
              'XA_TRANSACTION_SEQ': Date.now()
            }
          }
        }).then(response => {
          this.onResponse(response)
        }).catch(error => {
          this.loading = false
          this.stepExecutionError = {
            title: '当前步骤执行失败：网络连接异常。',
            description: '请检查服务后重试，当前协同任务仍处于执行中。'
          }
          console.error('execute XA step failed: ', error)
        })
      } else {
        call({
          version: '1',
          path: transaction.path,
          data: {
            method: transaction.method,
            args: args,
            options: {
              'XA_TRANSACTION_ID': this.$store.getters.transactionID
            }
          }
        }).then(response => {
          this.onResponse(response)
        }).catch(error => {
          this.loading = false
          this.stepExecutionError = {
            title: '当前步骤执行失败：网络连接异常。',
            description: '请检查服务后重试，当前协同任务仍处于执行中。'
          }
          console.error('execute XA step failed: ', error)
        })
      }
    },
    onResponse(response) {
      this.loading = false
      this.$refs.originTransaction.onResponse(response)
      if (!this.isExecutionResponseSuccess(response)) {
        this.stepExecutionError = {
          title: '当前步骤执行失败：后端返回执行错误。',
          description: this.getExecutionErrorMessage(response)
        }
        this.getXADetail()
        return
      }
      this.stepExecutionError = null
      this.getXADetail()
    },
    commitTransaction() {
      if (this.$store.getters.transactionID !== null && this.$store.getters.paths !== []) {
        this.$confirm('提交后，所有已执行操作将一致生效，任务无法继续添加步骤。', '确认提交当前跨域协同任务吗？', {
          confirmButtonText: '提交任务',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'xa-confirm-messagebox'
        }).then(() => {
          this.finalActionError = null
          this.loading = true
          this.$store.dispatch('transaction/commitTransaction', {
            version: '1',
            data: {
              xaTransactionID: this.$store.getters.transactionID,
              paths: this.$store.getters.XAPaths
            }
          }).then(() => {
            this.loading = false
            this.completionStatus = 'committed'
            this.stepActive = 3
          }).catch(err => {
            this.loading = false
            const alreadyStatus = this.resolveAlreadyCompletionStatus(err)
            if (alreadyStatus) {
              this.completionStatus = alreadyStatus
              this.stepActive = 3
              return
            }
            this.finalActionError = {
              action: 'commit',
              title: '任务提交失败',
              description: '当前任务状态尚未确认，请重新查询任务状态后再操作。'
            }
          })
        }).catch(_ => {
        })
      }
    },
    rollbackTransaction() {
      if (this.$store.getters.transactionID !== null && this.$store.getters.paths !== []) {
        this.$confirm('回滚后，当前任务中的已执行操作将按 XA 事务机制回退。', '确认回滚当前跨域协同任务吗？', {
          confirmButtonText: '回滚任务',
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'xa-confirm-messagebox'
        }).then(() => {
          this.finalActionError = null
          this.loading = true
          this.$store.dispatch('transaction/rollbackTransaction', {
            version: '1',
            data: {
              xaTransactionID: this.$store.getters.transactionID,
              paths: this.$store.getters.XAPaths
            }
          }).then(() => {
            this.loading = false
            this.completionStatus = 'rolledback'
            this.stepActive = 3
          }).catch(err => {
            this.loading = false
            const alreadyStatus = this.resolveAlreadyCompletionStatus(err)
            if (alreadyStatus) {
              this.completionStatus = alreadyStatus
              this.stepActive = 3
              return
            }
            this.finalActionError = {
              action: 'rollback',
              title: '任务回滚失败',
              description: '当前任务可能仍处于执行中，请重新查询状态。'
            }
          })
        }).catch(_ => {
        })
      }
    },
    getXADetail() {
      return getXATransaction({
        version: 1,
        data: {
          xaTransactionID: this.$store.getters.transactionID,
          paths: this.$store.getters.XAPaths
        }
      }).then(response => {
        if (response.errorCode !== 0) {
          this.$message.error({
            message: '获取事务详情失败，错误：' + buildXAResponseError(response),
            center: true,
            duration: 5000
          })
        } else {
          if (response.data.xaResponse.status !== 0) {
            this.$message.warning({
              message: '警告：获取事务详情有错误：' + buildXAResponseError(response),
              center: true,
              duration: 5000
            })
            return
          }
          const detail = []
          detail.push(response.data.xaTransaction)
          this.transactionDetail = detail
          this.transactionStep = response.data.xaTransaction.xaTransactionSteps
          return response.data.xaTransaction
        }
      }).catch(error => {
        this.$message({
          message: '网络异常：' + error,
          type: 'error',
          duration: 5000
        })
      })
    },
    reloadXADetail() {
      this.getXADetail().then(detail => {
        if (!detail) {
          this.completionStatus = 'unknown'
          this.stepActive = 3
          return
        }
        if (detail.status === 'committed') {
          this.completionStatus = 'alreadyCommitted'
          this.stepActive = 3
        } else if (detail.status === 'rolledback') {
          this.completionStatus = 'alreadyRolledback'
          this.stepActive = 3
        } else {
          this.finalActionError = null
        }
      }).catch(_ => {
        this.completionStatus = 'unknown'
        this.stepActive = 3
      })
    },
    retryCurrentStep() {
      if (this.$refs.originTransaction) {
        this.$refs.originTransaction.onSubmit()
      }
    },
    isExecutionResponseSuccess(response) {
      return response && response.errorCode === 0 && response.data && response.data.errorCode === 0
    },
    getExecutionErrorMessage(response) {
      if (!response) {
        return '后端响应为空，当前协同任务仍处于执行中。'
      }
      if (response.errorCode !== 0) {
        return response.message || '系统层返回错误，当前协同任务仍处于执行中。'
      }
      if (!response.data) {
        return '响应数据为空，当前协同任务仍处于执行中。'
      }
      return response.data.message || response.data.errorMessage || '调用未成功，当前协同任务仍处于执行中。'
    },
    resolveAlreadyCompletionStatus(error) {
      const message = error ? error.toString() : ''
      if (/committed/.test(message)) {
        return 'alreadyCommitted'
      }
      if (/rolledback/.test(message)) {
        return 'alreadyRolledback'
      }
      return null
    },
    hasValidTimestamp(time) {
      const timestamp = Number(time)
      return Number.isFinite(timestamp) && timestamp > 0
    },
    getTaskStatusLabel(status) {
      const labels = {
        processing: '执行中',
        committed: '已提交',
        rolledback: '已回滚',
        failed: '执行异常',
        error: '执行异常'
      }
      return labels[status] || '状态未知'
    },
    reloadTransaction() {
      this.stepActive = 0
      Object.assign(this.$data, this.$options.data())
      this.creatUUID()
    },
    howToStartXA() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: this.startXASteps
      }).start()
    },
    howToExecXA() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: this.execXASteps
      }).start()
    }
  }
}
</script>

<style lang="scss">
.el-page-header__content{
  font-size: 16px;
}
.table-expand {
  font-size: 0;
}

.table-expand label {
  width: 100px;
  color: #99a9bf;
}

.table-expand .el-form-item {
  margin-right: 0;
  margin-bottom: 0;
  width: 100%;
}

.xa-confirm-messagebox {
  width: 620px;
  max-width: calc(100vw - 48px);
}

.xa-confirm-messagebox .el-message-box__content,
.xa-confirm-messagebox .el-message-box__message {
  overflow: visible;
}

.xa-confirm-messagebox .el-message-box__message p {
  white-space: normal;
  word-break: keep-all;
}

.xa-recover-messagebox {
  width: 580px;
}

.xa-recover-messagebox .el-message-box__message {
  overflow: visible;
}
</style>
<style lang="scss" scoped>
.xa-page-intro {
  margin-bottom: 18px;
  color: #606266;
  font-size: 13px;
  line-height: 22px;
}

.xa-steps {
  margin-top: 4px;
}

.xa-step-row {
  margin-top: 14px;
}

.xa-section-header,
.xa-two-column-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.xa-section-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.xa-section-desc {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.xa-help-button {
  padding: 0;
  margin-left: 10px;
}

.xa-alert {
  margin-bottom: 14px;
}

.xa-id-form {
  max-width: 760px;
  margin: 0 auto 12px;
}

.xa-id-form::v-deep .el-form-item__label {
  white-space: nowrap;
}

.xa-id-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.xa-id-input,
.xa-id-button {
  height: 36px;
}

.xa-id-input {
  flex: 1;
  min-width: 0;
}

.xa-id-input::v-deep .el-input__inner {
  height: 36px;
  line-height: 36px;
}

.xa-id-button {
  flex: 0 0 112px;
}

.xa-operation-card::v-deep .el-card__body,
.xa-confirm-card::v-deep .el-card__body {
  padding-bottom: 16px;
}

.xa-operation-layout {
  min-height: 430px;
}

.xa-operation-col {
  min-height: 430px;
}

.xa-operation-form {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.xa-path-select {
  width: 100%;
}

.xa-current-id {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
  line-height: 24px;
}

.xa-current-id__text {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.xa-error-actions {
  display: flex;
  gap: 10px;
  margin: -4px 0 14px 28px;
}

.xa-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 18px;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: #f8fafc;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.xa-summary div {
  min-width: 0;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.xa-summary strong {
  color: #303133;
  font-weight: 500;
}

.xa-confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.xa-completion-card {
  text-align: center;
}

.xa-completion-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 38px;
}

.xa-completion-icon.is-committed {
  color: #67c23a;
  background: #f0f9eb;
}

.xa-completion-icon.is-rolledback {
  color: #f56c6c;
  background: #fef0f0;
}

.xa-completion-icon.is-unknown {
  color: #e6a23c;
  background: #fdf6ec;
}

.xa-completion-title {
  margin-top: 18px;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.xa-completion-desc {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
  line-height: 24px;
}

.xa-completion-actions,
.xa-step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.xa-step-actions {
  margin-top: 14px;
}

@media (max-width: 991px) {
  .xa-summary {
    grid-template-columns: 1fr;
  }

  .xa-operation-col + .xa-operation-col {
    margin-top: 16px;
  }
}
</style>
