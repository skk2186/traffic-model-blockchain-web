<template>
  <div class="app-container verification-page">
    <el-card class="verification-shell">
      <header class="page-header">
        <div><h2>链下验证</h2><p>运行验证并查看生成的证明值</p></div>
        <el-tag :type="online ? 'success' : 'danger'" effect="plain">{{ online ? '验证服务正常' : '验证服务不可用' }}</el-tag>
      </header>
      <el-tabs v-model="active" type="border-card" @tab-click="handleTabClick">
        <el-tab-pane label="Merkle Root生成" name="merkle" />
        <el-tab-pane label="零知识证明ZKP" name="zkp" />
        <el-tab-pane label="门限阈值签名" name="threshold" />
        <el-tab-pane label="签名验证" name="signature" />
        <section v-if="active === 'threshold'" class="chain-zkp-query-panel">
          <div class="chain-zkp-query-panel__header">
            <div class="chain-zkp-query-panel__title">链上 ZKP 结果查询</div>
            <el-button size="small" type="primary" plain @click="importChainZkpRecord">一键导入 ZKP 数据</el-button>
          </div>
          <el-form class="chain-zkp-query-form" label-position="top">
            <el-row :gutter="12">
              <el-col :xs="24" :sm="8">
                <el-form-item label="业务标识">
                  <el-input v-model.trim="chainZkpQuery.businessId" placeholder="请输入要查询的业务标识" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6">
                <el-form-item label="ZKP 所在链">
                  <el-select v-model="chainZkpQuery.zkpChain" style="width: 100%">
                    <el-option label="bcos3" value="bcos3" />
                    <el-option label="fabric" value="fabric" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="6">
                <el-form-item label="查询发起链">
                  <el-input :value="chainZkpQueryFromChain" readonly />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="4">
                <el-form-item label="操作">
                  <el-button size="small" type="primary" plain :loading="chainZkpQueryLoading" @click="queryChainZkpRecord">从链上查询</el-button>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div v-if="chainZkpRecord" class="chain-zkp-record">
            <div class="chain-zkp-record__key">记录标识：<code>{{ chainZkpRecordKey }}</code></div>
            <dl>
              <div v-for="item in chainZkpRecordFields" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd><code>{{ item.value }}</code></dd>
              </div>
            </dl>
          </div>
        </section>
        <el-row :gutter="18" :class="{ 'signature-stacked-layout': active === 'signature' }">
          <el-col :xs="24" :lg="10">
            <section class="form-panel">
              <h3>{{ titles[active] }}</h3>
              <el-form v-if="active !== 'signature'" ref="form" :model="form" :rules="rules" label-position="top">
                <el-form-item label="业务标识" prop="businessId">
                  <el-input v-model.trim="form.businessId" placeholder="请手动输入业务标识" @input="onBusinessIdInput">
                    <template v-if="active === 'merkle'" slot="append">
                      <el-button @click="generateBusinessId">生成</el-button>
                      <el-button @click="copyBusinessId">复制</el-button>
                    </template>
                  </el-input>
                </el-form-item>
                <template v-if="active === 'merkle'">
                  <el-form-item label="数据来源">
                    <el-radio-group v-model="form.inputMode" size="small">
                      <el-radio-button label="manual">手动输入</el-radio-button>
                      <el-radio-button label="file">选择文件</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item v-if="form.inputMode === 'manual'" label="数据块（每行一个叶子节点）">
                    <el-input v-model="form.dataText" type="textarea" :rows="6" placeholder="speed=40&#10;speed=35&#10;speed=42" />
                  </el-form-item>
                  <el-form-item v-else label="交通数据文件">
                    <el-upload ref="fileUpload" action="#" :auto-upload="false" :limit="1" :file-list="fileList" :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleFileExceed" accept=".txt,.csv,.json,.xml,.log,.md,.pdf,.zip,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bin">
                      <el-button icon="el-icon-folder-opened">选择文件</el-button>
                    </el-upload>
                    <div class="hint file-hint">文本文件按非空行分块；其他文件按64 KiB分块并Base64编码；最大10 MiB。</div>
                    <el-alert v-if="fileInfo" :title="fileInfo" type="info" :closable="false" show-icon />
                  </el-form-item>
                  <el-form-item label="抽样数据索引">
                    <el-input-number v-model="form.sampleIndex" :min="0" :max="maxIndex" controls-position="right" />
                    <span class="hint">当前范围 0 - {{ maxIndex }}</span>
                  </el-form-item>
                </template>
                <template v-else>
                  <el-form-item label="Merkle Root">
                    <el-select v-model.trim="form.merkleRoot" filterable allow-create default-first-option :disabled="!form.businessId" :placeholder="form.businessId ? '选择已有Root或粘贴64位十六进制Root' : '请先输入业务标识'" style="width: 100%" @change="onMerkleRootChange">
                      <el-option v-for="item in rootOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </template>
                <template v-if="active === 'threshold'">
                  <el-alert
                    class="threshold-source-tip"
                    :title="importedZkp ? '当前门限签名输入来自链上 ZKP 导入，也可继续手动调整字段' : '当前门限签名输入为手动输入模式'"
                    :type="importedZkp ? 'success' : 'info'"
                    :closable="false"
                    show-icon
                  />
                  <el-row :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="ZKP 所在链">
                        <el-select v-model="form.previousZkpChain" placeholder="请选择 ZKP 所在链" style="width: 100%" @change="onThresholdZkpFieldChange">
                          <el-option label="bcos3" value="bcos3" />
                          <el-option label="fabric" value="fabric" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="门限签名写入链">
                        <el-input :value="thresholdWriteChain || '请先选择 ZKP 所在链'" readonly />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item label="ZKP 记录 ID">
                    <el-input v-model.trim="form.previousZkpRecordId" placeholder="可手动输入或从链上 ZKP 导入" @input="onThresholdZkpFieldChange" />
                  </el-form-item>
                  <el-form-item label="ZKP 证明哈希">
                    <el-input v-model.trim="form.previousZkpProofHash" placeholder="可手动输入或从链上 ZKP 导入" @input="onThresholdZkpFieldChange" />
                  </el-form-item>
                  <el-form-item label="ZKP 结果哈希">
                    <el-input v-model.trim="form.previousZkpResultHash" placeholder="可手动输入或从链上 ZKP 导入" @input="onThresholdZkpFieldChange" />
                  </el-form-item>
                  <el-form-item label="ZKP 数据哈希">
                    <el-input v-model.trim="form.previousZkpDataHash" placeholder="可手动输入或从链上 ZKP 导入" @input="onThresholdZkpFieldChange" />
                  </el-form-item>
                  <el-row :gutter="12">
                    <el-col :span="12"><el-form-item label="总节点数"><el-input-number v-model="form.totalNodes" :min="1" :max="100" controls-position="right" /></el-form-item></el-col>
                    <el-col :span="12"><el-form-item label="签名阈值"><el-input-number v-model="form.threshold" :min="1" :max="form.totalNodes" controls-position="right" /></el-form-item></el-col>
                  </el-row>
                  <el-form-item label="参与节点编号" prop="participantText"><el-input v-model.trim="form.participantText" placeholder="用英文逗号分隔，例如：1,2,3" /></el-form-item>
                </template>
                <el-form-item v-if="active !== 'merkle'"><el-checkbox v-model="form.writeOnChain">将验证结果写入区块链</el-checkbox></el-form-item>
                <el-form-item v-if="active === 'zkp' && form.writeOnChain" label="写入目标链">
                  <el-select v-model="form.zkpTargetChain" placeholder="请选择写入目标链" style="width: 100%">
                    <el-option label="bcos3" value="bcos3" />
                    <el-option label="fabric" value="fabric" />
                  </el-select>
                  <div class="hint resource-hint">建议优先写入 bcos3，链上字段使用固定业务值。</div>
                </el-form-item>
                <el-form-item v-if="active === 'threshold' && form.writeOnChain" label="写入目标链">
                  <el-input :value="thresholdWriteChain || '请先选择 ZKP 所在链'" readonly />
                  <div class="hint resource-hint">门限签名结果只能写入 ZKP 所在链以外的另一条链。</div>
                </el-form-item>
                <el-button type="primary" icon="el-icon-video-play" :loading="loading" @click="run">运行{{ titles[active] }}</el-button>
                <el-button icon="el-icon-refresh-left" @click="reset">重置</el-button>
              </el-form>
              <el-form v-else ref="signatureVerifyForm" :model="signatureVerifyForm" label-position="top">
                <el-row :gutter="12">
                  <el-col :xs="24" :md="8">
                    <el-form-item label="业务标识">
                      <el-input v-model.trim="signatureVerifyForm.businessId" placeholder="请输入要验证的业务标识" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="8">
                    <el-form-item label="ZKP 所在链">
                      <el-select v-model="signatureVerifyForm.zkpChain" style="width: 100%">
                        <el-option label="bcos3" value="bcos3" />
                        <el-option label="fabric" value="fabric" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :md="8">
                    <el-form-item label="门限签名所在链">
                      <el-select v-model="signatureVerifyForm.thresholdChain" style="width: 100%">
                        <el-option label="bcos3" value="bcos3" />
                        <el-option label="fabric" value="fabric" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <div class="hint signature-route-hint">
                  ZKP 查询从 {{ getOtherChainName(signatureVerifyForm.zkpChain) }} 发起，门限签名查询从 {{ getOtherChainName(signatureVerifyForm.thresholdChain) }} 发起。
                </div>
                <el-button type="primary" icon="el-icon-connection" :loading="signatureVerifyLoading" @click="executeSignatureVerify">执行跨链验证</el-button>
                <el-button icon="el-icon-refresh-left" @click="resetSignatureVerify">重置</el-button>
              </el-form>
            </section>
          </el-col>
          <el-col :xs="24" :lg="14">
            <section v-if="active !== 'signature'" class="result-panel">
              <div class="section-title"><h3>验证结果</h3><el-tag v-if="result" :type="result.passed ? 'success' : 'danger'">{{ result.passed ? '验证通过' : '验证失败' }}</el-tag></div>
              <el-empty v-if="!result" description="运行验证后在此查看生成值" :image-size="88" />
              <template v-else>
                <dl class="result-meta">
                  <div><dt>验证类型</dt><dd>{{ typeName(result.verifyType) }}</dd></div>
                  <div><dt>算法</dt><dd>{{ result.algorithm }}</dd></div>
                  <div><dt>业务标识</dt><dd>{{ result.businessId }}</dd></div>
                  <div><dt>生成时间</dt><dd>{{ formatTime(result.timestamp) }}</dd></div>
                  <div class="wide"><dt>记录 ID</dt><dd><code>{{ result.recordId }}</code></dd></div>
                </dl>
                <div class="values">
                  <div v-for="item in values" :key="item.label" class="value-row">
                    <span>{{ item.label }}</span><code>{{ item.value }}</code>
                    <el-button type="text" icon="el-icon-document-copy" title="复制" @click="copy(item.value)" />
                  </div>
                </div>
                <el-collapse><el-collapse-item title="查看完整验证详情"><pre>{{ prettyResult }}</pre></el-collapse-item></el-collapse>
              </template>
            </section>
            <section v-else class="result-panel signature-verify-panel">
              <div class="section-title">
                <h3>签名验证结果</h3>
                <el-tag v-if="signatureVerifyResult" :type="signatureVerifyResult.verified ? 'success' : 'danger'">
                  {{ signatureVerifyResult.verified ? '验证通过' : '验证失败' }}
                </el-tag>
              </div>
              <el-empty v-if="!signatureVerifyResult" description="执行跨链验证后在此查看比对结果" :image-size="88" />
              <template v-else>
                <el-alert
                  :title="signatureVerifyResult.message"
                  :type="signatureVerifyResult.verified ? 'success' : 'error'"
                  :closable="false"
                  show-icon
                />
                <ul v-if="signatureVerifyResult.errors.length" class="verify-error-list">
                  <li v-for="error in signatureVerifyResult.errors" :key="error">{{ error }}</li>
                </ul>
                <el-row :gutter="12" class="signature-record-grid">
                  <el-col :xs="24" :md="12">
                    <div class="signature-record-block">
                      <h4>ZKP 链上记录详情</h4>
                      <dl>
                        <div v-for="item in signatureZkpRecordFields" :key="item.label">
                          <dt>{{ item.label }}</dt>
                          <dd><code>{{ item.value }}</code></dd>
                        </div>
                      </dl>
                    </div>
                  </el-col>
                  <el-col :xs="24" :md="12">
                    <div class="signature-record-block">
                      <h4>门限签名链上记录详情</h4>
                      <dl>
                        <div v-for="item in signatureThresholdRecordFields" :key="item.label">
                          <dt>{{ item.label }}</dt>
                          <dd><code>{{ item.value }}</code></dd>
                        </div>
                      </dl>
                    </div>
                  </el-col>
                </el-row>
                <el-table v-if="signatureCompareRows.length" :data="signatureCompareRows" size="small" border class="signature-compare-table">
                  <el-table-column prop="label" label="字段名" min-width="130" />
                  <el-table-column prop="zkpValue" label="ZKP 值" min-width="190" show-overflow-tooltip />
                  <el-table-column prop="thresholdValue" label="门限签名引用值" min-width="190" show-overflow-tooltip />
                  <el-table-column label="是否一致" width="90">
                    <template slot-scope="scope">
                      <el-tag :type="scope.row.matched ? 'success' : 'danger'" size="mini">{{ scope.row.matched ? '一致' : '不一致' }}</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
            </section>
            <section v-if="active !== 'signature' && history.length" class="history-panel">
              <div class="section-title"><h3>最近生成记录</h3><el-button type="text" @click="clearHistory">清空</el-button></div>
              <el-table :data="history" size="small" max-height="220" @row-click="selectRecord">
                <el-table-column prop="businessId" label="业务标识" min-width="130" show-overflow-tooltip />
                <el-table-column label="类型" min-width="120"><template slot-scope="scope">{{ typeName(scope.row.verifyType) }}</template></el-table-column>
                <el-table-column label="结果" width="80"><template slot-scope="scope"><el-tag :type="scope.row.passed ? 'success' : 'danger'" size="mini">{{ scope.row.passed ? '通过' : '失败' }}</el-tag></template></el-table-column>
                <el-table-column label="链上状态" width="120"><template slot-scope="scope">{{ chainWriteStatusText(scope.row) }}</template></el-table-column>
                <el-table-column label="时间" width="155"><template slot-scope="scope">{{ formatTime(scope.row.timestamp) }}</template></el-table-column>
              </el-table>
            </section>
          </el-col>
        </el-row>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import { getVerificationHealth, verifyMerkle, verifyGroth16, verifyThresholdSignature } from '@/api/verification'
import { getResourceList } from '@/api/resource'
import { VERIFY_TYPES, buildRecordKey, getOtherChain, getVerifyRecord, interchainQueryRecord, waitLastCallbackResult, writeVerifyRecord } from '@/api/trafficVerifyChain'

const HISTORY_KEY = 'wecross-verification-history'
const TYPE_BY_TAB = { merkle: 'MERKLE_ROOT', zkp: 'GROTH16_ZKP', threshold: 'THRESHOLD_SIGNATURE' }
const CHAIN_OPTIONS = ['bcos3', 'fabric']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const BINARY_CHUNK_SIZE = 64 * 1024
const TEXT_FILE_PATTERN = /\.(txt|csv|json|xml|log|md)$/i
export default {
  name: 'VerificationWorkbench',
  data() {
    const participants = (rule, value, callback) => {
      if (this.active !== 'threshold') return callback()
      const ids = this.participantIds(value)
      if (!ids.length) return callback(new Error('请输入参与节点编号'))
      if (ids.some(id => id < 1 || id > this.form.totalNodes)) return callback(new Error(`节点编号必须在 1 - ${this.form.totalNodes} 之间`))
      if (new Set(ids).size < this.form.threshold) return callback(new Error(`至少需要 ${this.form.threshold} 个不同参与节点`))
      callback()
    }
    return {
      active: 'merkle', lastActive: 'merkle', online: false, loading: false, resourceLoading: false, result: null, merkleResult: null, zkpResult: null, zkpWrittenChain: '', zkpWrittenRecordKey: '', thresholdResult: null, thresholdWrittenChain: '', thresholdWrittenRecordKey: '', importedZkp: false, history: [], resourceOptions: [], fileList: [], fileBlocks: [], fileInfo: '',
      businessIds: { merkle: '', zkp: '', threshold: '', signature: '' },
      chainZkpQueryLoading: false,
      chainZkpQuery: { businessId: '', zkpChain: 'bcos3' },
      chainZkpRecord: null,
      chainZkpRecordKey: '',
      signatureVerifyLoading: false,
      signatureVerifyForm: { businessId: '', zkpChain: 'bcos3', thresholdChain: 'fabric' },
      signatureVerifyResult: null,
      titles: { merkle: 'Merkle Root生成', zkp: '零知识证明ZKP', threshold: '门限阈值签名', signature: '签名验证' },
      form: this.newForm(),
      rules: {
        businessId: [{ required: true, message: '请输入业务标识', trigger: 'blur' }],
        dataText: [{ required: true, message: '请输入至少一个数据块', trigger: 'blur' }],
        participantText: [{ validator: participants, trigger: 'blur' }]
      }
    }
  },
  computed: {
    blocks() {
      if (this.form.inputMode === 'file') return this.fileBlocks
      return this.form.dataText.split(/\r?\n/).map(v => v.trim()).filter(Boolean)
    },
    maxIndex() { return Math.max(0, this.blocks.length - 1) },
    rootOptions() {
      if (!this.form.businessId) return []
      const seen = new Set()
      return this.history.reduce((options, record) => {
        const root = record.detail && record.detail.merkleRoot
        if (root && record.businessId === this.form.businessId && !seen.has(root)) {
          seen.add(root)
          options.push({ value: root, label: `${record.businessId} - ${root.slice(0, 16)}...` })
        }
        return options
      }, [])
    },
    prettyResult() { return JSON.stringify(this.result, null, 2) },
    chainZkpQueryFromChain() {
      return getOtherChain(this.chainZkpQuery.zkpChain || 'bcos3')
    },
    thresholdWriteChain() {
      return this.form.previousZkpChain ? getOtherChain(this.form.previousZkpChain) : ''
    },
    chainZkpRecordFields() {
      const record = this.chainZkpRecord || {}
      return [
        { label: 'businessId', value: record.businessId },
        { label: 'verifyType', value: record.verifyType },
        { label: 'recordId', value: record.recordId },
        { label: 'chain', value: record.chain },
        { label: 'status', value: record.status },
        { label: 'merkleRoot', value: record.merkleRoot },
        { label: 'proofHash', value: record.proofHash },
        { label: 'resultHash', value: record.resultHash },
        { label: 'dataHash', value: record.dataHash },
        { label: 'detailHash', value: record.detailHash },
        { label: 'createdAt', value: record.createdAt }
      ].filter(item => item.value != null && item.value !== '')
    },
    signatureZkpRecordFields() {
      return this.signatureRecordFields(this.signatureVerifyResult && this.signatureVerifyResult.zkpRecord)
    },
    signatureThresholdRecordFields() {
      return this.signatureRecordFields(this.signatureVerifyResult && this.signatureVerifyResult.thresholdRecord)
    },
    signatureCompareRows() {
      if (!this.signatureVerifyResult) return []
      if (!this.signatureVerifyResult.zkpRecord || !this.signatureVerifyResult.thresholdRecord) return []
      return this.buildSignatureCompareRows(this.signatureVerifyResult.zkpRecord, this.signatureVerifyResult.thresholdRecord)
    },
    values() {
      if (!this.result) return []
      const d = this.result.detail || {}
      const list = [{ label: 'Merkle Root', value: d.merkleRoot }, { label: '数据哈希', value: this.result.dataHash }, { label: '结果哈希', value: this.result.resultHash }, { label: '详情哈希', value: this.result.detailHash }]
      if (this.result.verifyType === 'GROTH16_ZKP') list.splice(1, 0, { label: '证明哈希', value: d.proofHash })
      if (this.result.verifyType === 'THRESHOLD_SIGNATURE') list.splice(1, 0, { label: '签名哈希', value: d.signatureHash }, { label: '聚合签名', value: d.signature })
      return list.filter(v => v.value)
    }
  },
  created() {
    this.loadHistory()
    getVerificationHealth().then(() => { this.online = true }).catch(() => { this.online = false })
  },
  methods: {
    newForm() { return { businessId: '', inputMode: 'manual', dataText: 'speed=40\nspeed=35\nspeed=42', sampleIndex: 1, merkleRoot: '', totalNodes: 5, threshold: 3, participantText: '1,2,3', writeOnChain: false, targetChains: [], zkpTargetChain: 'bcos3', previousZkpRecordId: '', previousZkpChain: '', previousZkpProofHash: '', previousZkpResultHash: '', previousZkpDataHash: '' } },
    generateBusinessId() {
      const businessId = `traffic-${Date.now()}`
      this.form.businessId = businessId
      this.businessIds[this.active] = businessId
    },
    onBusinessIdInput(value) {
      this.businessIds[this.active] = value
      if (this.active !== 'merkle') {
        this.form.merkleRoot = ''
      }
      if (this.active === 'threshold') {
        this.importedZkp = false
      }
    },
    copyBusinessId() {
      if (!this.form.businessId) {
        this.$message.warning('请先生成或输入业务标识')
        return
      }
      this.copy(this.form.businessId)
    },
    importChainZkpRecord() {
      if (!this.chainZkpRecord) {
        this.$message.warning('请先从链上查询 ZKP 结果')
        return
      }
      this.form.businessId = this.chainZkpRecord.businessId || ''
      this.form.merkleRoot = this.chainZkpRecord.merkleRoot || ''
      this.form.previousZkpRecordId = this.chainZkpRecord.recordId || ''
      this.form.previousZkpChain = this.chainZkpRecord.chain || ''
      this.form.previousZkpProofHash = this.chainZkpRecord.proofHash || ''
      this.form.previousZkpResultHash = this.chainZkpRecord.resultHash || ''
      this.form.previousZkpDataHash = this.chainZkpRecord.dataHash || ''
      this.businessIds.threshold = this.form.businessId
      this.importedZkp = true
      this.$message.success('已导入链上 ZKP 数据')
    },
    onMerkleRootChange() {
      if (this.active === 'threshold') {
        this.importedZkp = false
      }
    },
    onThresholdZkpFieldChange() {
      this.importedZkp = false
    },
    handleFileChange(file, fileList) {
      if (!file.raw) return
      if (file.raw.size > MAX_FILE_SIZE) {
        this.$message.error('文件不能超过10 MiB')
        this.fileList = []
        this.fileBlocks = []
        this.fileInfo = ''
        return
      }
      this.fileList = fileList.slice(-1)
      const reader = new FileReader()
      reader.onerror = () => this.$message.error('文件读取失败')
      reader.onload = event => {
        if (TEXT_FILE_PATTERN.test(file.name)) {
          this.fileBlocks = String(event.target.result).split(/\r?\n/).map(value => value.trim()).filter(Boolean)
        } else {
          const bytes = new Uint8Array(event.target.result)
          this.fileBlocks = []
          for (let offset = 0; offset < bytes.length; offset += BINARY_CHUNK_SIZE) {
            this.fileBlocks.push(this.bytesToBase64(bytes.subarray(offset, offset + BINARY_CHUNK_SIZE)))
          }
        }
        if (!this.fileBlocks.length) {
          this.$message.warning('文件中没有可用数据')
          return
        }
        this.form.sampleIndex = Math.min(this.form.sampleIndex, this.fileBlocks.length - 1)
        this.fileInfo = `${file.name}，${this.fileBlocks.length}个数据块，${this.formatBytes(file.raw.size)}`
      }
      if (TEXT_FILE_PATTERN.test(file.name)) reader.readAsText(file.raw, 'UTF-8')
      else reader.readAsArrayBuffer(file.raw)
    },
    handleFileRemove() {
      this.fileList = []
      this.fileBlocks = []
      this.fileInfo = ''
    },
    handleFileExceed() {
      this.$message.warning('一次只能选择一个文件，请先移除当前文件')
    },
    bytesToBase64(bytes) {
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 8192))
      }
      return btoa(binary)
    },
    formatBytes(size) {
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KiB`
      return `${(size / 1024 / 1024).toFixed(1)} MiB`
    },
    async loadResources() {
      this.resourceLoading = true
      try {
        const response = await getResourceList({ path: null, offset: 0, size: 1000 }, null)
        if (response.errorCode !== 0) throw new Error(response.message || '查询资源列表失败')
        this.resourceOptions = (response.data.resourceDetails || []).filter(resource => resource.path)
      } catch (error) {
        this.resourceOptions = []
        this.$message.warning('未能加载WeCross资源列表，请先在资源管理中注册合约或chaincode')
      } finally {
        this.resourceLoading = false
      }
    },
    handleResourceDropdown(visible) {
      if (visible && !this.resourceOptions.length && !this.resourceLoading) this.loadResources()
    },
    run() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.active === 'merkle' && !this.blocks.length) return this.$message.warning('请输入数据块或选择文件')
        if (this.active === 'merkle' && this.form.sampleIndex > this.maxIndex) return this.$message.warning('抽样索引不能超过数据块范围')
        if (this.active === 'zkp' && !this.ensureMerkleResultForCurrentInput()) return this.$message.warning('请先生成或选择当前业务标识对应的 Merkle Root')
        if (this.active !== 'merkle' && !/^[0-9a-fA-F]{64}$/.test(this.form.merkleRoot)) return this.$message.warning('请选择或输入64位十六进制Merkle Root')
        if (this.active === 'threshold' && this.form.writeOnChain && !this.thresholdWriteChain) return this.$message.warning('请先选择 ZKP 所在链')
        const payload = {
          businessId: this.form.businessId,
          writeOnChain: false,
          targetChains: []
        }
        if (this.active === 'merkle') Object.assign(payload, { dataBlocks: this.blocks, sampleIndex: this.form.sampleIndex })
        else payload.merkleRoot = this.active === 'zkp' ? this.merkleResult.merkleRoot : this.form.merkleRoot
        if (this.active === 'threshold') Object.assign(payload, { totalNodes: this.form.totalNodes, threshold: this.form.threshold, participantIds: this.participantIds(this.form.participantText) })
        const api = { merkle: verifyMerkle, zkp: verifyGroth16, threshold: verifyThresholdSignature }[this.active]
        this.loading = true
        try {
          this.result = this.withCurrentBusinessId(await api(payload))
          let chainWriteStatus = 'none'
          if (this.active === 'merkle') {
            this.merkleResult = this.buildMerkleResultState(this.result)
            this.form.merkleRoot = this.merkleResult.merkleRoot || ''
          } else if (this.active === 'zkp') {
            chainWriteStatus = await this.handleZkpChainWrite(this.result)
          } else if (this.active === 'threshold') {
            chainWriteStatus = await this.handleThresholdChainWrite(this.result)
          }
          this.result = this.withChainWriteStatus(this.result, chainWriteStatus)
          this.addHistory(this.result)
          if (!((this.active === 'zkp' || this.active === 'threshold') && chainWriteStatus !== 'none')) {
            this.$message.success('链下验证运行完成')
          }
        } catch (error) {
          console.error('[offline verification run]', error)
          this.$message.error(this.getErrorMessage(error, '链下验证运行失败'))
        } finally { this.loading = false }
      })
    },
    buildMerkleResultState(result) {
      const detail = result && result.detail ? result.detail : {}
      return {
        businessId: this.currentBusinessId(result),
        recordId: result && result.recordId,
        merkleRoot: detail.merkleRoot || '',
        dataHash: result && result.dataHash,
        resultHash: result && result.resultHash,
        detailHash: result && result.detailHash,
        createdAt: result && result.timestamp ? result.timestamp : new Date().toISOString(),
        status: result && result.passed ? 'PASS' : 'FAIL'
      }
    },
    ensureMerkleResultForCurrentInput() {
      if (this.merkleResult && this.merkleResult.businessId === this.form.businessId && this.merkleResult.merkleRoot === this.form.merkleRoot) {
        return true
      }
      const record = this.history.find(item => {
        const detail = item.detail || {}
        return item.verifyType === 'MERKLE_ROOT' && item.businessId === this.form.businessId && detail.merkleRoot === this.form.merkleRoot
      })
      if (!record) {
        return false
      }
      this.merkleResult = this.buildMerkleResultState(record)
      return true
    },
    async handleZkpChainWrite(result) {
      const selectedChain = this.form.zkpTargetChain || 'bcos3'
      const zkpRecord = this.buildZkpRecordState(result, selectedChain)
      this.zkpResult = zkpRecord
      this.zkpWrittenChain = ''
      this.zkpWrittenRecordKey = ''

      if (!this.form.writeOnChain) {
        return 'none'
      }

      try {
        const txResult = await writeVerifyRecord(selectedChain, zkpRecord.businessId, VERIFY_TYPES.ZKP, zkpRecord)
        this.assertTxSuccess(txResult, 'ZKP 结果写链')
        await this.waitVerifyRecordAvailable(selectedChain, zkpRecord.businessId, VERIFY_TYPES.ZKP)
        this.zkpWrittenChain = selectedChain
        this.zkpWrittenRecordKey = buildRecordKey(zkpRecord.businessId, VERIFY_TYPES.ZKP)
        this.$message.success('ZKP 结果已成功写入 ' + selectedChain)
        return selectedChain
      } catch (error) {
        console.error('[ZKP writeVerifyRecord]', error)
        this.$message.error(this.getErrorMessage(error, 'ZKP 结果写入区块链失败'))
        return 'writeFailed'
      }
    },
    buildZkpRecordState(result, selectedChain) {
      const detail = result && result.detail ? result.detail : {}
      return {
        businessId: this.currentBusinessId(result),
        verifyType: VERIFY_TYPES.ZKP,
        recordId: result && result.recordId,
        chain: selectedChain,
        algorithm: result && result.algorithm,
        createdAt: result && result.timestamp ? result.timestamp : new Date().toISOString(),
        status: result && result.passed ? 'PASS' : 'FAIL',
        merkleRoot: this.merkleResult ? this.merkleResult.merkleRoot : detail.merkleRoot,
        proofHash: detail.proofHash,
        dataHash: result && result.dataHash,
        resultHash: result && result.resultHash,
        detailHash: result && result.detailHash,
        previousMerkleRecordId: this.merkleResult && this.merkleResult.recordId
      }
    },
    async handleThresholdChainWrite(result) {
      const writeChain = this.thresholdWriteChain
      const thresholdRecord = this.buildThresholdRecordState(result, writeChain)
      this.thresholdResult = thresholdRecord
      this.thresholdWrittenChain = ''
      this.thresholdWrittenRecordKey = ''

      if (!this.form.writeOnChain) {
        return 'none'
      }

      try {
        const txResult = await writeVerifyRecord(writeChain, thresholdRecord.businessId, VERIFY_TYPES.THRESHOLD_SIGNATURE, thresholdRecord)
        this.assertTxSuccess(txResult, '门限阈值签名结果写链')
        await this.waitVerifyRecordAvailable(writeChain, thresholdRecord.businessId, VERIFY_TYPES.THRESHOLD_SIGNATURE)
        this.thresholdWrittenChain = writeChain
        this.thresholdWrittenRecordKey = buildRecordKey(thresholdRecord.businessId, VERIFY_TYPES.THRESHOLD_SIGNATURE)
        this.$message.success('门限阈值签名结果已成功写入 ' + writeChain)
        return writeChain
      } catch (error) {
        console.error('[Threshold writeVerifyRecord]', error)
        this.$message.error(this.getErrorMessage(error, '门限阈值签名结果写入区块链失败'))
        return 'writeFailed'
      }
    },
    buildThresholdRecordState(result, writeChain) {
      const detail = result && result.detail ? result.detail : {}
      const previousZkp = this.importedZkp && this.chainZkpRecord ? this.chainZkpRecord : {}
      const previousZkpChain = previousZkp.chain || this.form.previousZkpChain || ''
      return {
        businessId: this.currentBusinessId(result),
        verifyType: VERIFY_TYPES.THRESHOLD_SIGNATURE,
        recordId: result && result.recordId,
        chain: writeChain,
        algorithm: result && result.algorithm,
        createdAt: result && result.timestamp ? result.timestamp : new Date().toISOString(),
        status: result && result.passed ? 'PASS' : 'FAIL',
        merkleRoot: this.form.merkleRoot,
        signatureHash: detail.signatureHash,
        aggregateSignature: detail.aggregateSignature || detail.signature,
        dataHash: result && result.dataHash,
        resultHash: result && result.resultHash,
        detailHash: result && result.detailHash,
        previousZkpRecordId: previousZkp.recordId || this.form.previousZkpRecordId || '',
        previousZkpChain,
        previousZkpProofHash: previousZkp.proofHash || this.form.previousZkpProofHash || '',
        previousZkpResultHash: previousZkp.resultHash || this.form.previousZkpResultHash || '',
        previousZkpDataHash: previousZkp.dataHash || this.form.previousZkpDataHash || ''
      }
    },
    withChainWriteStatus(record, status) {
      return Object.assign({}, record, { chainWriteStatus: status || 'none' })
    },
    withCurrentBusinessId(record) {
      if (!record) return record
      return Object.assign({}, record, { businessId: this.currentBusinessId(record) })
    },
    currentBusinessId(record) {
      return this.form.businessId || (record && record.businessId) || ''
    },
    chainWriteStatusText(record) {
      if (!record || !record.chainWriteStatus || record.chainWriteStatus === 'none') return '未写链'
      if (record.chainWriteStatus === 'writeFailed') return '写链失败'
      if (record.chainWriteStatus === 'querySuccess') return '跨链查询成功'
      if (record.chainWriteStatus === 'queryFailed') return '跨链查询失败'
      return '已写入 ' + record.chainWriteStatus
    },
    buildChainQueryHistoryRecord(businessId, verifyType, success, record) {
      return {
        recordId: `chain-query-${verifyType}-${businessId}-${Date.now()}`,
        businessId,
        verifyType,
        passed: success,
        timestamp: new Date().toISOString(),
        detail: { merkleRoot: record && record.merkleRoot },
        chainWriteStatus: success ? 'querySuccess' : 'queryFailed'
      }
    },
    getErrorMessage(error, fallback) {
      const data = error && error.response && error.response.data
      const message = data && (data.message || data.error || data.msg)
      if (typeof message === 'string' && message.trim()) return message
      if (error && typeof error.message === 'string' && error.message.trim()) return error.message
      return fallback
    },
    async waitVerifyRecordAvailable(chain, businessId, verifyType) {
      const maxRetry = 10
      const interval = 1000

      for (let retry = 0; retry < maxRetry; retry++) {
        const result = await getVerifyRecord(chain, businessId, verifyType)
        if (result.exists) {
          return result
        }
        if (retry < maxRetry - 1) {
          await this.delay(interval)
        }
      }

      const title = verifyType === VERIFY_TYPES.THRESHOLD_SIGNATURE ? '门限阈值签名' : 'ZKP'
      throw new Error(title + ' 写入交易已提交，但链上结果暂未可查询，请稍后再试')
    },
    delay(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms)
      })
    },
    prepareChainZkpQuery() {
      this.chainZkpQuery.zkpChain = this.zkpWrittenChain || this.chainZkpQuery.zkpChain || 'bcos3'
    },
    async queryChainZkpRecord() {
      const businessId = String(this.chainZkpQuery.businessId || this.form.businessId || '').trim()
      const targetChain = this.chainZkpQuery.zkpChain || this.zkpWrittenChain || 'bcos3'
      const fromChain = getOtherChain(targetChain)

      if (!businessId) {
        this.$message.warning('请输入要查询的业务标识')
        return
      }

      this.chainZkpQueryLoading = true
      try {
        this.$message.info('正在发起跨链查询')
        const txResult = await interchainQueryRecord(fromChain, targetChain, businessId, VERIFY_TYPES.ZKP)
        this.assertTxSuccess(txResult, '链上 ZKP 跨链查询')
        this.$message.info('正在等待回调结果')
        const result = await waitLastCallbackResult(fromChain, {
          recordKey: buildRecordKey(businessId, VERIFY_TYPES.ZKP)
        })
        if (result.exists) {
          this.chainZkpRecord = result.record
          this.chainZkpRecordKey = result.recordKey
          this.addHistory(this.buildChainQueryHistoryRecord(businessId, VERIFY_TYPES.ZKP, true, result.record))
          this.$message.success('查询成功')
        } else {
          this.chainZkpRecord = null
          this.chainZkpRecordKey = ''
          this.addHistory(this.buildChainQueryHistoryRecord(businessId, VERIFY_TYPES.ZKP, false, null))
          this.$message.error('查询失败：未查询到 ZKP 链上结果')
        }
      } catch (error) {
        console.error('[chain ZKP query]', error)
        this.chainZkpRecord = null
        this.chainZkpRecordKey = ''
        this.addHistory(this.buildChainQueryHistoryRecord(businessId, VERIFY_TYPES.ZKP, false, null))
        this.$message.error('查询失败：' + this.getErrorMessage(error, '链上 ZKP 查询失败'))
      } finally {
        this.chainZkpQueryLoading = false
      }
    },
    getOtherChainName(chain) {
      return chain ? getOtherChain(chain) : ''
    },
    resetSignatureVerify() {
      this.signatureVerifyForm = { businessId: '', zkpChain: 'bcos3', thresholdChain: 'fabric' }
      this.signatureVerifyResult = null
    },
    async executeSignatureVerify() {
      const businessId = String(this.signatureVerifyForm.businessId || '').trim()
      const zkpChain = this.signatureVerifyForm.zkpChain
      const thresholdChain = this.signatureVerifyForm.thresholdChain

      if (!businessId) {
        this.$message.warning('请输入业务标识')
        return
      }
      if (!CHAIN_OPTIONS.includes(zkpChain) || !CHAIN_OPTIONS.includes(thresholdChain)) {
        this.$message.warning('请选择正确的链')
        return
      }
      if (zkpChain === thresholdChain) {
        this.$message.warning('ZKP 所在链和门限签名所在链不能相同')
        return
      }

      this.signatureVerifyLoading = true
      try {
        const zkpResult = await this.queryRecordByInterchain(zkpChain, businessId, VERIFY_TYPES.ZKP, 'ZKP')
        const thresholdResult = await this.queryRecordByInterchain(thresholdChain, businessId, VERIFY_TYPES.THRESHOLD_SIGNATURE, '门限签名')

        if (!zkpResult.exists || !thresholdResult.exists) {
          const errors = []
          if (!zkpResult.exists) errors.push('未查询到 ZKP 链上记录')
          if (!thresholdResult.exists) errors.push('未查询到门限签名链上记录')
          this.addHistory(this.buildChainQueryHistoryRecord(businessId, 'SIGNATURE_VERIFY', false, null))
          this.signatureVerifyResult = {
            verified: false,
            message: '链上数据不完整',
            errors,
            matchedFields: [],
            zkpRecord: zkpResult.record,
            thresholdRecord: thresholdResult.record
          }
          this.$message.error('链上数据不完整')
          return
        }

        const compareResult = this.compareZkpAndThreshold(zkpResult.record, thresholdResult.record)
        this.signatureVerifyResult = compareResult
        this.addHistory(this.buildChainQueryHistoryRecord(businessId, 'SIGNATURE_VERIFY', true, zkpResult.record))
        if (compareResult.verified) {
          this.$message.success(compareResult.message)
        } else {
          this.$message.error(compareResult.message)
        }
      } catch (error) {
        console.error('[signature verify]', error)
        const message = this.getErrorMessage(error, '签名验证失败')
        this.addHistory(this.buildChainQueryHistoryRecord(businessId, 'SIGNATURE_VERIFY', false, null))
        this.signatureVerifyResult = {
          verified: false,
          message,
          errors: [message],
          matchedFields: [],
          zkpRecord: null,
          thresholdRecord: null
        }
        this.$message.error('查询失败：' + message)
      } finally {
        this.signatureVerifyLoading = false
      }
    },
    async queryRecordByInterchain(targetChain, businessId, verifyType, title) {
      const fromChain = getOtherChain(targetChain)
      this.$message.info('正在发起跨链查询')
      const txResult = await interchainQueryRecord(fromChain, targetChain, businessId, verifyType)
      this.assertTxSuccess(txResult, title + ' 跨链查询')
      this.$message.info('正在等待回调结果')
      const result = await waitLastCallbackResult(fromChain, {
        recordKey: buildRecordKey(businessId, verifyType)
      })
      if (result.exists) {
        this.$message.success(title + ' 查询成功')
      } else {
        this.$message.error(title + ' 查询失败')
      }
      return result
    },
    compareZkpAndThreshold(zkpRecord, thresholdRecord) {
      const rows = this.buildSignatureCompareRows(zkpRecord, thresholdRecord)
      const matchedFields = rows.filter(row => row.matched).map(row => row.key)
      const errors = rows.filter(row => !row.matched).map(row => row.error)
      const verified = errors.length === 0
      return {
        verified,
        message: verified ? '签名验证通过' : '签名验证失败',
        errors,
        matchedFields,
        zkpRecord,
        thresholdRecord
      }
    },
    buildSignatureCompareRows(zkpRecord, thresholdRecord) {
      const zkp = zkpRecord || {}
      const threshold = thresholdRecord || {}
      const zkpChain = this.signatureVerifyForm.zkpChain
      const rows = []
      const addRow = (key, label, zkpValue, thresholdValue, matched, error) => {
        rows.push({
          key,
          label,
          zkpValue: this.displayValue(zkpValue),
          thresholdValue: this.displayValue(thresholdValue),
          matched,
          error
        })
      }

      addRow('businessId', '业务标识', zkp.businessId, threshold.businessId, zkp.businessId === threshold.businessId, '业务标识不一致')
      addRow('zkpStatus', 'ZKP 状态', zkp.status, 'PASS', zkp.status === 'PASS', 'ZKP 状态不是 PASS')
      addRow('thresholdStatus', '门限签名状态', 'PASS', threshold.status, threshold.status === 'PASS', '门限签名状态不是 PASS')
      addRow('merkleRoot', 'Merkle Root', zkp.merkleRoot, threshold.merkleRoot, zkp.merkleRoot === threshold.merkleRoot, 'Merkle Root 不一致')
      addRow('previousZkpRecordId', 'ZKP 记录 ID', zkp.recordId, threshold.previousZkpRecordId, threshold.previousZkpRecordId === zkp.recordId, '门限签名引用的 ZKP 记录 ID 不一致')
      const expectedZkpChain = zkp.chain || zkpChain
      addRow('previousZkpChain', 'ZKP 所在链', expectedZkpChain, threshold.previousZkpChain, threshold.previousZkpChain === expectedZkpChain || threshold.previousZkpChain === zkpChain, '门限签名引用的 ZKP 所在链不一致')
      addRow('previousZkpProofHash', 'ZKP 证明哈希', zkp.proofHash, threshold.previousZkpProofHash, threshold.previousZkpProofHash === zkp.proofHash, '门限签名引用的 ZKP 证明哈希不一致')
      addRow('previousZkpResultHash', 'ZKP 结果哈希', zkp.resultHash, threshold.previousZkpResultHash, threshold.previousZkpResultHash === zkp.resultHash, '门限签名引用的 ZKP 结果哈希不一致')
      if (zkp.dataHash || threshold.previousZkpDataHash) {
        addRow('previousZkpDataHash', 'ZKP 数据哈希', zkp.dataHash, threshold.previousZkpDataHash, threshold.previousZkpDataHash === zkp.dataHash, '门限签名引用的 ZKP 数据哈希不一致')
      }
      return rows
    },
    signatureRecordFields(record) {
      const current = record || {}
      return [
        { label: 'businessId', value: current.businessId },
        { label: 'verifyType', value: current.verifyType },
        { label: 'recordId', value: current.recordId },
        { label: 'chain', value: current.chain },
        { label: 'status', value: current.status },
        { label: 'merkleRoot', value: current.merkleRoot },
        { label: 'proofHash', value: current.proofHash },
        { label: 'signatureHash', value: current.signatureHash },
        { label: 'aggregateSignature', value: current.aggregateSignature },
        { label: 'dataHash', value: current.dataHash },
        { label: 'resultHash', value: current.resultHash },
        { label: 'detailHash', value: current.detailHash },
        { label: 'previousZkpRecordId', value: current.previousZkpRecordId },
        { label: 'previousZkpChain', value: current.previousZkpChain },
        { label: 'previousZkpProofHash', value: current.previousZkpProofHash },
        { label: 'previousZkpResultHash', value: current.previousZkpResultHash },
        { label: 'previousZkpDataHash', value: current.previousZkpDataHash },
        { label: 'createdAt', value: current.createdAt }
      ].filter(item => item.value != null && item.value !== '')
    },
    displayValue(value) {
      return value == null || value === '' ? '-' : String(value)
    },
    assertTxSuccess(result, title) {
      if (result && result.success) return
      const error = new Error(title + '失败')
      error.result = result
      throw error
    },
    participantIds(value) { return String(value || '').split(',').map(v => Number(v.trim())).filter(Number.isInteger) },
    reset() {
      this.businessIds[this.active] = ''
      this.form = this.newForm()
      this.result = null
      this.fileList = []
      this.fileBlocks = []
      this.fileInfo = ''
      this.$nextTick(() => this.$refs.form.clearValidate())
    },
    typeName(type) { return { MERKLE_ROOT: 'Merkle Root', GROTH16_ZKP: '零知识证明 ZKP', THRESHOLD_SIGNATURE: '门限阈值签名', SIGNATURE_VERIFY: '签名验证' }[type] || type },
    formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' },
    copy(value) { navigator.clipboard.writeText(String(value)).then(() => this.$message.success('已复制')).catch(() => this.$message.warning('请手动选择文本复制')) },
    addHistory(record) { this.history = [record, ...this.history.filter(v => v.recordId !== record.recordId)].slice(0, 20); localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history)) },
    loadHistory() {
      try {
        this.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      } catch (error) {
        this.history = []
      }
      this.showLatest()
    },
    showLatest() { this.result = this.history.find(v => v.verifyType === TYPE_BY_TAB[this.active]) || null },
    handleTabClick() {
      this.businessIds[this.lastActive] = this.form.businessId
      this.form.businessId = this.businessIds[this.active] || ''
      this.form.merkleRoot = ''
      this.lastActive = this.active
      this.showLatest()
      if (this.active === 'threshold') this.prepareChainZkpQuery()
      if (this.active !== 'merkle' && this.active !== 'signature' && !this.form.merkleRoot && this.rootOptions.length) this.form.merkleRoot = this.rootOptions[0].value
    },
    selectRecord(row) { this.result = row; this.active = Object.keys(TYPE_BY_TAB).find(key => TYPE_BY_TAB[key] === row.verifyType) || this.active },
    clearHistory() { this.history = []; this.result = null; localStorage.removeItem(HISTORY_KEY) }
  }
}
</script>

<style lang="scss" scoped>
.verification-shell {
  min-height: calc(100vh - 124px);
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
.verification-shell::v-deep .el-card__body { padding: 20px 20px 22px; }
.page-header, .section-title { display: flex; align-items: center; justify-content: space-between; }
.page-header { margin-bottom: 16px; }
.page-header h2, h3 { margin: 0; letter-spacing: 0; }
.page-header h2 { color: #303133; font-size: 16px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: #909399; font-size: 14px; }
.form-panel, .result-panel, .history-panel { padding: 4px 2px; }
.form-panel h3, .section-title { margin-bottom: 18px; }
.form-panel::v-deep .el-input-group__append .el-button + .el-button {
  padding-left: 12px;
  margin-left: 10px;
  border-left: 1px solid #dcdfe6;
}
.threshold-source-tip { margin-bottom: 14px; }
.result-panel, .history-panel { padding-left: 18px; border-left: 1px solid #ebeef5; }
.history-panel { margin-top: 22px; }
.hint { margin-left: 10px; color: #909399; font-size: 13px; }
.resource-hint { margin: 6px 0 0; line-height: 20px; }
.resource-type { float: right; margin-left: 16px; color: #909399; font-size: 12px; }
.result-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; border: 1px solid #ebeef5; border-bottom: 0; }
.result-meta div { display: grid; grid-template-columns: 82px minmax(0, 1fr); min-height: 38px; border-bottom: 1px solid #ebeef5; }
.result-meta div:nth-child(odd):not(.wide) { border-right: 1px solid #ebeef5; }
.result-meta .wide { grid-column: 1 / -1; }
.result-meta dt, .result-meta dd { display: flex; align-items: center; margin: 0; padding: 8px 10px; overflow-wrap: anywhere; }
.result-meta dt { background: #f5f7fa; color: #909399; font-size: 13px; }
.result-meta dd { color: #303133; font-size: 13px; }.values { margin: 16px 0; border-top: 1px solid #ebeef5; }
.value-row { display: grid; grid-template-columns: 100px minmax(0, 1fr) 34px; align-items: center; min-height: 46px; border-bottom: 1px solid #ebeef5; }
.value-row span { color: #606266; font-size: 13px; }
code { overflow-wrap: anywhere; color: #1f5d8f; font: 12px Consolas, monospace; }
pre { max-height: 310px; margin: 0; padding: 14px; overflow: auto; background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; font: 12px/1.6 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.chain-zkp-query-panel { padding: 12px 14px 10px; margin-bottom: 16px; background: #f5f7fa; border: 1px solid #ebeef5; border-radius: 4px; }
.chain-zkp-query-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.chain-zkp-query-panel__title { color: #303133; font-size: 14px; font-weight: 600; line-height: 22px; }
.chain-zkp-query-form::v-deep .el-form-item { margin-bottom: 10px; }
.chain-zkp-query-form::v-deep .el-button { width: 100%; }
.chain-zkp-record { margin-top: 8px; }
.chain-zkp-record__key { margin-bottom: 8px; color: #606266; font-size: 13px; line-height: 20px; }
.chain-zkp-record dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; border-top: 1px solid #ebeef5; border-left: 1px solid #ebeef5; }
.chain-zkp-record div { min-width: 0; border-right: 1px solid #ebeef5; border-bottom: 1px solid #ebeef5; }
.chain-zkp-record dt, .chain-zkp-record dd { margin: 0; padding: 7px 8px; overflow-wrap: anywhere; }
.chain-zkp-record dt { background: #ffffff; color: #909399; font-size: 12px; }
.chain-zkp-record dd { color: #303133; font-size: 12px; }
.signature-route-hint { margin: -4px 0 16px; line-height: 20px; }
.verify-error-list { margin: 12px 0 0; padding-left: 18px; color: #f56c6c; font-size: 13px; line-height: 22px; }
.signature-record-grid { margin-top: 14px; }
.signature-record-block h4 { margin: 0 0 8px; color: #303133; font-size: 13px; font-weight: 600; }
.signature-record-block dl { margin: 0; border-top: 1px solid #ebeef5; border-left: 1px solid #ebeef5; }
.signature-record-block div { display: grid; grid-template-columns: 112px minmax(0, 1fr); min-width: 0; border-right: 1px solid #ebeef5; border-bottom: 1px solid #ebeef5; }
.signature-record-block dt, .signature-record-block dd { margin: 0; padding: 7px 8px; overflow-wrap: anywhere; }
.signature-record-block dt { background: #f5f7fa; color: #909399; font-size: 12px; }
.signature-record-block dd { color: #303133; font-size: 12px; }
.signature-compare-table { margin-top: 16px; }
.signature-stacked-layout::v-deep .el-col-lg-10,
.signature-stacked-layout::v-deep .el-col-lg-14 {
  width: 100%;
}
.signature-stacked-layout .result-panel {
  margin-top: 20px;
  padding-left: 0;
  border-left: 0;
  border-top: 1px solid #ebeef5;
  padding-top: 18px;
}
@media (max-width: 1199px) { .result-panel, .history-panel { margin-top: 24px; padding-left: 0; border-left: 0; } }
@media (max-width: 991px) { .signature-stacked-layout .signature-record-grid::v-deep .el-col + .el-col { margin-top: 14px; } }
</style>

