<template>
  <div class="app-container cross-verification-page zkp-verification-page">
    <el-card class="page-shell cross-verification-card">
      <header class="page-header cross-verification-header">
        <div>
          <h2>隐私证明验证</h2>
          <p>验证交通数据相关证明是否满足指定约束</p>
        </div>
        <el-tag :type="healthMeta.type" effect="plain">{{ healthMeta.text }}</el-tag>
      </header>

      <el-row class="verification-workspace" :gutter="18">
        <el-col :xs="24" :lg="9">
          <section class="form-panel">
            <div class="section-title">
              <h3>验证参数</h3>
            </div>
            <el-form
              ref="form"
              :model="form"
              :rules="rules"
              label-position="top"
              class="zkp-form cross-verification-form"
            >
              <el-form-item label="业务标识" prop="businessId">
                <el-input
                  v-model.trim="form.businessId"
                  placeholder="请输入业务标识，例如 traffic-proof-001"
                >
                  <el-button slot="append" @click="generateBusinessId">生成</el-button>
                </el-input>
              </el-form-item>

              <el-row :gutter="12">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="证明写入链" prop="sourceChain">
                    <el-select v-model="form.sourceChain" style="width: 100%" @change="handleSourceChainChange">
                      <el-option
                        v-for="chain in chainOptions"
                        :key="chain.value"
                        :label="chain.label"
                        :value="chain.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="证明验证链" prop="verificationChain">
                    <el-select v-model="form.verificationChain" style="width: 100%">
                      <el-option
                        v-for="chain in chainOptions"
                        :key="chain.value"
                        :label="chain.label"
                        :value="chain.value"
                        :disabled="chain.value === form.sourceChain"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="零知识证明规则" prop="circuitId">
                <el-input
                  v-model.trim="form.circuitId"
                  placeholder="选择或生成证明规则，例如：证明车速处于规定范围"
                >
                  <el-button slot="append" class="generate-rule-button" @click="generateZkpRule">生成</el-button>
                </el-input>
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
                label="Groth16 证明值"
                prop="proofText"
              >
                <el-input
                  v-model="form.proofText"
                  class="json-textarea"
                  type="textarea"
                  :rows="8"
                  placeholder="请输入证明工具生成的 piA、piB、piC 证明值"
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

              <el-form-item label="公开验证条件">
                <el-radio-group v-model="form.publicInputMode" size="small" @change="handlePublicModeChange">
                  <el-radio-button label="paste">粘贴 JSON</el-radio-button>
                  <el-radio-button label="upload">上传证明文件</el-radio-button>
                  <el-radio-button label="example">使用示例证明</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item
                v-if="form.publicInputMode === 'paste' || form.publicInputMode === 'example'"
                label="公开条件值"
                prop="publicSignalsText"
              >
                <el-input
                  v-model="form.publicSignalsText"
                  class="json-textarea public-signals"
                  type="textarea"
                  :rows="5"
                  placeholder="请输入公开验证条件 JSON"
                  @input="clearInputError"
                />
                <el-button
                  v-if="form.publicInputMode === 'example'"
                  class="example-button"
                  size="small"
                  type="primary"
                  plain
                  icon="el-icon-document-add"
                  @click="fillExamplePublicSignals"
                >填入示例证明</el-button>
              </el-form-item>

              <template v-if="form.publicInputMode === 'upload'">
                <el-form-item label="公开条件文件">
                  <el-upload
                    ref="publicUpload"
                    action="#"
                    :auto-upload="false"
                    :limit="1"
                    :file-list="publicFileList"
                    :on-change="handlePublicFileChange"
                    :on-remove="handlePublicFileRemove"
                    :on-exceed="handlePublicFileExceed"
                    accept=".json,.txt"
                  >
                    <el-button icon="el-icon-folder-opened">选择证明文件</el-button>
                  </el-upload>
                </el-form-item>
                <dl v-if="publicFileMeta" class="file-meta">
                  <div>
                    <dt>文件名</dt>
                    <dd>{{ publicFileMeta.fileName }}</dd>
                  </div>
                  <div>
                    <dt>文件大小</dt>
                    <dd>{{ publicFileMeta.sizeText }}</dd>
                  </div>
                </dl>
              </template>

              <el-form-item label="公开条件 Hash" prop="publicInputHash">
                <el-input
                  v-model.trim="form.publicInputHash"
                  placeholder="可选，64 位十六进制字符串"
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
              </div>
            </el-form>
          </section>
        </el-col>

        <el-col :xs="24" :lg="15">
          <section class="result-panel cross-verification-result">
            <VerificationResultPanel
              :result="result"
              :loading="submitting"
              title="验证结果"
              verify-type="zkp"
              @show-json="openJsonDialog"
            />
            <el-alert
              v-if="submitError"
              class="result-error"
              :title="submitError"
              type="error"
              :closable="false"
              show-icon
            />
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
import { getCrossVerificationHealth, updateVerificationRecordLedger, verifyZkp } from '@/api/crossVerification'
import JsonResultDialog from './components/JsonResultDialog'
import VerificationResultPanel from './components/VerificationResultPanel'
import { formatBytes } from './utils/fileChunkUtils'
import { VERIFY_CHAINS, VERIFY_TYPES, getVerifyChainPath, getVerifyPath } from '@/api/trafficVerifyChain'
import { syncCrossChainVerification } from './utils/crossChainVerification'
import { isHex64 } from './utils/verificationUtils'

const EXAMPLE_PROOF = {
  scheme: 'g16',
  curve: 'bn128',
  proof: {
    a: [
      '0x20a48547246896b28890481bf6319ccf6cf875c2289e0be5e6108818bb98d09e',
      '0x26de35885848d4cd148fdfee5761abb74aa7a8350312d0135d2ad6969060971d'
    ],
    b: [
      [
        '0x2126192f6ba897fbc65ad0c3d8cc47f49f9b7255900bf9c9c612c2d81e977dc0',
        '0x2503c8ff8d62a5af0f5ab3c0a3d6ed37f6d14b1d89a6342d80b2e9bfdac69726'
      ],
      [
        '0x23ccb69382a40f1be41080062d33cce8b1f7c602575d619299bf280ddb2c45b7',
        '0x00fc07184c8db2baa3af418d4881366d09b622b3f23fd9efff2e1d6705bccd4b'
      ]
    ],
    c: [
      '0x17f96e36f1fd23e65b714fdaf3e472e663224422c36b3f8f3c88793685c95841',
      '0x1b83c72ddc0ffeeb104dcf49c9f98b2c0e82ff0e5e900475d9542f9cc35adce2'
    ]
  },
  inputs: [
    '0x000000000000000000000000000000000000000000000000000000000000001e',
    '0x0000000000000000000000000000000000000000000000000000000000000050'
  ]
}

const EXAMPLE_PUBLIC_SIGNALS = [
  '0x000000000000000000000000000000000000000000000000000000000000001e',
  '0x0000000000000000000000000000000000000000000000000000000000000050'
]

export default {
  name: 'ZkpVerification',
  components: {
    JsonResultDialog,
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
      const parsed = this.parseJson(value, '公开验证条件格式错误，请检查 JSON 内容。')
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
        sourceChain: [{ required: true, message: '请选择证明写入链', trigger: 'change' }],
        verificationChain: [
          { required: true, message: '请选择证明验证链', trigger: 'change' },
          {
            validator: (rule, value, callback) => {
              if (value && value === this.form.sourceChain) {
                callback(new Error('证明写入链和证明验证链不能相同'))
                return
              }
              callback()
            },
            trigger: 'change'
          }
        ],
        circuitId: [{ required: true, message: '请输入零知识证明规则', trigger: 'blur' }],
        proofText: [{ validator: validateProofText, trigger: 'blur' }],
        publicSignalsText: [{ validator: validatePublicSignals, trigger: 'blur' }],
        publicInputHash: [{ validator: validatePublicInputHash, trigger: 'blur' }]
      },
      proofFileList: [],
      proofFileMeta: null,
      publicFileList: [],
      publicFileMeta: null,
      inputError: '',
      submitError: '',
      result: null,
      jsonDialogVisible: false,
      jsonDialogData: null,
      chainOptions: VERIFY_CHAINS
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
        sourceChain: 'bcos3',
        verificationChain: 'fabric',
        algorithm: 'Groth16',
        circuitId: '',
        proofInputMode: 'paste',
        proofText: '',
        publicInputMode: 'paste',
        publicSignalsText: '',
        publicInputHash: ''
      }
    },
    generateBusinessId() {
      this.form.businessId = `traffic-proof-${Date.now()}`
      this.$nextTick(() => this.$refs.form.validateField('businessId'))
    },
    handleSourceChainChange(sourceChain) {
      if (this.form.verificationChain === sourceChain) {
        const fallback = this.chainOptions.find(chain => chain.value !== sourceChain)
        this.form.verificationChain = fallback ? fallback.value : ''
      }
      this.$nextTick(() => this.$refs.form.validateField('verificationChain'))
    },
    generateZkpRule() {
      this.form.circuitId = 'traffic-speed-range-v1'
      this.clearInputError()
      this.$nextTick(() => this.$refs.form.validateField('circuitId'))
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
      this.clearInputError()
      this.$nextTick(() => {
        this.$refs.form.validateField('proofText')
      })
    },
    handlePublicModeChange(mode) {
      this.clearInputError()
      if (mode === 'example') {
        this.fillExamplePublicSignals()
      }
    },
    fillExamplePublicSignals() {
      this.form.publicSignalsText = JSON.stringify(EXAMPLE_PUBLIC_SIGNALS, null, 2)
      this.clearInputError()
      this.$nextTick(() => {
        this.$refs.form.validateField('publicSignalsText')
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
    async handlePublicFileChange(file, fileList) {
      if (!file.raw) return
      this.inputError = ''
      this.publicFileList = fileList.slice(-1)
      try {
        const text = await this.readFileText(file.raw)
        const parsed = this.parseJson(text, '公开验证条件格式错误，请检查 JSON 内容。')
        if (!parsed.ok) {
          throw new Error(parsed.message)
        }
        this.form.publicSignalsText = JSON.stringify(parsed.value, null, 2)
        this.publicFileMeta = {
          fileName: file.raw.name,
          sizeText: formatBytes(file.raw.size)
        }
        this.$nextTick(() => {
          this.$refs.form.validateField('publicSignalsText')
        })
      } catch (error) {
        this.publicFileList = []
        this.publicFileMeta = null
        this.inputError = error.message || '公开验证条件文件读取失败'
      }
    },
    handlePublicFileRemove() {
      this.publicFileList = []
      this.publicFileMeta = null
    },
    handlePublicFileExceed() {
      this.$message.warning('一次只能选择一个公开验证条件文件，请先移除当前文件')
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
          let nextResult = this.normalizeResult(response, payload)
          this.result = nextResult
          if (nextResult.status === 'PASS') {
            nextResult = await syncCrossChainVerification(nextResult, VERIFY_TYPES.ZKP, {
              sourceChain: this.form.sourceChain,
              verificationChain: this.form.verificationChain
            }, current => {
              this.result = current
            })
            this.result = nextResult
            await this.persistLedgerState(nextResult)
          }
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
        ? this.parseJson(publicSignalsText, '公开验证条件格式错误，请检查 JSON 内容。')
        : { ok: true, value: null }
      if (!publicSignals.ok) {
        this.inputError = publicSignals.message
        return null
      }

      this.inputError = ''
      return {
        businessId: this.form.businessId,
        sourceChain: this.form.sourceChain,
        verificationChain: this.form.verificationChain,
        circuitId: this.form.circuitId,
        proof: proof.value,
        publicSignals: publicSignals.value,
        publicInputHash: this.form.publicInputHash || undefined,
        writeLedger: false,
        ledgerTargets: []
      }
    },
    async persistLedgerState(result) {
      if (!result || !result.recordId || !result.ledger) return
      try {
        await updateVerificationRecordLedger(result.recordId, {
          ledger: result.ledger,
          chainVerification: result.chainVerification || null
        })
      } catch (error) {
        console.warn('[ZKP ledger record update]', error)
      }
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
      return 'PENDING'
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
      const ledger = result.ledger || {}
      const chain = result.chainVerification || {}
      if (ledger.status === 'SUCCESS' && chain.status === 'SUCCESS') {
        this.$message.success('隐私证明验证完成，可信账本同步和 Fabric 跨链验证成功')
        return
      }
      if (ledger.status === 'FAILED' || chain.status === 'FAILED') {
        this.$message.warning(chain.message || ledger.message || '隐私证明验证通过，但跨链同步未完成')
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
        ledger: {
          enabled: true,
          status: 'FAILED',
          sourceChain: payload && payload.sourceChain,
          chainPath: payload && payload.sourceChain ? getVerifyChainPath(payload.sourceChain) : '',
          resourcePath: payload && payload.sourceChain ? getVerifyPath(payload.sourceChain) : '',
          message: error && error.message
        },
        chainVerification: {
          enabled: true,
          status: 'FAILED',
          sourceChain: payload && payload.sourceChain,
          verificationChain: payload && payload.verificationChain,
          resourcePath: payload && payload.verificationChain ? getVerifyPath(payload.verificationChain) : '',
          message: error && error.message
        },
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
      this.publicFileList = []
      this.publicFileMeta = null
      this.inputError = ''
      this.submitError = ''
      this.result = null
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
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
.generate-rule-button {
  min-width: 108px;
}
.file-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 0 18px;
  font-size: 13px;
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
  font-size: 13px;
  font-family: inherit;
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
  margin: 0 0 16px;
  width: 100%;
  box-sizing: border-box;
}
.form-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 14px;
  width: 100%;
  margin-left: 0;
  white-space: nowrap;
  box-sizing: border-box;
}
.result-panel {
  min-height: 520px;
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
    width: 100%;
  }
  .file-meta {
    grid-template-columns: 1fr;
  }
  .form-actions {
    overflow-x: auto;
  }
}
</style>
