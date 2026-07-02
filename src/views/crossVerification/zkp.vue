<template>
  <div class="app-container cross-verification-page zkp-verification-page">
    <el-card class="page-shell cross-verification-card">
      <header class="page-header cross-verification-header">
        <div>
          <h2>隐私证明验证</h2>
          <p>验证交通数据相关证明是否满足指定约束，同时避免直接展示原始数据内容。</p>
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
              class="zkp-form cross-verification-form"
            >
              <el-form-item label="业务标识" prop="businessId">
                <el-input
                  v-model.trim="form.businessId"
                  placeholder="请输入业务标识，例如 traffic-proof-001"
                />
              </el-form-item>

              <el-form-item label="证明算法">
                <el-input v-model="form.algorithm" readonly />
              </el-form-item>

              <el-form-item label="电路标识" prop="circuitId">
                <el-input
                  v-model.trim="form.circuitId"
                  placeholder="请输入电路标识，例如 traffic-speed-range-v1"
                />
              </el-form-item>

              <el-form-item label="证明数据">
                <el-radio-group v-model="form.proofInputMode" size="small" @change="handleProofModeChange">
                  <el-radio-button label="paste">粘贴 JSON</el-radio-button>
                  <el-radio-button label="upload">上传证明文件</el-radio-button>
                  <el-radio-button label="example">使用示例证明</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item
                v-if="form.proofInputMode === 'paste' || form.proofInputMode === 'example'"
                label="证明 JSON"
                prop="proofText"
              >
                <el-input
                  v-model="form.proofText"
                  class="json-textarea"
                  type="textarea"
                  :rows="8"
                  placeholder="请粘贴证明 JSON"
                  @input="clearInputError"
                />
                <el-button
                  v-if="form.proofInputMode === 'example'"
                  class="example-button"
                  size="small"
                  type="primary"
                  plain
                  icon="el-icon-document-add"
                  @click="fillExampleProof"
                >填入示例证明</el-button>
              </el-form-item>

              <template v-if="form.proofInputMode === 'upload'">
                <el-form-item label="证明文件">
                  <el-upload
                    ref="proofUpload"
                    action="#"
                    :auto-upload="false"
                    :limit="1"
                    :file-list="proofFileList"
                    :on-change="handleProofFileChange"
                    :on-remove="handleProofFileRemove"
                    :on-exceed="handleProofFileExceed"
                    accept=".json,.txt"
                  >
                    <el-button icon="el-icon-folder-opened">选择证明文件</el-button>
                  </el-upload>
                </el-form-item>
                <dl v-if="proofFileMeta" class="file-meta">
                  <div>
                    <dt>文件名</dt>
                    <dd>{{ proofFileMeta.fileName }}</dd>
                  </div>
                  <div>
                    <dt>文件大小</dt>
                    <dd>{{ proofFileMeta.sizeText }}</dd>
                  </div>
                </dl>
              </template>

              <el-form-item label="公开输入" prop="publicSignalsText">
                <el-input
                  v-model="form.publicSignalsText"
                  class="json-textarea public-signals"
                  type="textarea"
                  :rows="5"
                  placeholder="请输入公开输入 JSON，例如 [42, 60]"
                  @input="clearInputError"
                />
              </el-form-item>

              <el-form-item label="公开输入 Hash" prop="publicInputHash">
                <el-input
                  v-model.trim="form.publicInputHash"
                  placeholder="可选，64 位十六进制字符串"
                />
              </el-form-item>

              <el-form-item label="可信账本同步">
                <LedgerTargetSelector
                  :write-ledger.sync="form.writeLedger"
                  :ledger-targets.sync="form.ledgerTargets"
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
          <section class="result-panel cross-verification-result">
            <VerificationResultPanel
              v-if="result"
              :result="result"
              :loading="submitting"
              title="验证结果"
              @show-json="openJsonDialog"
            />
            <div v-else class="result-empty">
              <el-empty description="请填写验证参数并执行隐私证明验证。" :image-size="88" />
              <el-alert
                v-if="submitError"
                class="result-error"
                :title="submitError"
                type="error"
                :closable="false"
                show-icon
              />
            </div>
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
import { getCrossVerificationHealth, verifyZkp } from '@/api/crossVerification'
import JsonResultDialog from './components/JsonResultDialog'
import LedgerTargetSelector from './components/LedgerTargetSelector'
import VerificationResultPanel from './components/VerificationResultPanel'
import { formatBytes } from './utils/fileChunkUtils'
import { buildLocalRecord, isHex64, saveRecentRecord } from './utils/verificationUtils'

const EXAMPLE_PROOF = {
  piA: ['1234567890', '2345678901'],
  piB: [
    ['3456789012', '4567890123'],
    ['5678901234', '6789012345']
  ],
  piC: ['7890123456', '8901234567'],
  protocol: 'groth16',
  curve: 'bn128',
  valid: true
}

const EXAMPLE_PUBLIC_SIGNALS = ['42', '60', '1']

export default {
  name: 'ZkpVerification',
  components: {
    JsonResultDialog,
    LedgerTargetSelector,
    VerificationResultPanel
  },
  data() {
    const validateProofText = (rule, value, callback) => {
      if (!String(value || '').trim()) {
        callback(new Error('请输入证明数据 JSON'))
        return
      }
      const parsed = this.parseJson(value, '证明数据格式错误，请检查 JSON 内容。')
      if (!parsed.ok) {
        callback(new Error(parsed.message))
        return
      }
      if (this.isEmptyContent(parsed.value)) {
        callback(new Error('证明数据不能为空'))
        return
      }
      callback()
    }
    const validatePublicSignals = (rule, value, callback) => {
      if (!String(value || '').trim()) {
        callback()
        return
      }
      const parsed = this.parseJson(value, '公开输入格式错误，请检查 JSON 内容。')
      if (!parsed.ok) {
        callback(new Error(parsed.message))
        return
      }
      callback()
    }
    const validatePublicInputHash = (rule, value, callback) => {
      if (!value || isHex64(value)) {
        callback()
        return
      }
      callback(new Error('请输入 64 位十六进制字符串'))
    }

    return {
      healthStatus: 'unchecked',
      submitting: false,
      form: this.createForm(),
      rules: {
        businessId: [{ required: true, message: '请输入业务标识', trigger: 'blur' }],
        circuitId: [{ required: true, message: '请输入电路标识', trigger: 'blur' }],
        proofText: [{ validator: validateProofText, trigger: 'blur' }],
        publicSignalsText: [{ validator: validatePublicSignals, trigger: 'blur' }],
        publicInputHash: [{ validator: validatePublicInputHash, trigger: 'blur' }]
      },
      proofFileList: [],
      proofFileMeta: null,
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
    }
  },
  created() {
    this.checkHealth()
  },
  methods: {
    createForm() {
      return {
        businessId: '',
        algorithm: 'Groth16',
        circuitId: '',
        proofInputMode: 'paste',
        proofText: '',
        publicSignalsText: '',
        publicInputHash: '',
        writeLedger: false,
        ledgerTargets: {
          network: '',
          resourcePath: ''
        }
      }
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
    handleProofModeChange(mode) {
      this.clearInputError()
      if (mode === 'example') {
        this.fillExampleProof()
      }
    },
    fillExampleProof() {
      this.form.proofText = JSON.stringify(EXAMPLE_PROOF, null, 2)
      this.form.publicSignalsText = JSON.stringify(EXAMPLE_PUBLIC_SIGNALS, null, 2)
      if (!this.form.circuitId) {
        this.form.circuitId = 'traffic-speed-range-v1'
      }
      this.clearInputError()
      this.$nextTick(() => {
        this.$refs.form.validateField('proofText')
        this.$refs.form.validateField('publicSignalsText')
        this.$refs.form.validateField('circuitId')
      })
    },
    async handleProofFileChange(file, fileList) {
      if (!file.raw) return
      this.inputError = ''
      this.proofFileList = fileList.slice(-1)
      try {
        const text = await this.readFileText(file.raw)
        const parsed = this.parseJson(text, '证明数据格式错误，请检查 JSON 内容。')
        if (!parsed.ok) {
          throw new Error(parsed.message)
        }
        this.form.proofText = JSON.stringify(parsed.value, null, 2)
        this.proofFileMeta = {
          fileName: file.raw.name,
          sizeText: formatBytes(file.raw.size)
        }
        this.$nextTick(() => {
          this.$refs.form.validateField('proofText')
        })
      } catch (error) {
        this.proofFileList = []
        this.proofFileMeta = null
        this.inputError = error.message || '证明文件读取失败'
      }
    },
    handleProofFileRemove() {
      this.proofFileList = []
      this.proofFileMeta = null
    },
    handleProofFileExceed() {
      this.$message.warning('一次只能选择一个证明文件，请先移除当前文件')
    },
    readFileText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('证明文件读取失败'))
        reader.onload = event => resolve(String(event.target.result || ''))
        reader.readAsText(file, 'UTF-8')
      })
    },
    parseJson(text, message) {
      try {
        const value = JSON.parse(String(text || '').trim())
        return { ok: true, value }
      } catch (error) {
        return { ok: false, message }
      }
    },
    isEmptyContent(value) {
      if (value == null) return true
      if (Array.isArray(value)) return value.length === 0
      if (typeof value === 'object') return Object.keys(value).length === 0
      return String(value).trim() === ''
    },
    clearInputError() {
      this.inputError = ''
    },
    submit() {
      this.$refs.form.validate(async valid => {
        if (!valid) {
          this.inputError = '请检查验证参数。'
          return
        }

        const payload = this.buildPayload()
        if (!payload) return

        this.submitting = true
        this.submitError = ''
        try {
          const response = await verifyZkp(payload)
          this.result = this.normalizeResult(response, payload)
          saveRecentRecord(buildLocalRecord(this.result))
          this.showSubmitMessage(this.result)
        } catch (error) {
          this.result = this.buildErrorResult(error, payload)
          this.submitError = '隐私证明验证请求失败，请检查验证服务状态。'
          this.$message.error(this.submitError)
        } finally {
          this.submitting = false
        }
      })
    },
    buildPayload() {
      const proof = this.parseJson(this.form.proofText, '证明数据格式错误，请检查 JSON 内容。')
      if (!proof.ok) {
        this.inputError = proof.message
        return null
      }
      if (this.isEmptyContent(proof.value)) {
        this.inputError = '证明数据不能为空'
        return null
      }

      const publicSignalsText = String(this.form.publicSignalsText || '').trim()
      const publicSignals = publicSignalsText
        ? this.parseJson(publicSignalsText, '公开输入格式错误，请检查 JSON 内容。')
        : { ok: true, value: null }
      if (!publicSignals.ok) {
        this.inputError = publicSignals.message
        return null
      }

      const ledgerTargets = this.buildLedgerTargets()
      if (this.form.writeLedger && !ledgerTargets.length) {
        this.inputError = '同步到可信账本时，请选择目标验证合约。'
        return null
      }

      this.inputError = ''
      return {
        businessId: this.form.businessId,
        circuitId: this.form.circuitId,
        proof: proof.value,
        publicSignals: publicSignals.value,
        publicInputHash: this.form.publicInputHash || undefined,
        writeLedger: this.form.writeLedger,
        ledgerTargets
      }
    },
    buildLedgerTargets() {
      const target = this.form.ledgerTargets && this.form.ledgerTargets.resourcePath
      return target ? [target] : []
    },
    normalizeResult(response, payload) {
      const detail = Object.assign({}, response.detail || {})
      const proofSummary = Object.assign({}, detail.proofSummary || {})
      return Object.assign({}, response, {
        verifyType: response.verifyType || 'ZKP',
        verifyName: response.verifyName || '隐私证明验证',
        businessId: response.businessId || payload.businessId,
        algorithm: response.algorithm || this.form.algorithm,
        status: response.status || (response.passed === false ? 'FAIL' : 'PASS'),
        detail: Object.assign(detail, {
          circuitId: response.circuitId || detail.circuitId || payload.circuitId,
          publicInputHash: response.publicInputHash || detail.publicInputHash || response.inputHash || payload.publicInputHash,
          proofSummary: Object.assign(proofSummary, {
            proofHash: response.proofHash || detail.proofHash || proofSummary.proofHash
          })
        }),
        ledgerStatus: this.resolveLedgerStatus(response)
      })
    },
    resolveLedgerStatus(response) {
      const ledger = response.ledger || {}
      if (response.ledgerStatus) return response.ledgerStatus
      if (ledger.status) return ledger.status
      return this.form.writeLedger ? 'PENDING' : 'DISABLED'
    },
    showSubmitMessage(result) {
      if (result.status === 'ERROR') {
        this.$message.error(result.message || '隐私证明验证异常')
        return
      }
      if (result.status === 'FAIL') {
        this.$message.warning(result.message || '隐私证明验证未通过')
        return
      }
      this.$message.success('隐私证明验证完成')
    },
    buildErrorResult(error, payload) {
      return {
        recordId: `local-error-${Date.now()}`,
        verifyType: 'ZKP',
        verifyName: '隐私证明验证',
        businessId: payload && payload.businessId,
        algorithm: this.form.algorithm,
        status: 'ERROR',
        message: '隐私证明验证请求失败，请检查验证服务状态。',
        proofHash: '',
        resultHash: '',
        ledgerStatus: 'LEDGER_FAILED',
        detail: {
          circuitId: payload && payload.circuitId,
          error: error && error.message
        },
        timestamp: new Date().toISOString()
      }
    },
    resetForm() {
      this.form = this.createForm()
      this.proofFileList = []
      this.proofFileMeta = null
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
.zkp-form::v-deep .el-form-item__label {
  color: #606266;
}
.json-textarea::v-deep textarea {
  max-height: 220px;
  overflow: auto;
  font: 12px/1.6 Consolas, monospace;
}
.public-signals::v-deep textarea {
  max-height: 150px;
}
.example-button {
  margin-top: 8px;
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
  justify-content: flex-end;
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
  .form-actions {
    overflow-x: auto;
  }
}
</style>
