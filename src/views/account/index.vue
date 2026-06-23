<template>
  <transition name="el-fade-in-linear">
    <div v-show="show" class="app-container">
      <el-card class="box">
        <div class="account-card-header">
          <div>
            <div class="account-card-title">
              <span>链上身份与凭证</span>
              <!-- <el-tooltip id="accountHelp" effect="light" content="如何使用？" placement="top">
                <el-button type="text" size="mini" class="account-help-button" @click="howToUse">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip> -->
            </div>
            <div class="account-card-desc">管理平台身份，以及用于不同区块链网络签名的账户凭证</div>
          </div>
          <el-button id="addChainAccount" type="primary" @click="addChainAccountDrawer.show=true">添加链上凭证</el-button>
        </div>
        <div class="platform-identity">
          <div class="section-title">平台身份</div>
          <div class="identity-summary-row">
            <div class="identity-item">
              <span class="identity-label">身份名称</span>
              <el-tag id="UA" :type="ua.admin ? 'warning': 'success'"><span>{{ ua.username }}</span></el-tag>
            </div>
            <div id="uaPK" class="identity-public-key">
              <span class="identity-label">身份公钥</span>
              <div class="public-key-box">
                <el-tooltip effect="light" :content="ua.pubKey" placement="top">
                  <span class="public-key-text">{{ ua.pubKey }}</span>
                </el-tooltip>
                <el-tooltip effect="light" content="复制身份公钥">
                  <clipboard :input-data="ua.pubKey" />
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
        <div class="credentials-panel">
          <div class="credentials-section-header">
            <div class="section-title">区块链签名凭证</div>
            <div class="section-desc">仅展示凭证摘要，完整证书、地址和密钥信息可在详情中查看</div>
          </div>
          <el-table
            id="chainAccountTable"
            class="credential-table"
            :data="chainAccountTable"
            style="width: 100%"
            tooltip-effect="light"
            row-key="id"
            lazy
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            @row-click="showChainAccount"
          >
            <el-table-column label="" width="30px" />
            <el-table-column prop="type" label="底层链类型" width="190">
              <template slot-scope="scope">
                <el-tooltip effect="light" content="点击查看详情" placement="top">
                  <el-tag type="info">{{ scope.row.type }}</el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="keyID" label="凭证标识" width="130">
              <template slot-scope="scope">
                <el-tooltip effect="light" content="点击查看详情" placement="top">
                  <div>{{ scope.row.keyID }}</div>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column label="身份摘要" min-width="360" show-overflow-tooltip>
              <template slot-scope="scope">
                <el-tooltip effect="light" content="点击查看详情" placement="top">
                  <span>{{ getCredentialSummary(scope.row) }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column label="凭证状态" width="130" align="center" header-align="center">
              <template slot-scope="scope">
                <el-tooltip effect="light" content="点击查看详情" placement="top">
                  <el-tag :type="scope.row.isDefault ? 'success' : 'info'">
                    {{ scope.row.isDefault ? '默认凭证' : '普通凭证' }}
                  </el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
      <el-drawer
        :visible.sync="chainAccountDrawer.show"
        :direction="chainAccountDrawer.direction"
        :with-header="false"
        size="680px"
      >
        <el-card class="credential-drawer-card">
          <div slot="header" class="clearfix">
            <span> 链上凭证详情 </span>
            <i class="el-icon-close" style="float:right;cursor:pointer" @click="chainAccountDrawer.show = false" />
          </div>
          <div class="credential-drawer__body">
            <div class="credential-summary-box">
              <div class="credential-summary-label">凭证标识</div>
              <div class="credential-summary-label">底层链类型</div>
              <div class="credential-summary-label">凭证状态</div>
              <div class="credential-summary-value">{{ chainAccountDrawer.info.keyID }}</div>
              <div class="credential-summary-value">
                <el-tag type="info">{{ chainAccountDrawer.info.type }}</el-tag>
              </div>
              <div class="credential-summary-value">
                <el-tag :type="chainAccountDrawer.info.isDefault ? 'success' : 'info'">
                  {{ chainAccountDrawer.info.isDefault ? '默认凭证' : '普通凭证' }}
                </el-tag>
              </div>
            </div>
            <el-form class="credential-detail-form" label-position="top" size="small" label-width="80px">
              <el-form-item>
                <div slot="label" class="credential-field-label">
                  <div>
                    <span>{{ getIdentityLabel(chainAccountDrawer.info.type) }}</span>
                    <div class="credential-field-desc">{{ getIdentityDescription(chainAccountDrawer.info.type) }}</div>
                  </div>
                  <el-button type="text" size="mini" @click.stop="copyCredentialText(chainAccountDrawer.info.identity, $event)">复制</el-button>
                </div>
                <el-input v-model="chainAccountDrawer.info.identity" type="textarea" :rows="5" readonly resize="none" />
              </el-form-item>
              <el-form-item>
                <div slot="label" class="credential-field-label">
                  <span>公钥</span>
                  <el-button type="text" size="mini" @click.stop="copyCredentialText(chainAccountDrawer.info.pubKey, $event)">复制</el-button>
                </div>
                <el-input v-model="chainAccountDrawer.info.pubKey" type="textarea" :rows="5" readonly resize="none" />
              </el-form-item>
              <el-form-item>
                <div slot="label" class="credential-field-label">
                  <span>私钥</span>
                  <el-button v-if="chainAccountDrawer.showSec && chainAccountDrawer.show" type="text" size="mini" @click.stop="copyCredentialText(chainAccountDrawer.info.secKey, $event)">复制</el-button>
                </div>
                <el-alert
                  title="私钥属于敏感身份凭证，请勿复制、截屏或泄露"
                  type="warning"
                  :closable="false"
                  show-icon
                />
                <el-button v-if="!chainAccountDrawer.showSec" size="mini" class="private-key-button" @click="confirmShowPrivateKey">查看私钥</el-button>
                <el-button v-else size="mini" class="private-key-button" @click="chainAccountDrawer.showSec = false">隐藏私钥</el-button>
                <el-input v-if="chainAccountDrawer.showSec && chainAccountDrawer.show" v-model="chainAccountDrawer.info.secKey" type="textarea" :rows="5" readonly show-password resize="none" class="private-key-input" />
              </el-form-item>
              <el-form-item>
                <div slot="label" class="credential-field-label">
                  <span>扩展信息</span>
                  <el-button v-if="chainAccountDrawer.info.ext" type="text" size="mini" @click.stop="copyCredentialText(chainAccountDrawer.info.ext, $event)">复制</el-button>
                </div>
                <el-input v-if="chainAccountDrawer.info.ext" v-model="chainAccountDrawer.info.ext" type="textarea" :rows="5" readonly resize="none" />
                <div v-else class="credential-empty-text">暂无扩展信息</div>
              </el-form-item>
            </el-form>
          </div>
          <div class="credential-drawer__footer">
            <el-button
              v-if="!chainAccountDrawer.info.isDefault"
              type="primary"
              @click="querySetDefaultAccount()"
            >设为默认凭证</el-button>
            <el-button
              type="danger"
              @click="queryRemoveChainAccount()"
            >删除凭证</el-button>
            <el-button @click="chainAccountDrawer.show = false">关闭</el-button>
          </div>
        </el-card>
      </el-drawer>
      <el-drawer
        :visible.sync="addChainAccountDrawer.show"
        :direction="addChainAccountDrawer.direction"
        :with-header="false"
        size="680px"
      >
        <el-card class="add-credential-drawer-card">
          <div slot="header" class="clearfix">
            <span> 添加链上凭证 </span>
            <i class="el-icon-close" style="float:right;cursor:pointer" @click="addChainAccountDrawer.show = false" />
          </div>
          <el-alert
            class="add-credential-alert"
            title="用于创建或导入区块链签名凭证。密钥生成、上传和提交逻辑保持不变"
            type="info"
            :closable="false"
            show-icon
          />
          <el-form ref="addChainAccountDrawer" label-position="top" size="small" :rules="addChainAccountDrawerRules" :model="addChainAccountDrawer.params">
            <el-form-item prop="type">
              <label><div><span>链凭证类型</span></div></label>
              <el-select
                v-model="addChainAccountDrawer.params.type"
                style="width:200px;margin-top:10px"
                placeholder="请选择链凭证类型"
                @change="clearChainAccountDrawerParams()"
              >
                <!-- <el-option label="FISCO BCOS 2.0" value="BCOS2.0" /> -->
                <!-- <el-option label="FISCO BCOS 2.0 国密" value="GM_BCOS2.0" /> -->
                <el-option label="FISCO BCOS 3.0" value="BCOS3_ECDSA_EVM" />
                <!-- <el-option label="FISCO BCOS 3.0 国密" value="BCOS3_GM_EVM" /> -->
                <el-option label="HyperLedger Fabric 1.4" value="Fabric1.4" />
                <!-- <el-option label="HyperLedger Fabric 2.0" value="Fabric2.0" /> -->
              </el-select>
            </el-form-item>

            <!-- FIXME: reuse div -->
            <div v-if="addChainAccountDrawer.params.type === 'BCOS2.0'">
              <el-form-item prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadECDSASecPemHandler"
                  :auto-upload="true"
                >
                  <el-button-group slot="trigger">
                    <el-button type="primary">上传</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      @click.stop="generateECDSASecPem()"
                    >生成</el-button>
                  </el-button-group>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  :change="buildECDSAData()"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  style="margin-top:10px"
                  autosize
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.pubKey) !== 'undefined'" prop="pubKey">
                <label>
                  <span>公钥</span>
                </label>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  readonly
                  type="textarea"
                  :rows="2"
                  placeholder=""
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.ext) !== 'undefined'" label="address">
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  readonly
                  placeholder=""
                  clearable
                />
              </el-form-item>

            </div>

            <div v-if="addChainAccountDrawer.params.type === 'BCOS3_ECDSA_EVM'">
              <el-form-item prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadECDSASecPemHandler"
                  :auto-upload="true"
                >
                  <el-button-group slot="trigger">
                    <el-button type="primary">上传</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      @click.stop="generateECDSASecPem()"
                    >生成</el-button>
                  </el-button-group>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  :change="buildECDSAData()"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  style="margin-top:10px"
                  autosize
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.pubKey) !== 'undefined'" prop="pubKey">
                <label>
                  <span>公钥</span>
                </label>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  readonly
                  type="textarea"
                  :rows="2"
                  placeholder=""
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.ext) !== 'undefined'" label="address">
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  readonly
                  placeholder=""
                  clearable
                />
              </el-form-item>

            </div>

            <div v-if="addChainAccountDrawer.params.type === 'GM_BCOS2.0'">
              <el-form-item prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadSM2SecPemHandler"
                  :auto-upload="true"
                >
                  <el-button-group slot="trigger">
                    <el-button type="primary">上传</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      @click.stop="generateSM2SecPem()"
                    >生成</el-button>
                  </el-button-group>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  :change="buildSM2Data()"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.pubKey) !== 'undefined'" prop="pubKey">
                <label>
                  <span>公钥</span>
                </label>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  readonly
                  type="textarea"
                  :rows="2"
                  placeholder=""
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.ext) !== 'undefined'" label="address">
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  readonly
                  placeholder=""
                  clearable
                />
              </el-form-item>
            </div>

            <div v-if="addChainAccountDrawer.params.type === 'BCOS3_GM_EVM'">
              <el-form-item prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadSM2SecPemHandler"
                  :auto-upload="true"
                >
                  <el-button-group slot="trigger">
                    <el-button type="primary">上传</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      @click.stop="generateSM2SecPem()"
                    >生成</el-button>
                  </el-button-group>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  :change="buildSM2Data()"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.pubKey) !== 'undefined'" prop="pubKey">
                <label>
                  <span>公钥</span>
                </label>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  readonly
                  type="textarea"
                  :rows="2"
                  placeholder=""
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="typeof(addChainAccountDrawer.params.ext) !== 'undefined'" label="address">
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  readonly
                  placeholder=""
                  clearable
                />
              </el-form-item>
            </div>

            <div v-if="addChainAccountDrawer.params.type === 'Fabric1.4'">
              <el-form-item v-if="addChainAccountDrawer.params.type" prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".key,.pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadSecKeyHandler"
                  :auto-upload="true"
                >
                  <el-button slot="trigger" type="primary">上传</el-button>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="addChainAccountDrawer.params.type" prop="pubKey">
                <label>
                  <span>公钥证书</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".crt"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadPubKeyCertHandler"
                  :auto-upload="true"
                >
                  <el-button slot="trigger" type="primary">上传</el-button>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="addChainAccountDrawer.params.type === 'Fabric1.4'" prop="ext">
                <label><div><span>MSPID</span></div></label>
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  style="margin-top:10px"
                  placeholder="请输入"
                  clearable
                />
              </el-form-item>

            </div>

            <div v-if="addChainAccountDrawer.params.type === 'Fabric2.0'">
              <el-form-item v-if="addChainAccountDrawer.params.type" prop="secKey">
                <label>
                  <span>私钥</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".key,.pem"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadSecKeyHandler"
                  :auto-upload="true"
                >
                  <el-button slot="trigger" type="primary">上传</el-button>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.secKey"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="addChainAccountDrawer.params.type" prop="pubKey">
                <label>
                  <span>公钥证书</span>
                </label>
                <el-upload
                  style="float:right"
                  action=""
                  accept=".crt"
                  :show-file-list="false"
                  :file-list="pubKeyFileList"
                  :http-request="uploadPubKeyCertHandler"
                  :auto-upload="true"
                >
                  <el-button slot="trigger" type="primary">上传</el-button>
                </el-upload>
                <el-input
                  v-model="addChainAccountDrawer.params.pubKey"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入"
                  autosize
                  style="margin-top:10px"
                />
              </el-form-item>

              <el-form-item v-if="addChainAccountDrawer.params.type === 'Fabric2.0'" prop="ext">
                <label><div><span>组织标识（MSPID）</span></div></label>
                <el-input
                  v-model="addChainAccountDrawer.params.ext"
                  style="margin-top:10px"
                  placeholder="请输入"
                  clearable
                />
              </el-form-item>

            </div>

            <el-form-item v-if="addChainAccountDrawer.params.type">
              <label><div><span>设为默认凭证</span></div></label>
              <el-switch v-model="addChainAccountDrawer.params.isDefault" style="margin-top:10px" />
              <div class="add-credential-help-text">设为默认后，平台将优先使用该凭证执行对应链类型的签名操作。</div>
            </el-form-item>
          </el-form>
          <div class="add-credential-drawer__footer">
            <el-button @click="addChainAccountDrawer.show = false">取消</el-button>
            <el-button
              type="primary"
              @click="queryAddChainAccount('addChainAccountDrawer')"
            >确认添加</el-button>
          </div>
        </el-card>
      </el-drawer>
    </div>
  </transition>
</template>
<script>
import { listAccount, addChainAccount, removeChainAccount, setDefaultAccount } from '@/api/ua.js'
import { pem, ecdsa, sm2 } from '@/utils/pem.js'
import Clipboard from '@/components/Clipboard/index'
import handleClipboard from '@/utils/clipboard'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'

export default {
  name: 'AccountAdmin',
  components: { Clipboard },
  props: {},
  data() {
    return {
      ua: {
        uaID: null,
        pubKey: null,
        username: null,
        admin: true,
        version: 0,
        chainAccounts: [
          {
            keyID: 0,
            type: null,
            identity: null,
            isDefault: null,
            pubKey: null,
            secKey: null,
            ext: null
          },
          {
            keyID: 1,
            type: null,
            identity: null,
            isDefault: null,
            pubKey: null,
            secKey: null,
            ext: null
          }
        ]
      },
      chainAccountTable: [],
      chainAccountDrawer: {
        show: false,
        showSec: false,
        direction: 'rtl',
        header: '',
        info: {}
      },
      addChainAccountDrawer: {
        show: false,
        direction: 'rtl',
        params: {
          type: '',
          pubKey: '',
          secKey: '',
          ext: '',
          isDefault: false
        }
      },
      fullscreenLoading: false,
      show: true,
      pubKeyFileList: [],
      privateKeyFileList: [],
      addChainAccountDrawerRules: {
        type: [{ required: true, trigger: 'change', message: '请选择' }],
        secKey: [{ required: true, trigger: 'blur', validator: (rule, value, callback) => {
          if (typeof (value) === 'undefined' || value.length === 0) {
            callback(new Error('请输入私钥'))
          } else if (this.addChainAccountDrawer.params.type === 'BCOS2.0' && !ecdsa.isSecPem(value)) {
            callback(new Error('FISCO BCOS 2.0 私钥格式错误'))
          } else if (this.addChainAccountDrawer.params.type === 'GM_BCOS2.0' && !sm2.isSecPem(value)) {
            callback(new Error('FISCO BCOS 2.0 国密私钥格式错误'))
          } else if (!pem.isSecKeyFormat(value)) {
            callback(new Error('私钥格式错误'))
          } else {
            callback()
          }
        } }],
        pubKey: [{ required: true, trigger: 'blur', validator: (rule, value, callback) => {
          if (typeof (value) === 'undefined' || value.length === 0) {
            callback(new Error('请输入公钥'))
          } else if (this.addChainAccountDrawer.params.type === 'Fabric1.4' && !pem.isCertFormat(value)) {
            callback(new Error('格式错误' + this.addChainAccountDrawer.params.type))
          } else if (this.addChainAccountDrawer.params.type === 'Fabric2.0' && !pem.isCertFormat(value)) {
            callback(new Error('格式错误' + this.addChainAccountDrawer.params.type))
          } else {
            callback()
          }
        } }],
        ext: [{ required: true, trigger: 'blur', message: '请输入' }]
      }
    }
  },

  created() {
    this.getUA()
  },
  methods: {
    getUA() {
      this.show = false
      return listAccount().then((response) => {
        if (!response) {
          this.$message.error('response 为空，请检查后台运行状态')
          return
        }
        this.ua = response.data
        this.chainAccountTable = buildChainAccountTable(this.ua)
        this.show = true
      }).catch(error => {
        this.$message({
          message: '网络异常：' + error,
          type: 'error',
          duration: 5000
        })
      })
    },
    showChainAccount(chainAccount) {
      this.chainAccountDrawer.header = chainAccount.details
      this.chainAccountDrawer.info = chainAccount
      this.chainAccountDrawer.show = true
      this.chainAccountDrawer.showSec = false
    },
    getCredentialSummary(chainAccount) {
      return buildCredentialSummary(chainAccount)
    },
    getIdentityLabel(type) {
      return resolveIdentityLabel(type)
    },
    getIdentityDescription(type) {
      return resolveIdentityDescription(type)
    },
    copyCredentialText(value, event) {
      handleClipboard(value || '', event)
    },
    confirmShowPrivateKey() {
      this.$confirm('确认查看当前凭证的私钥吗？请确保周围环境安全。', '提示', {
        confirmButtonText: '确认查看',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.chainAccountDrawer.showSec = true
      })
    },
    clearChainAccountDrawerParams() {
      this.addChainAccountDrawer.params.pubKey = undefined
      this.addChainAccountDrawer.params.secKey = undefined
      this.addChainAccountDrawer.params.ext = undefined
      this.addChainAccountDrawer.params.isDefault = false

      const myAddChainAccountDrawer = this.$refs['addChainAccountDrawer']
      if (typeof (myAddChainAccountDrawer) !== 'undefined') {
        this.$refs['addChainAccountDrawer'].clearValidate(['secKey', 'pubKey', 'ext'])
      }
    },
    querySetDefaultAccount() {
      this.$confirm('设为默认凭证？', '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loadingText = 'Loading'
        const loading = this.$loading({
          lock: true,
          text: loadingText
        })

        this.chainAccountDrawer.show = false
        setDefaultAccount({
          version: '1',
          data: {
            type: this.chainAccountDrawer.info.type,
            keyID: this.chainAccountDrawer.info.keyID
          }
        }).then((response) => {
          this.handleResponse(response)
          this.getUA().then(() => {
            loading.close()
          })
        }).catch(error => {
          loading.close()
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        })
      })
    },
    querySetDefaultAccountByColumn(chainAccount) {
      this.chainAccountDrawer.header = chainAccount.details
      this.chainAccountDrawer.info = chainAccount

      this.querySetDefaultAccount()
    },
    queryAddChainAccount(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          this.$confirm('添加链上凭证？', '提示', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            const loadingText = 'Loading'
            const loading = this.$loading({
              lock: true,
              text: loadingText
            })

            this.addChainAccountDrawer.show = false
            addChainAccount({
              version: '1',
              data: this.addChainAccountDrawer.params
            }).then((response) => {
              this.handleResponse(response)
              this.getUA().then(() => {
                loading.close()
              })
            }).catch(error => {
              loading.close()
              this.$message({
                message: '网络异常：' + error,
                type: 'error',
                duration: 5000
              })
            })
          })
        }
      })
    },
    queryRemoveChainAccount() {
      this.$confirm('删除凭证？', '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const loadingText = 'Loading'
        const loading = this.$loading({
          lock: true,
          text: loadingText
        })

        this.chainAccountDrawer.show = false
        removeChainAccount({
          version: '1',
          data: {
            type: this.chainAccountDrawer.info.type,
            keyID: this.chainAccountDrawer.info.keyID
          }
        }).then((response) => {
          this.handleResponse(response)
          this.getUA().then(() => {
            loading.close()
          })
        }).catch(error => {
          loading.close()
          this.$message({
            message: '网络异常：' + error,
            type: 'error',
            duration: 5000
          })
        })
      })
    },
    handleResponse(response) {
      if (!response) {
        this.$message({
          message: 'response为空，请查看后台运行状态',
          type: 'error'
        })
        return
      }
      if (response.errorCode !== 0) {
        this.$message({
          message: '设置失败：' + response.message,
          type: 'error'
        })
      } else if (response.data.errorCode !== 0) {
        this.$message({
          message: '设置失败：' + response.data.message,
          type: 'error'
        })
      } else {
        this.$message({
          message: '设置成功',
          type: 'success'
        })
        this.clearChainAccountDrawerParams()
      }
    },

    generateECDSASecPem() {
      this.clearChainAccountDrawerParams()
      this.addChainAccountDrawer.params.secKey = ecdsa.generateSecPem()
    },
    generateSM2SecPem() {
      this.clearChainAccountDrawerParams()
      this.addChainAccountDrawer.params.secKey = sm2.generateSecPem()
    },
    uploadECDSASecPemHandler(params) {
      this.clearChainAccountDrawerParams()
      const reader = new FileReader()
      reader.onload = (event) => {
        this.addChainAccountDrawer.params.secKey = event.target.result
      }
      reader.readAsText(params.file)
    },
    uploadSM2SecPemHandler(params) {
      this.clearChainAccountDrawerParams()
      const reader = new FileReader()
      reader.onload = (event) => {
        this.addChainAccountDrawer.params.secKey = event.target.result
      }
      reader.readAsText(params.file)
    },
    buildECDSAData() {
      const key = this.addChainAccountDrawer.params.secKey
      if (typeof (key) === 'undefined' || !ecdsa.isSecPem(key)) {
        this.addChainAccountDrawer.params.pubKey = undefined
        this.addChainAccountDrawer.params.ext = undefined
        return
      }

      const data = ecdsa.build(key)

      this.addChainAccountDrawer.params.pubKey = data.pubPem
      this.addChainAccountDrawer.params.ext = data.address
    },
    buildSM2Data() {
      const key = this.addChainAccountDrawer.params.secKey
      if (typeof (key) === 'undefined' || !sm2.isSecPem(key)) {
        this.addChainAccountDrawer.params.pubKey = undefined
        this.addChainAccountDrawer.params.ext = undefined
        return
      }

      const data = sm2.build(key)

      this.addChainAccountDrawer.params.pubKey = data.pubPem
      this.addChainAccountDrawer.params.ext = data.address
    },
    uploadPubKeyCertHandler(params) {
      const reader = new FileReader()
      reader.onload = (event) => {
        this.addChainAccountDrawer.params.pubKey = event.target.result
      }
      reader.readAsText(params.file)
    },
    uploadSecKeyHandler(params) {
      const reader = new FileReader()
      reader.onload = (event) => {
        this.addChainAccountDrawer.params.secKey = event.target.result
      }
      reader.readAsText(params.file)
    },
    howToUse() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: [
          {
            element: '#UA',
            title: '平台身份',
            intro: '展示当前平台登录身份',
            position: 'right'
          }, {
            element: '#uaPK',
            title: '身份公钥',
            intro: '展示平台身份公钥，可点击复制按钮复制完整内容',
            position: 'top'
          }, {
            element: '#chainAccountTable',
            title: '区块链签名凭证',
            intro: '仅展示凭证摘要，完整证书、地址和密钥信息可在详情中查看',
            position: 'top'
          },
          {
            element: '#addChainAccount',
            title: '添加链上凭证',
            intro: '点击"添加链上凭证"按钮进行凭证添加操作',
            position: 'left'
          }
        ]
      }).start()
    }
  }
}

function resolveIdentityLabel(type) {
  const localType = String(type || '')
  if (localType.includes('BCOS')) {
    return '账户地址'
  }
  if (localType.includes('Fabric')) {
    return '身份证书'
  }
  if (localType.toLowerCase().includes('chainmaker')) {
    return '身份信息'
  }
  return '身份信息'
}

function resolveIdentityDescription(type) {
  const localType = String(type || '')
  if (localType.includes('BCOS')) {
    return '该地址用于标识当前区块链签名账户'
  }
  if (localType.includes('Fabric')) {
    return 'Fabric 身份对应的 X.509 公钥证书'
  }
  if (localType.toLowerCase().includes('chainmaker')) {
    return '包含组织标识和链上身份证书'
  }
  return '用于标识当前区块链签名凭证'
}

function buildCredentialSummary(chainAccount) {
  if (!chainAccount) {
    return '身份材料已配置，点击查看详情'
  }

  const type = String(chainAccount.type || '')
  if (type.includes('BCOS')) {
    const address = extractAddress(chainAccount.ext) || extractAddress(chainAccount.identity) || extractAddress(chainAccount.details)
    return address ? '账户地址：' + truncateMiddle(address, 22, 14) : '账户地址已配置，点击查看详情'
  }

  if (type.includes('Fabric')) {
    const org = getSafeShortText(chainAccount.ext)
    return org ? '组织：' + org + ' · 身份证书已配置' : '身份证书已配置，点击查看详情'
  }

  if (type.toLowerCase().includes('chainmaker')) {
    const org = extractOrganization(chainAccount)
    return org ? '组织：' + org : '身份材料已配置，点击查看详情'
  }

  return '身份材料已配置，点击查看详情'
}

function extractAddress(value) {
  if (!value) {
    return ''
  }

  const text = String(value)
  const addressWithPrefix = text.match(/0x[a-fA-F0-9]{20,}/)
  if (addressWithPrefix) {
    return addressWithPrefix[0]
  }

  const addressWithoutPrefix = text.match(/\b[a-fA-F0-9]{40}\b/)
  return addressWithoutPrefix ? '0x' + addressWithoutPrefix[0] : ''
}

function extractOrganization(chainAccount) {
  const candidates = [
    chainAccount.ext,
    chainAccount.identity,
    chainAccount.details,
    chainAccount.pubKey
  ]

  for (const candidate of candidates) {
    const org = extractOrganizationFromValue(candidate)
    if (org) {
      return org
    }
  }

  return ''
}

function extractOrganizationFromValue(value) {
  if (!value) {
    return ''
  }

  const text = String(value).trim()
  const plainText = getSafeShortText(text)
  if (plainText && !text.startsWith('{')) {
    return plainText
  }

  const parsed = parseJson(text)
  if (!parsed) {
    return ''
  }

  return findOrganizationField(parsed)
}

function findOrganizationField(value) {
  if (!value || typeof value !== 'object') {
    return ''
  }

  const orgKeys = ['orgId', 'orgID', 'org_id', 'orgName', 'organization', 'organizationId', 'mspid', 'mspId', 'mspID']
  for (const key of orgKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const text = getSafeShortText(value[key])
      if (text) {
        return text
      }
    }
  }

  for (const key of Object.keys(value)) {
    const child = value[key]
    if (child && typeof child === 'object') {
      const text = findOrganizationField(child)
      if (text) {
        return text
      }
    }
  }

  return ''
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch (e) {
    return null
  }
}

function getSafeShortText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const text = value.trim()
  if (!text || text.length > 80 || hasSensitiveMaterial(text)) {
    return ''
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    return ''
  }

  return text
}

function hasSensitiveMaterial(text) {
  return /PRIVATE KEY|PUBLIC KEY|CERTIFICATE|BEGIN |END |secKey|privateKey|cert|pem/i.test(text)
}

function truncateMiddle(text, startLength, endLength) {
  if (!text || text.length <= startLength + endLength + 3) {
    return text
  }
  return text.slice(0, startLength) + '...' + text.slice(-endLength)
}

function buildChainDetails(chainAccount) {
  let details = ''
  details +=
    chainAccount.type +
    '---' +
    chainAccount.keyID +
    '---' +
    String(chainAccount.identity || '').replace('-----BEGIN CERTIFICATE-----', '').substr(0, 64) +
    '---' +
    chainAccount.ext
  return details
}

function buildChainAccountTable(ua) {
  let chainAccount
  const localChainAccounts = []

  // build table requirements
  for (chainAccount of ua.chainAccounts) {
    chainAccount.details = buildChainDetails(chainAccount)
    chainAccount.children = []
  }

  // add default account
  let id = 1
  for (chainAccount of ua.chainAccounts) {
    if (chainAccount.isDefault === true) {
      chainAccount.id = id++
      // chainAccount.hasChildren = true
      localChainAccounts.push(chainAccount)
    }
  }

  // add non-default to children
  for (chainAccount of ua.chainAccounts) {
    if (chainAccount.isDefault === false) {
      const defaultChainAccount = localChainAccounts.find(
        (u) => u.type === chainAccount.type
      )
      if (typeof (defaultChainAccount) !== 'undefined') {
        chainAccount.id = defaultChainAccount.id * 10000 + defaultChainAccount.children.length + 1
        defaultChainAccount.children.push(chainAccount)
      } else {
        chainAccount.id = id++
        chainAccount.isDefault = true
        localChainAccounts.push(chainAccount)
      }
    }
  }
  return localChainAccounts
}

</script>

<style lang="scss">
.box{
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.account-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.account-card-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.account-help-button {
  margin-left: 10px;
  padding: 0;
}

.account-card-desc,
.section-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #909399;
}

.platform-identity {
  padding: 18px 20px;
  margin-bottom: 24px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  // background: #f5f9ff;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.identity-summary-row {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 18px;
  min-width: 0;
}

.identity-item,
.identity-public-key {
  display: flex;
  align-items: center;
  min-width: 0;
}

.identity-public-key {
  flex: 1 1 auto;
}

.identity-label {
  font-size: 13px;
  flex: 0 0 auto;
  margin-right: 12px;
  color: #909399;
}

.public-key-box {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  padding: 6px 8px 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}

.public-key-text {
  display: inline-block;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 720px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-size: 13px;
}

.credentials-panel {
  padding: 18px 20px 20px;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  // background: #f7fcf4;
}

.credentials-section-header {
  margin-bottom: 14px;
}

.credential-table {
  cursor: pointer;
}

.credential-table .el-table__row:hover > td {
  background-color: #f0f9eb;
}

.el-tooltip__popper.is-light {
  background: #fff;
  color: #303133;
  border-color: #dcdfe6;
}

.credential-drawer-card {
  min-height: 100%;
}

.credential-drawer-card > .el-card__body {
  padding-bottom: 0;
}

.credential-drawer__body {
  overflow: visible;
}

.credential-summary-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  row-gap: 8px;
  column-gap: 16px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #f5f7fa;
}

.credential-summary-label {
  font-size: 13px;
  color: #909399;
}

.credential-summary-value {
  display: flex;
  align-items: center;
  min-height: 24px;
  font-size: 14px;
  color: #303133;
  word-break: break-all;
}

.credential-detail-form {
  padding-bottom: 8px;
}

.credential-field-label {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.credential-field-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}

.credential-detail-form textarea {
  word-break: break-all;
}

.private-key-button {
  margin-top: 12px;
}

.private-key-input {
  margin-top: 10px;
}

.credential-empty-text {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  color: #909399;
  background: #fafafa;
}

.credential-drawer__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.add-credential-drawer-card {
  min-height: 100%;
}

.add-credential-drawer-card > .el-card__body {
  padding-bottom: 0;
}

.add-credential-alert {
  margin-bottom: 18px;
}

.add-credential-help-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.add-credential-drawer__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.el-drawer.rtl{
    overflow-y: auto;
}
</style>
