<template>
  <div class="app-container cross-verification-page threshold-signature-page">
    <el-card class="page-shell cross-verification-card">
      <header class="page-header cross-verification-header">
        <div>
          <h2>多方签名验证</h2>
          <p>验证是否有足够多节点确认</p>
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
              class="threshold-form cross-verification-form"
            >
              <el-form-item label="业务标识" prop="businessId">
                <el-input
                  v-model.trim="form.businessId"
                  placeholder="请输入业务标识，例如 traffic-signature-001"
                >
                  <el-button slot="append" @click="generateBusinessId">生成</el-button>
                </el-input>
              </el-form-item>

              <el-form-item label="待签名业务内容" prop="message">
                <el-input
                  v-model="form.message"
                  class="message-textarea"
                  type="textarea"
                  :rows="4"
                  readonly
                  placeholder="请输入各参与节点共同确认并签名的业务内容。"
                  @input="clearInputError"
                />
              </el-form-item>

              <el-row :gutter="12">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="总节点数" prop="totalNodes">
                    <el-input-number
                      v-model="form.totalNodes"
                      :min="1"
                      :max="1000"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="签名阈值" prop="threshold">
                    <el-input-number
                      v-model="form.threshold"
                      :min="1"
                      :max="form.totalNodes || 1"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="参与节点编号" prop="participantIdsText">
                <el-input
                  v-model.trim="form.participantIdsText"
                  placeholder="请输入参与节点编号，例如 1,2,4"
                  @input="clearInputError"
                />
                <div class="input-hint">使用英文逗号分隔，例如 1,2,4。</div>
              </el-form-item>

              <el-form-item label="门限签名数据" prop="signatureBundleText">
                <el-input
                  v-model="form.signatureBundleText"
                  class="signature-textarea"
                  type="textarea"
                  :rows="7"
                  placeholder="请输入各节点部分签名组成的门限签名数据。"
                  @input="clearInputError"
                />
                <div class="field-extra-actions">
                  <el-button
                    class="test-data-button"
                    size="small"
                    type="primary"
                    plain
                    icon="el-icon-document-add"
                    @click="generateSignatureTestData"
                  >生成测试数据</el-button>
                </div>
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
              verify-type="threshold"
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
import { getCrossVerificationHealth, updateVerificationRecordLedger, verifyThresholdSignature } from '@/api/crossVerification'
import JsonResultDialog from './components/JsonResultDialog'
import VerificationResultPanel from './components/VerificationResultPanel'
import { VERIFY_TYPES } from '@/api/trafficVerifyChain'
import { syncCrossChainVerification } from './utils/crossChainVerification'

const DEFAULT_SIGNATURE_BUNDLE = {
  scheme: 'ECDSA-P256-SHA256',
  policyId: 'traffic-consortium-dev-local',
  participantSignatures: {
    1: 'MEYCIQDZGjJuxQg1kERy7hsjTKrkGhUYh6MvFJRsq3+mOuXKRgIhAIPgR66H0zawNFKmKWAtnrwrkBJDWwqFz0kyqsX1zfR2',
    2: 'MEYCIQCcHBTaElgF9ts3Npp5TJ3wNTrWFGbubUDBB5+etQe/sgIhAMhSe37a+JI34jx3u4l7w7cDHR66wcem0vxUFKrApc0w',
    4: 'MEUCIAHGy0fUeCXEluoP1ujxuC8j6R0UKQZFAQCz8mac9zGJAiEA6nHtcF30dsWvEKICnQJV9onnjpby+YrtNQaYnkN+TbI='
  }
}

export default {
  name: 'ThresholdSignatureVerification',
  components: {
    JsonResultDialog,
    VerificationResultPanel
  },
  data() {
    const validatePositiveNumber = (rule, value, callback) => {
      if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
        callback(new Error('请输入大于 0 的整数'))
        return
      }
      callback()
    }
    const validateThreshold = (rule, value, callback) => {
      const threshold = Number(value)
      const totalNodes = Number(this.form.totalNodes)
      if (!Number.isInteger(threshold) || threshold <= 0 || threshold > totalNodes) {
        callback(new Error('签名阈值必须大于 0，且不能超过总节点数。'))
        return
      }
      callback()
    }
    const validateParticipantIds = (rule, value, callback) => {
      const parsed = this.parseParticipantIds(value)
      if (!parsed.ok) {
        callback(new Error(parsed.message))
        return
      }
      callback()
    }
    const validateSignatureBundle = (rule, value, callback) => {
      if (!String(value || '').trim()) {
        callback(new Error('请输入门限签名数据'))
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
        message: [{ required: true, message: '请输入待签名业务内容', trigger: 'blur' }],
        totalNodes: [{ validator: validatePositiveNumber, trigger: 'change' }],
        threshold: [{ validator: validateThreshold, trigger: 'change' }],
        participantIdsText: [{ validator: validateParticipantIds, trigger: 'blur' }],
        signatureBundleText: [{ validator: validateSignatureBundle, trigger: 'blur' }]
      },
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
        message: 'traffic speed range approved',
        totalNodes: 5,
        threshold: 3,
        participantIdsText: '1,2,4',
        signatureBundleText: ''
      }
    },
    generateBusinessId() {
      this.form.businessId = `traffic-signature-${Date.now()}`
      this.$nextTick(() => this.$refs.form.validateField('businessId'))
    },
    generateSignatureTestData() {
      if (!this.form.businessId) this.generateBusinessId()
      this.form.message = 'traffic speed range approved'
      this.form.totalNodes = 5
      this.form.threshold = 3
      this.form.participantIdsText = '1,2,4'
      this.form.signatureBundleText = JSON.stringify(DEFAULT_SIGNATURE_BUNDLE, null, 2)
      this.clearInputError()
      this.$nextTick(() => this.$refs.form.clearValidate())
      this.$message.success('多方签名测试数据已生成')
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
    clearInputError() {
      this.inputError = ''
    },
    parseParticipantIds(value) {
      const text = String(value || '').trim()
      if (!text) {
        return { ok: false, message: '参与节点编号不能为空。' }
      }
      const items = text.split(',').map(item => item.trim()).filter(Boolean)
      if (!items.length) {
        return { ok: false, message: '参与节点编号不能为空。' }
      }
      const ids = []
      for (const item of items) {
        if (!/^\d+$/.test(item)) {
          return { ok: false, message: '参与节点编号必须是数字。' }
        }
        const id = Number(item)
        if (id < 1 || id > Number(this.form.totalNodes)) {
          return { ok: false, message: '参与节点编号必须在 1 到总节点数之间。' }
        }
        ids.push(id)
      }
      if (new Set(ids).size !== ids.length) {
        return { ok: false, message: '参与节点编号不能重复。' }
      }
      if (ids.length < Number(this.form.threshold)) {
        return { ok: false, message: '参与节点数量不能小于签名阈值。' }
      }
      return { ok: true, value: ids }
    },
    parseSignatureBundle(value) {
      const text = String(value || '').trim()
      if (!text) {
        return { ok: false, message: '门限签名数据不能为空。' }
      }
      try {
        const parsed = JSON.parse(text)
        if (parsed == null) {
          return { ok: false, message: '门限签名数据不能为空。' }
        }
        if (Array.isArray(parsed)) {
          return parsed.length
            ? { ok: true, value: { signatures: parsed }}
            : { ok: false, message: '门限签名数据不能为空。' }
        }
        if (typeof parsed === 'object') {
          return Object.keys(parsed).length
            ? { ok: true, value: parsed }
            : { ok: false, message: '门限签名数据不能为空。' }
        }
        return { ok: true, value: { signature: String(parsed) }}
      } catch (error) {
        return { ok: true, value: { signature: text }}
      }
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
          const response = await verifyThresholdSignature(payload)
          let nextResult = this.normalizeResult(response, payload)
          this.result = nextResult
          if (nextResult.status === 'PASS') {
            nextResult = await syncCrossChainVerification(nextResult, VERIFY_TYPES.THRESHOLD_SIGNATURE, current => {
              this.result = current
            })
            this.result = nextResult
            await this.persistLedgerState(nextResult)
          }
          this.showSubmitMessage(this.result)
        } catch (error) {
          this.result = this.buildErrorResult(error, payload)
          this.submitError = '多方签名验证请求失败，请检查验证服务状态。'
          this.$message.error(this.submitError)
        } finally {
          this.submitting = false
        }
      })
    },
    buildPayload() {
      const threshold = Number(this.form.threshold)
      const totalNodes = Number(this.form.totalNodes)
      if (threshold <= 0 || threshold > totalNodes) {
        this.inputError = '签名阈值必须大于 0，且不能超过总节点数。'
        return null
      }

      const participantIds = this.parseParticipantIds(this.form.participantIdsText)
      if (!participantIds.ok) {
        this.inputError = participantIds.message
        return null
      }

      const signatureBundle = this.parseSignatureBundle(this.form.signatureBundleText)
      if (!signatureBundle.ok) {
        this.inputError = signatureBundle.message
        return null
      }

      this.inputError = ''
      return {
        businessId: this.form.businessId,
        message: this.form.message,
        threshold,
        totalNodes,
        participantIds: participantIds.value,
        signatureBundle: signatureBundle.value,
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
        console.warn('[Threshold ledger record update]', error)
      }
    },
    normalizeResult(response, payload) {
      const detail = Object.assign({}, response.detail || {})
      return Object.assign({}, response, {
        verifyType: response.verifyType || 'THRESHOLD_SIGNATURE',
        verifyName: response.verifyName || '多方签名验证',
        businessId: response.businessId || payload.businessId,
        algorithm: response.algorithm || 'Threshold-Signature',
        status: response.status || (response.passed === false ? 'FAIL' : 'PASS'),
        detail: Object.assign(detail, {
          threshold: detail.threshold || payload.threshold,
          totalNodes: detail.totalNodes || payload.totalNodes,
          participantCount: detail.participantCount || payload.participantIds.length,
          participantIds: detail.participantIds || payload.participantIds,
          messageHash: detail.messageHash || response.inputHash,
          signatureHash: detail.signatureHash || response.proofHash
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
        this.$message.error(result.message || '多方签名验证异常')
        return
      }
      if (result.status === 'FAIL') {
        this.$message.warning(result.message || '多方签名验证未通过')
        return
      }
      const ledger = result.ledger || {}
      const chain = result.chainVerification || {}
      if (ledger.status === 'SUCCESS' && chain.status === 'SUCCESS') {
        this.$message.success('多方签名验证完成，可信账本同步和 Fabric 跨链验证成功')
        return
      }
      if (ledger.status === 'FAILED' || chain.status === 'FAILED') {
        this.$message.warning(chain.message || ledger.message || '多方签名验证通过，但跨链同步未完成')
        return
      }
      this.$message.success('多方签名验证完成')
    },
    buildErrorResult(error, payload) {
      return {
        recordId: `local-error-${Date.now()}`,
        verifyType: 'THRESHOLD_SIGNATURE',
        verifyName: '多方签名验证',
        businessId: payload && payload.businessId,
        algorithm: 'Threshold-Signature',
        status: 'ERROR',
        message: '多方签名验证请求失败，请检查验证服务状态。',
        inputHash: '',
        proofHash: '',
        resultHash: '',
        ledgerStatus: 'LEDGER_FAILED',
        detail: {
          threshold: payload && payload.threshold,
          totalNodes: payload && payload.totalNodes,
          participantCount: payload && payload.participantIds ? payload.participantIds.length : '',
          error: error && error.message
        },
        timestamp: new Date().toISOString()
      }
    },
    resetForm() {
      this.form = this.createForm()
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
.threshold-form::v-deep .el-form-item__label {
  color: #606266;
}
.input-hint {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}
.message-textarea::v-deep textarea,
.signature-textarea::v-deep textarea {
  max-height: 180px;
  overflow: auto;
}
.signature-textarea::v-deep textarea {
  max-height: 220px;
  font: 12px/1.6 Consolas, monospace;
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
  .form-alert,
  .form-actions {
    margin-left: 0;
    width: 100%;
  }
  .form-actions {
    overflow-x: auto;
  }
}
</style>
