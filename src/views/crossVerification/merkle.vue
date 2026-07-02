<template>
  <div class="app-container cross-verification-page merkle-verification-page">
    <el-card class="page-shell cross-verification-card">
      <header class="page-header cross-verification-header">
        <div>
          <h2>数据完整性验证</h2>
          <p>基于 Merkle 结构验证交通数据批次、文件或记录集合的一致性。</p>
        </div>
        <el-tag :type="healthMeta.type" effect="plain">{{ healthMeta.text }}</el-tag>
      </header>

      <el-row :gutter="18">
        <el-col :xs="24" :lg="10">
          <section class="form-panel">
            <div class="section-title">
              <h3>验证参数</h3>
            </div>
            <el-form
              ref="form"
              :model="form"
              :rules="rules"
              label-width="140px"
              class="merkle-form cross-verification-form"
            >
              <el-form-item label="业务标识" prop="businessId">
                <el-input
                  v-model.trim="form.businessId"
                  placeholder="请输入业务标识，例如 traffic-batch-001"
                >
                  <el-button slot="append" @click="generateBusinessId">生成</el-button>
                </el-input>
              </el-form-item>

              <el-form-item label="输入方式">
                <el-radio-group v-model="form.inputMode" size="small" @change="clearInputError">
                  <el-radio-button label="manual">手动输入</el-radio-button>
                  <el-radio-button label="file">文件上传</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <template v-if="form.inputMode === 'file'">
                <el-form-item label="交通数据文件">
                  <el-upload
                    ref="fileUpload"
                    action="#"
                    :auto-upload="false"
                    :limit="1"
                    :file-list="fileList"
                    :on-change="handleFileChange"
                    :on-remove="handleFileRemove"
                    :on-exceed="handleFileExceed"
                    accept=".txt,.csv,.json,.xml,.log,.md,.pdf,.zip,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bin"
                  >
                    <el-button icon="el-icon-folder-opened">选择文件</el-button>
                  </el-upload>
                </el-form-item>

                <dl v-if="fileMeta" class="file-meta">
                  <div>
                    <dt>文件名</dt>
                    <dd>{{ fileMeta.fileName }}</dd>
                  </div>
                  <div>
                    <dt>文件大小</dt>
                    <dd>{{ fileMeta.sizeText }}</dd>
                  </div>
                  <div>
                    <dt>叶子数量</dt>
                    <dd>{{ fileMeta.leafCount }}</dd>
                  </div>
                  <div>
                    <dt>解析方式</dt>
                    <dd>{{ fileMeta.parseMode }}</dd>
                  </div>
                </dl>
              </template>

              <el-form-item v-else label="数据记录">
                <el-input
                  v-model="form.manualText"
                  type="textarea"
                  :rows="7"
                  placeholder="每一行作为一个 Merkle 叶子"
                  @input="clearInputError"
                />
                <div class="input-hint">每一行作为一个 Merkle 叶子。</div>
              </el-form-item>

              <el-form-item label="抽样索引" prop="sampleIndex">
                <el-input
                  v-model.trim="form.sampleIndex"
                  placeholder="可选，必须小于叶子数量"
                />
                <div class="input-hint">
                  抽样索引用于指定需要重点核验的叶子位置，从 0 开始；留空时按整批数据生成 Merkle Root。当前叶子数量：{{ leafItems.length }}
                </div>
              </el-form-item>

              <el-form-item label="期望 Merkle Root" prop="expectedRoot">
                <el-input
                  v-model.trim="form.expectedRoot"
                  placeholder="可选，64 位十六进制字符串"
                />
                <div class="input-hint">
                  期望 Merkle Root 是你已知的基准根哈希；填写后会与本次计算结果比对，用来判断数据是否保持一致。
                </div>
              </el-form-item>

              <el-form-item label="可信账本同步">
                <el-alert
                  title="验证结果默认同步至 bcos3 可信账本，并通过 fabric 发起跨链验证。"
                  type="info"
                  :closable="false"
                  show-icon
                />
              </el-form-item>

              <el-alert
                v-if="inputError"
                class="form-alert"
                :title="inputError"
                type="warning"
                :closable="false"
                show-icon
              />

              <div class="form-actions">
                <el-button
                  type="primary"
                  icon="el-icon-video-play"
                  :loading="submitting"
                  @click="submit"
                >执行验证</el-button>
                <el-button icon="el-icon-refresh-left" @click="resetForm">重置表单</el-button>
                <el-button icon="el-icon-tickets" @click="goRecords">查看验证记录</el-button>
              </div>
            </el-form>
          </section>
        </el-col>

        <el-col :xs="24" :lg="14">
          <section v-loading="submitting" class="result-panel cross-verification-result">
            <div class="section-title">
              <h3>验证结果</h3>
              <el-tag v-if="result" :type="resultStatusType">{{ resultStatusText }}</el-tag>
            </div>
            <div v-if="!result" class="result-empty">
              <el-empty description="请填写验证参数并执行数据完整性验证。" :image-size="88" />
              <el-alert
                v-if="submitError"
                class="result-error"
                :title="submitError"
                type="error"
                :closable="false"
                show-icon
              />
            </div>
            <template v-if="result">
              <dl class="result-meta">
                <div v-for="item in resultMetaRows" :key="item.label" :class="{ wide: item.wide }">
                  <dt>{{ item.label }}</dt>
                  <dd>
                    <code v-if="item.code">{{ item.value || '-' }}</code>
                    <span v-else>{{ item.value || '-' }}</span>
                  </dd>
                </div>
              </dl>

              <div class="values">
                <div v-for="item in resultValueRows" :key="item.label" class="value-row">
                  <span>{{ item.label }}</span>
                  <el-tooltip :content="item.value || '-'" placement="top" effect="light">
                    <code>{{ item.value || '-' }}</code>
                  </el-tooltip>
                  <el-button
                    type="text"
                    icon="el-icon-document-copy"
                    title="复制"
                    :disabled="!item.value"
                    @click="copyValue(item.value)"
                  />
                </div>
              </div>

              <section class="chain-flow">
                <div class="section-title chain-flow-title">
                  <h3>可信账本同步</h3>
                  <el-button
                    type="text"
                    icon="el-icon-view"
                    @click="openJsonDialog(result)"
                  >查看完整结果</el-button>
                </div>
                <div class="chain-steps">
                  <div
                    v-for="step in chainStepItems"
                    :key="step.title"
                    class="chain-step"
                    :class="'is-' + step.state"
                  >
                    <i :class="step.icon" />
                    <div>
                      <strong>{{ step.title }}</strong>
                      <span>{{ step.description }}</span>
                      <code v-if="step.hash">{{ step.hash }}</code>
                    </div>
                  </div>
                </div>
              </section>

              <el-collapse class="detail-collapse">
                <el-collapse-item title="查看证明路径与完整详情">
                  <pre>{{ prettyResult }}</pre>
                </el-collapse-item>
              </el-collapse>
            </template>
          </section>
        </el-col>
      </el-row>
    </el-card>

    <JsonResultDialog
      :visible.sync="jsonDialogVisible"
      title="完整验证结果"
      :data="jsonDialogData"
    />
  </div>
</template>

<script>
import { getCrossVerificationHealth, verifyMerkle } from '@/api/crossVerification'
import {
  BCOS3_VERIFY_PATH,
  FABRIC_VERIFY_PATH,
  VERIFY_TYPES,
  buildRecordKey,
  getVerifyRecord,
  interchainQueryRecord,
  waitLastCallbackResult,
  writeVerifyRecord
} from '@/api/trafficVerifyChain'
import JsonResultDialog from './components/JsonResultDialog'
import { formatBytes, isTextFile, readFileAsChunks, splitTextToBlocks } from './utils/fileChunkUtils'
import { buildLocalRecord, copyText, isHex64, saveRecentRecord } from './utils/verificationUtils'

const DEFAULT_MANUAL_TEXT = 'camera=A001,speed=42,lane=2\ncamera=A001,speed=38,lane=2\ncamera=A002,speed=51,lane=1'
const TARGET_CHAIN = 'bcos3'
const VERIFY_FROM_CHAIN = 'fabric'

export default {
  name: 'MerkleVerification',
  components: {
    JsonResultDialog
  },
  data() {
    const validateExpectedRoot = (rule, value, callback) => {
      if (!value || isHex64(value)) {
        callback()
        return
      }
      callback(new Error('请输入 64 位十六进制字符串'))
    }
    const validateSampleIndex = (rule, value, callback) => {
      if (value === '' || value == null) {
        callback()
        return
      }
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 0) {
        callback(new Error('抽样索引必须是不小于 0 的整数'))
        return
      }
      if (this.leafItems.length && parsed >= this.leafItems.length) {
        callback(new Error('抽样索引必须小于叶子数量'))
        return
      }
      callback()
    }

    return {
      healthStatus: 'unchecked',
      submitting: false,
      form: this.createForm(),
      rules: {
        businessId: [{ required: true, message: '请输入业务标识', trigger: 'blur' }],
        expectedRoot: [{ validator: validateExpectedRoot, trigger: 'blur' }],
        sampleIndex: [{ validator: validateSampleIndex, trigger: 'blur' }]
      },
      fileList: [],
      fileLeafItems: [],
      fileMeta: null,
      inputError: '',
      submitError: '',
      result: null,
      jsonDialogVisible: false,
      jsonDialogData: null
    }
  },
  computed: {
    healthMeta() {
      const statusMap = {
        available: { text: '服务可用', type: 'success' },
        error: { text: '服务异常', type: 'danger' },
        unchecked: { text: '未检查', type: 'info' }
      }
      return statusMap[this.healthStatus] || statusMap.unchecked
    },
    leafItems() {
      if (this.form.inputMode === 'file') {
        return this.fileLeafItems
      }
      return splitTextToBlocks(this.form.manualText)
    },
    resultStatusType() {
      const status = this.result && this.result.status
      if (status === 'PASS') return 'success'
      if (status === 'FAIL' || status === 'ERROR') return 'danger'
      return 'info'
    },
    resultStatusText() {
      const status = this.result && this.result.status
      if (status === 'PASS') return '验证通过'
      if (status === 'FAIL') return '验证未通过'
      if (status === 'ERROR') return '验证异常'
      return '状态未知'
    },
    resultMetaRows() {
      if (!this.result) return []
      const ledger = this.result.ledger || {}
      return [
        { label: '验证方式', value: this.result.verifyName || '数据完整性验证' },
        { label: '算法', value: this.result.algorithm || 'Merkle-SHA256' },
        { label: '业务标识', value: this.result.businessId, code: true },
        { label: '生成时间', value: this.formatTime(this.result.timestamp) },
        { label: '记录 ID', value: this.result.recordId, code: true, wide: true },
        { label: '可信账本资源', value: ledger.resourcePath || BCOS3_VERIFY_PATH, code: true, wide: true }
      ]
    },
    resultValueRows() {
      if (!this.result) return []
      const detail = this.result.detail || {}
      const ledger = this.result.ledger || {}
      const chainVerification = this.result.chainVerification || {}
      return [
        { label: 'Merkle Root', value: this.getMerkleRoot(this.result) },
        { label: '输入摘要', value: this.result.inputHash },
        { label: '证明哈希', value: this.result.proofHash },
        { label: '结果哈希', value: this.result.resultHash },
        { label: '抽样叶子', value: detail.leafHash },
        { label: 'bcos3 交易', value: ledger.txHash },
        { label: 'fabric 验证', value: chainVerification.txHash }
      ].filter(item => item.value)
    },
    chainStepItems() {
      const result = this.result || {}
      const ledger = result.ledger || {}
      const chainVerification = result.chainVerification || {}
      const root = this.getMerkleRoot(result)
      return [
        {
          title: '生成 Merkle Root',
          description: root ? `已按 ${this.getLeafCount(result)} 个叶子生成数据摘要` : '等待生成数据摘要',
          hash: root,
          state: result.status === 'ERROR' ? 'error' : root ? 'success' : 'pending',
          icon: result.status === 'ERROR' ? 'el-icon-warning-outline' : 'el-icon-finished'
        },
        {
          title: '同步至 bcos3',
          description: ledger.message || '验证通过后自动提交至 bcos3 可信账本',
          hash: ledger.txHash,
          state: this.stepState(ledger.status),
          icon: ledger.status === 'FAILED' ? 'el-icon-warning-outline' : 'el-icon-connection'
        },
        {
          title: 'fabric 验证',
          description: chainVerification.message || '通过 fabric 发起跨链查询并等待回调结果',
          hash: chainVerification.txHash,
          state: this.stepState(chainVerification.status),
          icon: chainVerification.status === 'FAILED' ? 'el-icon-warning-outline' : 'el-icon-search'
        }
      ]
    },
    prettyResult() {
      return this.result ? JSON.stringify(this.result, null, 2) : ''
    }
  },
  created() {
    this.checkHealth()
  },
  methods: {
    createForm() {
      return {
        businessId: '',
        inputMode: 'manual',
        manualText: DEFAULT_MANUAL_TEXT,
        sampleIndex: '',
        expectedRoot: ''
      }
    },
    generateBusinessId() {
      this.form.businessId = `traffic-batch-${Date.now()}`
      this.$nextTick(() => {
        this.$refs.form.validateField('businessId')
      })
    },
    async checkHealth() {
      this.healthStatus = 'unchecked'
      try {
        await getCrossVerificationHealth()
        this.healthStatus = 'available'
      } catch (error) {
        this.healthStatus = 'error'
      }
    },
    stepState(status) {
      if (status === 'SUCCESS' || status === 'LEDGER_SUCCESS' || status === 'PASS') return 'success'
      if (status === 'FAILED' || status === 'LEDGER_FAILED' || status === 'ERROR') return 'error'
      if (status === 'PENDING') return 'pending'
      return 'idle'
    },
    clearInputError() {
      this.inputError = ''
    },
    async handleFileChange(file, fileList) {
      if (!file.raw) return
      this.inputError = ''
      this.fileList = fileList.slice(-1)
      try {
        const parsed = await readFileAsChunks(file.raw)
        this.fileLeafItems = parsed.blocks
        this.fileMeta = {
          fileName: parsed.fileName,
          sizeText: formatBytes(parsed.size),
          leafCount: parsed.blocks.length,
          parseMode: isTextFile(parsed.fileName) ? '文本非空行' : '64 KiB 分块并 Base64 编码'
        }
        this.$nextTick(() => {
          this.$refs.form.validateField('sampleIndex')
        })
      } catch (error) {
        this.fileList = []
        this.fileLeafItems = []
        this.fileMeta = null
        this.inputError = error.message || '文件解析失败'
      }
    },
    handleFileRemove() {
      this.fileList = []
      this.fileLeafItems = []
      this.fileMeta = null
      this.inputError = ''
    },
    handleFileExceed() {
      this.$message.warning('一次只能选择一个文件，请先移除当前文件')
    },
    parseSampleIndex() {
      if (this.form.sampleIndex === '' || this.form.sampleIndex == null) {
        return undefined
      }
      return Number(this.form.sampleIndex)
    },
    validateLeafItems() {
      if (!this.leafItems.length) {
        this.inputError = this.form.inputMode === 'file'
          ? '请先选择可解析的数据文件'
          : '请输入至少一行数据记录'
        return false
      }
      this.inputError = ''
      return true
    },
    submit() {
      this.$refs.form.validate(async valid => {
        if (!valid || !this.validateLeafItems()) return

        const payload = {
          businessId: this.form.businessId,
          leafItems: this.leafItems,
          expectedRoot: this.form.expectedRoot || undefined,
          sampleIndex: this.parseSampleIndex(),
          writeLedger: false
        }

        this.submitting = true
        this.submitError = ''
        try {
          const response = await verifyMerkle(payload)
          let nextResult = this.normalizeResult(response, payload)
          this.result = nextResult
          if (nextResult.status === 'PASS') {
            nextResult = await this.syncMerkleLedger(nextResult)
          }
          this.result = nextResult
          saveRecentRecord(buildLocalRecord(this.result))
          this.showSubmitMessage(this.result)
        } catch (error) {
          this.result = this.buildErrorResult(error, payload)
          this.submitError = '数据完整性验证请求失败，请检查验证服务状态。'
          this.$message.error(this.submitError)
        } finally {
          this.submitting = false
        }
      })
    },
    normalizeResult(response, payload) {
      const detail = Object.assign({}, response.detail || {})
      return Object.assign({}, response, {
        verifyType: response.verifyType || VERIFY_TYPES.MERKLE,
        verifyName: response.verifyName || '数据完整性验证',
        businessId: response.businessId || payload.businessId,
        algorithm: response.algorithm || 'Merkle-SHA256',
        status: response.status || (response.passed === false ? 'FAIL' : 'PASS'),
        detail: Object.assign(detail, {
          merkleRoot: response.merkleRoot || detail.merkleRoot || detail.rootHash || response.resultHash || detail.resultHash,
          rootHash: detail.rootHash || response.merkleRoot || response.resultHash || detail.merkleRoot,
          leafCount: response.leafCount || detail.leafCount || detail.totalLeaves || payload.leafItems.length,
          totalLeaves: detail.totalLeaves || response.leafCount || detail.leafCount || payload.leafItems.length,
          sampleIndex: response.sampleIndex != null
            ? response.sampleIndex
            : detail.sampleIndex != null ? detail.sampleIndex : payload.sampleIndex
        }),
        ledger: this.normalizeLedger(response.ledger),
        ledgerStatus: this.resolveLedgerStatus(response)
      })
    },
    normalizeLedger(ledger) {
      return Object.assign({
        enabled: true,
        status: 'PENDING',
        chainPath: 'payment.bcos3',
        resourcePath: BCOS3_VERIFY_PATH,
        txHash: '',
        message: '等待同步至 bcos3 可信账本'
      }, ledger || {})
    },
    resolveLedgerStatus(response) {
      const ledger = response.ledger || {}
      if (response.ledgerStatus) return response.ledgerStatus
      if (ledger.status) return ledger.status
      return 'PENDING'
    },
    async syncMerkleLedger(result) {
      const record = this.buildMerkleLedgerRecord(result)
      let current = this.withLedgerState(result, {
        status: 'PENDING',
        message: '正在提交至 bcos3 可信账本',
        resourcePath: BCOS3_VERIFY_PATH
      }, {
        status: 'PENDING',
        message: '等待 bcos3 同步完成后发起 fabric 验证',
        resourcePath: FABRIC_VERIFY_PATH
      })
      this.result = current

      try {
        const txResult = await writeVerifyRecord(TARGET_CHAIN, record.businessId, VERIFY_TYPES.MERKLE, record)
        this.assertTxSuccess(txResult, 'bcos3 可信账本同步')
        current = this.withLedgerState(current, {
          status: 'SUCCESS',
          txHash: txResult.txhash,
          message: '已同步至 bcos3 可信账本',
          resourcePath: BCOS3_VERIFY_PATH
        }, {
          status: 'PENDING',
          message: '正在通过 fabric 发起验证',
          resourcePath: FABRIC_VERIFY_PATH
        })
        this.result = current

        await this.waitVerifyRecordAvailable(TARGET_CHAIN, record.businessId, VERIFY_TYPES.MERKLE)
        const crossTxResult = await interchainQueryRecord(
          VERIFY_FROM_CHAIN,
          TARGET_CHAIN,
          record.businessId,
          VERIFY_TYPES.MERKLE
        )
        this.assertTxSuccess(crossTxResult, 'fabric 验证')
        const callbackResult = await waitLastCallbackResult(VERIFY_FROM_CHAIN, {
          recordKey: buildRecordKey(record.businessId, VERIFY_TYPES.MERKLE)
        })
        if (!callbackResult.exists) {
          throw new Error('fabric 未查询到 bcos3 验证记录')
        }

        return this.withLedgerState(current, {
          status: 'SUCCESS',
          txHash: txResult.txhash,
          message: '已同步至 bcos3 可信账本',
          resourcePath: BCOS3_VERIFY_PATH
        }, {
          status: 'SUCCESS',
          txHash: crossTxResult.txhash,
          message: '已通过 fabric 完成验证',
          resourcePath: FABRIC_VERIFY_PATH,
          recordKey: callbackResult.recordKey,
          record: callbackResult.record
        })
      } catch (error) {
        const message = this.getErrorMessage(error, '可信账本同步或 fabric 验证失败')
        const ledger = current.ledger || {}
        const ledgerPatch = ledger.status === 'SUCCESS'
          ? { message: ledger.message }
          : { status: 'FAILED', message, resourcePath: BCOS3_VERIFY_PATH }
        return this.withLedgerState(current, ledgerPatch, {
          status: 'FAILED',
          message,
          resourcePath: FABRIC_VERIFY_PATH
        })
      }
    },
    buildMerkleLedgerRecord(result) {
      const detail = result.detail || {}
      return {
        businessId: result.businessId,
        verifyType: VERIFY_TYPES.MERKLE,
        recordId: result.recordId,
        chain: TARGET_CHAIN,
        algorithm: result.algorithm,
        createdAt: result.timestamp ? new Date(result.timestamp).toISOString() : new Date().toISOString(),
        status: result.status,
        merkleRoot: this.getMerkleRoot(result),
        rootHash: detail.rootHash || this.getMerkleRoot(result),
        leafCount: this.getLeafCount(result),
        sampleIndex: detail.sampleIndex,
        leafHash: detail.leafHash,
        dataHash: result.inputHash,
        inputHash: result.inputHash,
        proofHash: result.proofHash,
        resultHash: result.resultHash,
        detailHash: result.proofHash || result.resultHash
      }
    },
    withLedgerState(result, ledgerPatch, chainPatch) {
      return Object.assign({}, result, {
        ledger: Object.assign({}, result.ledger || {}, ledgerPatch || {}),
        ledgerStatus: (ledgerPatch && ledgerPatch.status) || result.ledgerStatus,
        chainVerification: Object.assign({}, result.chainVerification || {}, chainPatch || {})
      })
    },
    async waitVerifyRecordAvailable(chain, businessId, verifyType) {
      const maxRetry = 10
      const interval = 1000
      for (let retry = 0; retry < maxRetry; retry++) {
        const result = await getVerifyRecord(chain, businessId, verifyType)
        if (result.exists) return result
        if (retry < maxRetry - 1) {
          await this.delay(interval)
        }
      }
      throw new Error('bcos3 交易已提交，但验证记录暂未可查询，请稍后再试')
    },
    delay(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    },
    assertTxSuccess(result, title) {
      if (result && result.success) return
      const error = new Error(title + '失败')
      error.result = result
      throw error
    },
    getMerkleRoot(result) {
      const detail = result && result.detail ? result.detail : {}
      return result.merkleRoot || detail.merkleRoot || detail.rootHash || result.resultHash || ''
    },
    getLeafCount(result) {
      const detail = result && result.detail ? result.detail : {}
      return result.leafCount || detail.leafCount || detail.totalLeaves || ''
    },
    showSubmitMessage(result) {
      const status = result && result.status
      const ledger = result && result.ledger ? result.ledger : {}
      const chainVerification = result && result.chainVerification ? result.chainVerification : {}
      if (status === 'ERROR') {
        this.$message.error(result.message || '数据完整性验证异常')
        return
      }
      if (status === 'FAIL') {
        this.$message.warning(result.message || '数据完整性验证未通过')
        return
      }
      if (ledger.status === 'SUCCESS' && chainVerification.status === 'SUCCESS') {
        this.$message.success('数据完整性验证完成，可信账本同步成功')
        return
      }
      if (ledger.status === 'FAILED' || chainVerification.status === 'FAILED') {
        this.$message.warning((chainVerification.message || ledger.message) || '数据完整性验证通过，但可信账本同步未完成')
        return
      }
      this.$message.success('数据完整性验证完成')
    },
    buildErrorResult(error, payload) {
      return {
        recordId: `local-error-${Date.now()}`,
        verifyType: VERIFY_TYPES.MERKLE,
        verifyName: '数据完整性验证',
        businessId: payload.businessId,
        algorithm: 'Merkle-SHA256',
        status: 'ERROR',
        message: '数据完整性验证请求失败，请检查验证服务状态。',
        resultHash: '',
        ledgerStatus: 'FAILED',
        ledger: {
          enabled: true,
          status: 'FAILED',
          resourcePath: BCOS3_VERIFY_PATH,
          message: error && error.message
        },
        detail: {
          leafCount: payload.leafItems.length,
          sampleIndex: payload.sampleIndex,
          error: error && error.message
        },
        timestamp: new Date().toISOString()
      }
    },
    getErrorMessage(error, fallback) {
      const data = error && error.response && error.response.data
      const message = data && (data.message || data.error || data.msg)
      if (typeof message === 'string' && message.trim()) return message
      if (error && typeof error.message === 'string' && error.message.trim()) return error.message
      return fallback
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
    },
    copyValue(value) {
      copyText(value)
        .then(() => this.$message.success('已复制'))
        .catch(() => this.$message.warning('请手动选择文本复制'))
    },
    resetForm() {
      this.form = this.createForm()
      this.fileList = []
      this.fileLeafItems = []
      this.fileMeta = null
      this.inputError = ''
      this.submitError = ''
      this.result = null
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
    },
    goRecords() {
      this.$router.push({ path: '/cross-verification/records' })
    },
    openJsonDialog(data) {
      this.jsonDialogData = data
      this.jsonDialogVisible = true
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
.page-header,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header {
  gap: 16px;
  margin-bottom: 18px;
}
.page-header h2,
.section-title h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}
.section-title {
  margin-bottom: 18px;
}
.section-title h3 {
  font-size: 15px;
}
.page-header p {
  margin: 8px 0 28px;
  color: #909399;
  font-size: 14px;
  line-height: 22px;
}
.form-panel,
.result-panel {
  padding: 4px 2px;
}
.merkle-form::v-deep .el-form-item__label {
  color: #606266;
}
.input-hint {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}
.file-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 0 18px 140px;
  border-top: 1px solid #ebeef5;
  border-left: 1px solid #ebeef5;
}
.file-meta div {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  min-width: 0;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.file-meta dt,
.file-meta dd {
  min-width: 0;
  margin: 0;
  padding: 8px 10px;
  line-height: 20px;
}
.file-meta dt {
  color: #909399;
  background: #f5f7fa;
}
.file-meta dd {
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.form-alert {
  margin: 0 0 16px 140px;
}
.form-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  margin-left: 140px;
  white-space: nowrap;
}
.result-panel {
  min-height: 360px;
  padding-left: 18px;
  border-left: 1px solid #ebeef5;
}
.result-empty {
  padding-top: 32px;
}
.result-error {
  margin-top: 14px;
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
  grid-template-columns: 96px minmax(0, 1fr);
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
  overflow-wrap: anywhere;
}
.result-meta dt {
  color: #909399;
  font-size: 13px;
  background: #f5f7fa;
}
.result-meta dd {
  color: #303133;
  font-size: 13px;
}
.values {
  margin: 16px 0;
  border-top: 1px solid #ebeef5;
}
.value-row {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr) 34px;
  align-items: center;
  min-height: 46px;
  border-bottom: 1px solid #ebeef5;
}
.value-row span {
  color: #606266;
  font-size: 13px;
}
code {
  color: #1f5d8f;
  font: 12px Consolas, monospace;
  overflow-wrap: anywhere;
}
.chain-flow {
  margin-top: 4px;
}
.chain-flow-title {
  margin-bottom: 12px;
}
.chain-flow-title::v-deep .el-button {
  padding: 0;
}
.chain-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.chain-step {
  display: flex;
  min-width: 0;
  gap: 10px;
  padding: 12px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.chain-step i {
  margin-top: 2px;
  color: #909399;
  font-size: 18px;
}
.chain-step div {
  min-width: 0;
}
.chain-step strong,
.chain-step span,
.chain-step code {
  display: block;
}
.chain-step strong {
  color: #303133;
  font-size: 13px;
  line-height: 20px;
}
.chain-step span {
  margin-top: 3px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
.chain-step code {
  margin-top: 6px;
}
.chain-step.is-success {
  background: #f0f9eb;
  border-color: #d9ecff;
}
.chain-step.is-success i {
  color: #67c23a;
}
.chain-step.is-pending {
  background: #fdf6ec;
  border-color: #faecd8;
}
.chain-step.is-pending i {
  color: #e6a23c;
}
.chain-step.is-error {
  background: #fef0f0;
  border-color: #fde2e2;
}
.chain-step.is-error i {
  color: #f56c6c;
}
.detail-collapse {
  margin-top: 4px;
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
@media (max-width: 1199px) {
  .result-panel {
    margin-top: 24px;
    padding-left: 2px;
    border-left: 0;
  }
}
@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .file-meta,
  .form-alert,
  .form-actions {
    margin-left: 0;
  }
  .file-meta {
    grid-template-columns: 1fr;
  }
  .result-meta,
  .chain-steps {
    grid-template-columns: 1fr;
  }
  .result-meta div {
    grid-template-columns: 116px minmax(0, 1fr);
  }
  .result-meta div:nth-child(odd):not(.wide) {
    border-right: 0;
  }
  .form-actions {
    overflow-x: auto;
  }
}
</style>
