<template>
  <div class="app-container resource-deployment">
    <el-card>
      <template slot="header">
        <el-page-header title="返回数据资产目录" @back="() => {$router.push({ path: 'resourceList' })}">
          <div slot="content" class="resource-deployment__header">
            <div>
              <h2>数据资产链上登记</h2>
              <p>将交通数据服务对应的合约或链码登记到指定协同网络</p>
            </div>
            <!-- <el-tooltip id="deployHelp" effect="light" content="如何登记数据资产？" placement="top">
              <el-button type="text" size="mini" class="resource-deployment__help" @click="howToUse">
                <svg-icon style="vertical-align: 0px" icon-class="question" />
              </el-button>
            </el-tooltip> -->
          </div>
        </el-page-header>
      </template>
      <el-row>
        <el-col :span="24">
          <div class="resource-deployment__form-wrap">
            <!-- <el-steps class="resource-deployment__steps" :active="2" simple>
              <el-step title="链环境" />
              <el-step title="资产服务配置" />
              <el-step title="提交登记" />
            </el-steps> -->
            <el-form ref="deployForm" :model="form" label-width="160px" :rules="formRules" class="resource-deploy-form">
              <section class="deploy-section">
                <div class="deploy-section__title">链环境</div>
                <el-form-item id="stubType" label="底层链环境：" prop="stubType">
                  <el-select v-model="form.stubType" :disabled="lockDown" placeholder="请选择底层链环境" @change="stubTypeChange">
                    <el-option-group label="FISCO BCOS">
                      <!-- <el-option label="FISCO BCOS 2.0" value="BCOS2.0" /> -->
                      <!-- <el-option label="FISCO BCOS 2.0 国密版" value="GM_BCOS2.0" /> -->
                      <el-option label="FISCO BCOS 3.0 EVM" value="BCOS3_ECDSA_EVM" />
                      <!-- <el-option label="FISCO BCOS 3.0 EVM 国密版" value="BCOS3_GM_EVM" /> -->
                      <!-- <el-option label="FISCO BCOS 3.0 WASM" value="BCOS3_ECDSA_WASM" /> -->
                      <!-- <el-option label="FISCO BCOS 3.0 WASM 国密版" value="BCOS3_GM_WASM" /> -->
                    </el-option-group>
                    <el-option-group label="Hyperledger Fabric">
                      <el-option label="Hyperledger Fabric 1.4" value="Fabric1.4" />
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item id="method" label="登记方式：" prop="method">
                  <el-select key="methodSelect" v-model="form.method" placeholder="请选择登记方式" @change="methodChange">
                    <el-option
                      v-if="(form.stubType !== null && form.stubType.includes('BCOS'))"
                      label="登记新资产服务"
                      value="deploy"
                    >
                      <span class="option-label">登记新资产服务</span>
                      <span class="option-tech">Deploy</span>
                    </el-option>
                    <el-option
                      v-if="(form.stubType !== null && form.stubType.includes('BCOS'))"
                      label="接入已有资产服务"
                      value="register"
                    >
                      <span class="option-label">接入已有资产服务</span>
                      <span class="option-tech">Register</span>
                    </el-option>
                    <el-option v-if="form.stubType ==='Fabric1.4'" label="安装资产服务链码" value="install">
                      <span class="option-label">安装资产服务链码</span>
                      <span class="option-tech">Install</span>
                    </el-option>
                    <el-option v-if="form.stubType ==='Fabric1.4'" label="初始化资产服务链码" value="instantiate">
                      <span class="option-label">初始化资产服务链码</span>
                      <span class="option-tech">Instantiate</span>
                    </el-option>
                    <el-option v-if="form.stubType ==='Fabric1.4'" label="升级资产服务链码" value="upgrade">
                      <span class="option-label">升级资产服务链码</span>
                      <span class="option-tech">Upgrade</span>
                    </el-option>
                  </el-select>
                </el-form-item>
                <div id="Path">
                  <el-form-item
                    v-if="form.prependPath !== null"
                    label="数据资产标识："
                    prop="appendPath"
                  >
                    <el-input v-model.trim="form.appendPath" class="asset-path-input" placeholder="请输入数据资产名称">
                      <template slot="prepend">{{ form.prependPath }}</template>
                    </el-input>
                  </el-form-item>

                  <el-form-item
                    v-else
                    label="数据资产标识："
                    prop="fullPath"
                  >
                    <el-input v-model.trim="form.fullPath" placeholder="请输入数据资产名称" />
                  </el-form-item>
                </div>
              </section>

              <section class="deploy-section">
                <div class="deploy-section__title">资产服务配置</div>
                <div class="deploy-section__hint">此处登记的是交通数据服务对应的链上合约，不会将原始交通数据直接上传到区块链。</div>

                <!-- BCOS -->
                <div v-if="(form.stubType !== null && form.stubType.includes('BCOS'))">
                  <el-row
                    v-if="(form.stubType !== null && !form.stubType.includes('WASM'))"
                    :gutter="16"
                    class="upload-field-row"
                  >
                    <el-col :span="12">
                      <el-form-item id="zipContract" label="合约文件包：" prop="zipContract">
                        <el-upload
                          ref="uploadContract"
                          action=""
                          accept=".zip"
                          :file-list="fileList"
                          :on-change="changeContractFile"
                          :before-remove="beforeRemove"
                          :http-request="uploadContractSourceHandler"
                          :auto-upload="false"
                        >
                          <el-button slot="trigger">选择文件</el-button>
                          <div slot="tip" class="el-upload__tip upload-tip-list">
                            <p>请上传包含合约源码的 ZIP 文件</p>
                            <p>ZIP 最外层目录中必须包含合约入口文件</p>
                          </div>
                        </el-upload>
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item id="chosenSolidity" label="合约入口文件：" prop="chosenSolidity">
                        <el-select v-model="form.chosenSolidity" placeholder="请选择合约入口文件">
                          <el-option
                            v-for="item in solidityFiles"
                            :key="item.path"
                            :label="item.path"
                            :value="item.value"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row
                    v-if="(form.stubType !== null && form.stubType.includes('WASM'))"
                    :gutter="16"
                    class="upload-field-row"
                  >
                    <el-col :span="12">
                      <el-form-item id="wasmContract" label="合约文件包：" prop="zipContract">
                        <el-upload
                          ref="uploadContract"
                          action=""
                          accept=".wasm,.abi"
                          :file-list="fileList"
                          :on-change="changeWasmContractFile"
                          :before-remove="beforeRemove"
                          :http-request="uploadWasmContractHandler"
                          :auto-upload="false"
                        >
                          <el-button slot="trigger">选择文件</el-button>
                          <div slot="tip" class="el-upload__tip">请上传 Liquid 合约编译后的 WASM 文件和 ABI 文件</div>
                        </el-upload>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item
                    v-if="(form.stubType !== null && !form.stubType.includes('WASM'))"
                    id="className"
                    label="合约类名："
                    prop="className"
                  >
                    <el-input v-model.trim="form.className" placeholder="请输入合约类名" />
                  </el-form-item>
                  <el-form-item
                    v-if="(form.stubType ==='BCOS2.0'||form.stubType ==='GM_BCOS2.0')"
                    id="bcosVersion"
                    label="合约版本号："
                    prop="version"
                  >
                    <el-input v-model.trim="form.version" placeholder="请输入合约版本号" />
                  </el-form-item>
                  <el-form-item
                    v-if="form.method ==='register'"
                    label="已有资产合约地址："
                    prop="address"
                  >
                    <el-input v-model.trim="form.address" class="contract-address-input" placeholder="请输入已有合约地址">
                      <template slot="prepend">0x</template>
                    </el-input>
                  </el-form-item>
                </div>
                <!-- Fabric -->
                <div v-else-if="form.stubType==='Fabric1.4'">
                  <el-form-item
                    v-if="form.method==='install'"
                    id="org"
                    label="所属机构名："
                    prop="org"
                  >
                    <el-tooltip effect="light" content="被安装链码的 endorser 所属的机构" placement="top">
                      <el-input v-model="form.org" placeholder="请输入所属机构名" />
                    </el-tooltip>
                  </el-form-item>
                  <el-form-item
                    v-if="form.method !=='install'"
                    id="orgs"
                    label="机构列表："
                    prop="org"
                  >
                    <el-tooltip effect="light" placement="top">
                      <div slot="content">链码被安装的机构列表。必须以 JSON 数组形式填入，例：["Org1"]</div>
                      <el-input v-model="form.org" placeholder="请输入机构列表" />
                    </el-tooltip>
                  </el-form-item>
                  <el-form-item v-if="form.method === 'install'" id="compressedContent" label="合约文件包：" prop="compressedContent">
                    <el-upload
                      ref="uploadChaincode"
                      action=""
                      :file-list="fileList"
                      accept=".tar,.gz"
                      :on-change="changeChaincodeFile"
                      :before-remove="beforeRemove"
                      :http-request="uploadContractCompressedHandler"
                      :auto-upload="false"
                    >
                      <div slot="tip" class="el-upload__tip upload-tip-list">
                        <p>请上传链码打包后的 tar/gz 文件</p>
                        <p>Golang 版本链码需放在 src/chaincode/ 目录下才能正确安装</p>
                      </div>
                      <el-button slot="trigger">选择文件</el-button>
                    </el-upload>
                  </el-form-item>
                  <el-form-item
                    id="fabricVersion"
                    label="合约版本号："
                    prop="version"
                  >
                    <el-input v-model.trim="form.version" placeholder="请输入合约版本号" />
                  </el-form-item>
                  <el-form-item id="lang" label="合约语言：" prop="lang">
                    <el-select v-model="form.lang" placeholder="请选择合约语言">
                      <el-option label="Golang" value="GO_LANG" />
                      <el-option label="Java" value="JAVA" />
                    </el-select>
                  </el-form-item>
                  <el-form-item
                    v-if="form.method==='instantiate'||form.method==='upgrade'"
                    id="policy"
                    label="背书策略："
                    prop="policy"
                  >
                    <el-upload
                      ref="uploadPolicy"
                      action=""
                      accept=".yaml"
                      :file-list="policyFile"
                      :on-change="changePolicyFile"
                      :before-remove="beforeRemove"
                      :http-request="uploadPolicyHandler"
                      :auto-upload="false"
                    >
                      <div slot="tip" class="el-upload__tip">请上传 policy 的 YAML 文件，不上传默认为 default</div>
                      <el-button slot="trigger">选择文件</el-button>
                    </el-upload>
                  </el-form-item>
                  <el-form-item
                    v-if="form.method==='instantiate'||form.method==='upgrade'"
                    id="args"
                    label="其他参数："
                    prop="args"
                  >
                    <el-tooltip effect="light" placement="top">
                      <div slot="content">必须以 JSON 数组形式填入，例：["a","10"]</div>
                      <el-input v-model="form.args" placeholder="请输入调用参数" />
                    </el-tooltip>
                  </el-form-item>
                </div>
              </section>

              <section class="deploy-section deploy-section--submit">
                <!-- <div class="deploy-section__title">提交登记</div> -->
                <el-form-item v-if="submitResponse !== null" label="提交结果：">
                  <el-input
                    v-model="submitResponse"
                    :rows="5"
                    type="textarea"
                    readonly
                    resize="none"
                    class="submit-result"
                  />
                </el-form-item>
                <div class="deploy-footer">
                  <el-button @click="$router.push({ path: 'resourceList' })">返回数据资产目录</el-button>
                  <el-button @click="onCancel">重置</el-button>
                  <el-button id="onSubmit" v-loading.fullscreen.lock="loading" type="primary" @click="onSubmit">提交登记</el-button>
                </div>
              </section>
            </el-form>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import {
  buildBCOSDeployRequest,
  buildBCOSDeployWasmRequest,
  buildBCOSRegisterRequest,
  buildFabricInstallRequest,
  buildFabricInstantiateRequest, buildFabricUpgradeRequest, clearForm
} from '@/utils/resource'
import {
  bcosDeploy, bcosRegister, fabricInstall, fabricInstantiate, fabricUpgrade
} from '@/api/resource'
import { handleSuccessMsgBox, handleErrorMsgBox } from '@/utils/messageBox'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'
import { stepRoute } from './resourceSteps/resourceDeploySteps'
import { isChainAccountFit } from '@/utils/chainAccountIntro'

const JSZip = require('jszip')

export default {
  name: 'ResourceDeploy',
  data() {
    return {
      form: {
        stubType: null,
        method: null,
        prependPath: null,
        appendPath: null,
        fullPath: null,
        className: null,
        version: null,
        address: null,
        org: null,
        lang: null,
        policy: 'default',
        args: null,
        chosenSolidity: null,
        chosenWasm: null,
        chosenAbi: null,
        sourceContent: null,
        abiContent: null,
        compressedContent: null
      },
      solidityFiles: [],
      zipContractFilesMap: {},
      fileList: [],
      policyFile: [],
      submitResponse: null,
      sourceContractLine: [],
      dependenciesLine: [],
      loading: false,
      lockDown: false,
      isFullPath: false,
      formRules: {
        stubType: [{ required: true, message: '请选择底层链环境', trigger: 'blur' }],
        compressedContent: [{ required: true, message: '请上传合约文件', trigger: 'blur' }],
        chosenSolidity: [{ required: true, message: '合约文件不能为空', trigger: 'blur' }],
        fullPath: [{ required: true, message: '数据资产标识不能为空', trigger: 'blur' },
          {
            pattern: /^((?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+\.){2}(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/,
            required: true,
            message: '数据资产标识格式错误，应形如 \'path.to.resource\'',
            trigger: 'blur'
          }],
        appendPath: [{ required: true, message: '数据资产标识不能为空', trigger: 'blur' },
          {
            pattern: /^(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/,
            required: true,
            message: '数据资产名称格式错误',
            trigger: 'blur'
          }
        ],
        org: [
          { required: true, message: '所在组织名不能为空', trigger: 'blur' },
          { required: true, message: '所在组织名最长不能超过128', trigger: 'blur', max: 128 }
        ],
        version: [
          { required: true, message: '合约版本号不能为空', trigger: 'blur' },
          {
            required: true, message: '合约版本号格式错误', trigger: 'blur',
            pattern: /^([0-9]+)(\.([0-9]+)){0,5}$/
          }
        ],
        lang: [
          { required: true, message: '请选择合约语言', trigger: 'blur' }
        ],
        args: [
          { required: true, message: '其他参数不能为空，至少需要填入JSON数组：[]', trigger: 'blur' }
        ],
        address: [
          { required: true, message: '已有合约地址不能为空', trigger: 'blur' },
          {
            required: true, message: '合约地址已包含0x前缀，无需重复添加', trigger: 'blur',
            pattern: /^(?!0x|0X).*/
          },
          {
            required: true, message: '合约地址格式错误', trigger: 'blur',
            pattern: /^[0-9a-fA-F]*$/, min: 1, max: 128
          }
        ],
        className: [
          { required: true, message: '合约类名不能为空', trigger: 'blur' },
          {
            required: true, message: '合约类名不能包含特殊字符', trigger: 'blur',
            pattern: /^(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/
          },
          { required: true, message: '合约类名长度不能超过128', trigger: 'blur', max: 128 }
        ],
        method: [{ required: true, message: '请选择登记方式', trigger: 'blur' }]
      }
    }
  },
  watch: {
    solidityFiles(value) {
      if (value.length > 0) {
        this.form.chosenSolidity = value[0].value
      } else {
        this.form.chosenSolidity = null
      }
    }
  },
  created() {
    if (typeof (this.$route.query.path) !== 'undefined' && this.$route.query.path !== null) {
      this.form.prependPath = this.$route.query.path + '.'
    }

    if (typeof (this.$route.query.stubType) !== 'undefined' && this.$route.query.stubType !== null) {
      this.form.stubType = this.$route.query.stubType
      if (this.form.stubType === 'Fabric1.4') {
        this.form.method = 'install'
      } else {
        this.form.method = 'deploy'
      }
      this.lockDown = true
    } else {
      this.isFullPath = true
    }
  },
  methods: {
    mergeSourceContractLineToString() {
      this.form.sourceContent = ''
      for (const sourceContractLineElement of this.sourceContractLine) {
        this.form.sourceContent += sourceContractLineElement + '\n'
      }
    },
    onSubmit() {
      this.$refs['deployForm'].validate((validate) => {
        if (validate) {
          isChainAccountFit(this.form.stubType, () => {
            this.loading = true
            switch (this.form.method) {
              case 'deploy' :
                this.sourceContractLine = []
                this.dependenciesLine = []
                this.onBCOSDeploy()
                break
              case 'register':
                this.sourceContractLine = []
                this.dependenciesLine = []
                this.onBCOSRegister()
                break
              case 'install':
                this.onFabricInstall()
                break
              case 'instantiate':
                this.onFabricInstantiate()
                break
              case 'upgrade':
                this.onFabricUpgrade()
                break
              default:
                console.log(this.form)
            }
          })
        } else {
          this.$message({
            message: '请检查所有输入',
            type: 'warning'
          })
        }
      })
    },
    onCancel() {
      this.$message({
        message: '已重置',
        type: 'info'
      })
      this.$refs.deployForm.resetFields()
      this.form.stubType = this.$route.query.stubType
      this.fileList = []
      this.policyFile = []
      this.sourceContractLine = []
      this.dependenciesLine = []
      this.solidityFiles = []
      this.zipContractFilesMap = {}
    },
    onBCOSDeploy() {
      var isWASM = false
      if (this.form.stubType !== null && this.form.stubType.includes('WASM')) {
        isWASM = true
      }
      try {
        if (isWASM) {
          if (this.form.sourceContent === null || this.form.abiContent === null) {
            this.$alert('请同时增加二进制文件和ABI文件！', '错误', {
              type: 'error'
            }).catch(_ => {
            })
            this.loading = false
            return
          }
        } else {
          this.mergeSolidityFile('./' + this.form.chosenSolidity)
          this.mergeSourceContractLineToString()
        }
      } catch (e) {
        this.loading = false
        return
      }
      const h = this.$createElement
      this.$msgbox({
        message: h('div', null, [
          h('p', { style: { fontSize: '16px' }}, '确认执行部署合约？'),
          h('div', { style: { fontSize: '14px', marginTop: '5px' }}, '注意：若是升级FISCO BCOS合约，请勿修改/删除旧版本合约的ABI接口，否则会出现旧合约历史交易为空的情况！')
        ]),
        title: '注意',
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: '确认部署',
        cancelButtonText: '取消部署'
      }).then(_ => {
        bcosDeploy(isWASM ? buildBCOSDeployWasmRequest(this.form) : buildBCOSDeployRequest(this.form)).then(response => {
          this.loading = false
          if (response.errorCode !== 0) {
            handleErrorMsgBox(
              '执行FISCO BCOS部署合约失败，错误：',
              '错误码：' + response.errorCode,
              (response.data === null) ? response.message : response.data.errorMessage,
              null
            )
          } else {
            this.onSubmitSuccess(response)
          }
        }).catch(err => {
          this.loading = false
          this.$message(
            {
              message: err,
              type: 'error',
              center: true
            }
          )
        })
      }).catch(_ => {
        this.loading = false
      })
    },
    onBCOSRegister() {
      try {
        this.mergeSolidityFile('./' + this.form.chosenSolidity)
        this.mergeSourceContractLineToString()
      } catch (e) {
        this.loading = false
        return
      }
      bcosRegister(buildBCOSRegisterRequest(this.form)).then(response => {
        this.loading = false
        if (response.errorCode !== 0) {
          handleErrorMsgBox(
            '执行FISCO BCOS注册合约失败，错误：',
            '错误码：' + response.errorCode,
            (response.data === null) ? response.message : response.data.errorMessage,
            null
          )
        } else {
          this.onSubmitSuccess(response)
        }
      }).catch(err => {
        this.loading = false
        this.$message(
          {
            message: err,
            type: 'error',
            center: true
          }
        )
      })
    },
    onFabricInstall() {
      fabricInstall(buildFabricInstallRequest(this.form)).then(response => {
        this.loading = false
        if (response.errorCode !== 0) {
          handleErrorMsgBox(
            '执行Hyperledger Fabric合约安装失败，错误：',
            '错误码：' + response.errorCode,
            (response.data === null) ? response.message : response.data.errorMessage,
            null
          )
        } else {
          const h = this.$createElement
          this.$confirm('提示', {
            message: h('div', null, [
              h('p', null, '已执行成功，返回信息：'),
              h('p', null, response.data),
              h('p', { style: 'font-weight: bold;' }, '注意: 必须实例化合约/升级合约才能在资源列表显示')
            ]),
            title: '执行成功',
            confirmButtonText: '实例化合约',
            cancelButtonText: '继续安装合约',
            type: 'success'
          }).then(_ => {
            this.form.compressedContent = null
            this.form.method = 'instantiate'
            this.form.policy = 'default'
            this.form.org = null
            this.$refs.deployForm.clearValidate()
          }).catch(_ => {
            this.fileList = []
            this.policyFile = []
            this.sourceContractLine = []
            this.dependenciesLine = []
            this.solidityFiles = []
            this.zipContractFilesMap = {}
            this.$refs.deployForm.resetFields()
            this.form.sourceContent = null
          })
        }
      }).catch(err => {
        this.loading = false
        this.$message(
          {
            message: err,
            type: 'error',
            center: true
          }
        )
      })
    },
    onFabricInstantiate() {
      fabricInstantiate(buildFabricInstantiateRequest(this.form)).then(response => {
        this.loading = false
        if (response.errorCode !== 0) {
          handleErrorMsgBox(
            '执行Hyperledger Fabric合约实例化失败，错误：',
            '错误码：' + response.errorCode,
            (response.data === null) ? response.message : response.data.errorMessage,
            null
          )
        } else {
          this.onSubmitSuccess(response)
        }
      }).catch(err => {
        this.loading = false
        this.$message(
          {
            message: err,
            type: 'error',
            center: true
          }
        )
      })
    },
    onFabricUpgrade() {
      fabricUpgrade(buildFabricUpgradeRequest(this.form)).then(response => {
        this.loading = false
        if (response.errorCode !== 0) {
          handleErrorMsgBox(
            '执行Hyperledger Fabric合约升级失败，错误：',
            '错误码：' + response.errorCode,
            (response.data === null) ? response.message : response.data.errorMessage,
            null
          )
        } else {
          this.onSubmitSuccess(response)
        }
      }).catch(err => {
        this.loading = false
        this.$message(
          {
            message: err,
            type: 'error',
            center: true
          }
        )
      })
    },
    onSubmitSuccess(response) {
      handleSuccessMsgBox(
        '已执行成功，返回信息：',
        '执行成功',
        response.data,
        {
          showCancelButton: true,
          confirmButtonText: '前往资源列表',
          cancelButtonText: '继续部署'
        }
      ).then(_ => {
        this.$refs.deployForm.resetFields()
        this.$router.push('resourceList')
      }).catch(_ => {
        this.fileList = []
        this.policyFile = []
        this.sourceContractLine = []
        this.dependenciesLine = []
        this.solidityFiles = []
        this.zipContractFilesMap = {}
        this.$refs.deployForm.resetFields()
        this.form.sourceContent = null
      })
    },
    mergeSolidityFile(targetFile) {
      if (this.$refs.uploadContract.uploadFiles.length === 0) {
        return
      }
      if (typeof this.zipContractFilesMap[targetFile] === 'undefined') {
        this.$msgbox('不能找到文件依赖：' + targetFile + ' 请确认之后再执行！', '错误', 'error').catch(_ => {})
        throw new Error('Resolve files error')
      } else {
        const lines = this.zipContractFilesMap[targetFile].split('\n')
        for (const line of lines) {
          if (line.indexOf('pragma experimental ABIEncoderV2;') !== -1) {
            if (!this.dependenciesLine.includes('pragma experimental ABIEncoderV2;')) {
              this.dependenciesLine.push('pragma experimental ABIEncoderV2;')
              this.sourceContractLine.push(line)
            }
          } else if (/^\s*import\s+["'](.+)["']\s*;\s*$/.test(line)) {
            this.dependenciesLine.push(line)
            const matchObj = /^\s*import\s+["'](.+)["']\s*;\s*$/.exec(line)
            if (!this.dependenciesLine.includes(matchObj[1])) {
              this.dependenciesLine.push(matchObj[1])
              this.mergeSolidityFile(matchObj[1])
            }
          } else {
            this.sourceContractLine.push(line)
          }
        }
      }
    },
    beforeRemove(file) {
      return this.$confirm(`确定移除 ${file.name}？`, '确认信息', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        center: true
      }).then(() => {
        this.$message({
          type: 'success',
          message: '删除成功!'
        })
        this.zipContractFilesMap = {}
        this.solidityFiles = []
        this.form.chosenSolidity = null
        this.form.sourceContent = null
        this.form.compressedContent = null
        this.form.policy = 'default'
        this.sourceContractLine = []
        this.dependenciesLine = []
        return true
      })
    },
    changeContractFile(file, fileList) {
      if (fileList.length === 2) {
        fileList.shift()
      }
      this.sourceContractLine = []
      this.dependenciesLine = []
      this.form.sourceContent = null
      this.form.chosenSolidity = null
      this.$refs.uploadContract.submit()
    },
    changeWasmContractFile(file, fileList) {
      if (fileList.length === 3) {
        fileList.shift()
      }
      console.log(file)
      const fileReader = new FileReader()
      if (file !== null && /(wasm$)/.test(file.raw.type)) {
        fileReader.onload = async(e) => {
          this.form.sourceContent = Array.prototype.map.call(new Uint8Array(e.target.result), x => (x.toString(16).padStart(2, '0'))).join('')
        }
        fileReader.readAsArrayBuffer(file.raw)
      } else if (file !== null && /(.abi$)/.test(file.raw.name)) {
        fileReader.onload = async(e) => {
          this.form.abiContent = e.target.result
        }
        fileReader.readAsText(file.raw)
      }
      this.$refs.uploadContract.submit()
    },
    changeChaincodeFile(file, fileList) {
      if (fileList.length === 2) {
        fileList.shift()
      }
      this.$refs.uploadChaincode.submit()
    },
    changePolicyFile(file, fileList) {
      if (fileList.length === 2) {
        fileList.shift()
      }
      this.$refs.uploadPolicy.submit()
    },
    uploadContractSourceHandler(params) {
      const jszip = new JSZip()
      if (params.file !== null && (/(zip)/.test(params.file.type) || /.(zip|ZIP)$/.test(params.file.name))) {
        this.zipContractFilesMap = {}
        this.solidityFiles = []
        this.sourceContractLine = []
        this.dependenciesLine = []
        const _this = this
        params.onProgress({ percent: 20 })
        const zipFiles = []
        const promises = []
        jszip.loadAsync(params.file).then(function(zip) {
          zip.forEach(function(relativePath, file) {
            if (file.dir === false) {
              promises.push(zip.file(file.name).async('string').then((data) => {
                zipFiles.push({ path: file.name, data: data })
              }))
            }
          })
          Promise.all(promises).then(() => {
            for (const zipFile of zipFiles) {
              _this.zipContractFilesMap['./' + zipFile.path] = zipFile.data
              if (zipFile.path.indexOf('/') === -1 &&
                  (zipFile.path.endsWith('.sol') || zipFile.path.endsWith('.abi'))) {
                _this.solidityFiles.push({ path: zipFile.path, value: zipFile.path })
              }
            }
            if (_this.solidityFiles.length === 0) {
              _this.$alert('zip最外层文件中不含有Solidity或ABI文件', '错误', {
                confirmButtonText: '确定',
                type: 'error'
              })
              params.onProgress({ percent: 0 })
              params.onError()
              return
            }
            params.onProgress({ percent: 100 })
            params.onSuccess()
            _this.$refs.deployForm.clearValidate('chosenSolidity')
          })
        }).catch(err => {
          handleErrorMsgBox(
            '读取zip文件错误：',
            '错误',
            err.toString(),
            null
          ).catch(_ => {
          })
          this.zipContractFilesMap = {}
          this.solidityFiles = []
          params.onProgress({ percent: 0 })
          params.onError()
        })
      } else {
        this.$alert('请选择zip文件！', '错误', {
          type: 'error'
        }).catch(_ => {})
        this.zipContractFilesMap = {}
        this.solidityFiles = []
        params.onProgress({ percent: 0 })
        params.onError()
      }
    },
    uploadContractCompressedHandler(params) {
      params.onProgress({ percent: 20 })
      if (params.file !== null && (/(gzip|tar)$/.test(params.file.type) || /.(gz|tar)$/.test(params.file.name))) {
        setTimeout(() => {
          this.readBaseBytes(params)
        }, 100)
        this.$refs.deployForm.clearValidate('compressedContent')
      } else {
        this.$alert('请选择tar/gz文件！', '错误', {
          type: 'error'
        }).catch(_ => {})
        this.form.compressedContent = null
        params.onProgress({ percent: 0 })
        params.onError()
      }
    },
    uploadPolicyHandler(params) {
      params.onProgress({ percent: 20 })
      if (params.file !== null && (/.(yaml|YAML)$/.test(params.file.name) || /(yaml)$/.test(params.file.type))) {
        setTimeout(() => {
          this.readBaseBytes(params)
        }, 100)
      } else {
        this.$alert('请选择yaml文件！', '错误', {
          type: 'error'
        }).catch(_ => {})
        this.form.policy = 'default'
        params.onProgress({ percent: 0 })
        params.onError()
      }
    },
    uploadWasmContractHandler(params) {
      if ((this.form.stubType === 'BCOS3_GM_WASM' || this.form.stubType === 'BCOS3_ECDSA_WASM')) {
        if (params.file !== null && /(wasm$)/.test(params.file.type)) {
          this.form.chosenWasm = params.file.name
        } else if (params.file !== null && /(.abi$)/.test(params.file.name)) {
          this.form.chosenAbi = params.file.name
        } else {
          this.$alert('请选择WASM或者ABI文件！', '错误', {
            type: 'error'
          }).catch(_ => {})
          params.onProgress({ percent: 0 })
          params.onError()
        }
      }
    },
    async readBaseBytes(params) {
      const readFile = new FileReader()
      readFile.readAsDataURL(params.file)
      readFile.onload = (e) => {
        this.form.compressedContent = e.target.result.split('base64,')[1]
        this.form.policy = e.target.result.split('base64,')[1]
        params.onProgress({ percent: 100 })
        params.onSuccess()
        this.$refs.deployForm.clearValidate('sourceContent')
        this.$refs.deployForm.clearValidate('policy')
      }
    },
    stubTypeChange() {
      this.fileList = []
      this.policyFile = []
      this.$refs.deployForm.clearValidate()
      this.form.method = null
      clearForm(this.form)
    },
    methodChange() {
      this.fileList = []
      this.policyFile = []
      this.zipContractFilesMap = {}
      this.solidityFiles = []
      this.sourceContractLine = []
      this.dependenciesLine = []
      this.$refs.deployForm.clearValidate()
      clearForm(this.form)
    },
    howToUse() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: stepRoute(this.form.stubType, this.form.method)
      }).start()
    }
  }
}
</script>

<style lang="scss" scoped>
.resource-deployment__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  h2 {
    margin: 0;
    color: #303133;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
  }

  p {
    margin: 4px 0 0;
    color: #909399;
    font-size: 13px;
    line-height: 20px;
  }
}

.resource-deployment__help {
  padding: 0;
  margin-left: 4px;
}

.resource-deployment::v-deep .el-page-header {
  align-items: center;
}

.resource-deployment::v-deep .el-page-header__left {
  display: flex;
  align-items: center;
  height: auto;
  line-height: 24px;
}

.resource-deployment::v-deep .el-page-header__title {
  line-height: 24px;
}

.resource-deployment__form-wrap {
  max-width: 1040px;
  margin: 0 auto;
}

.resource-deployment__steps {
  margin-bottom: 22px;
}

.resource-deploy-form {
  ::v-deep .el-form-item__label {
    white-space: nowrap;
  }

  .el-select,
  .el-input,
  .el-textarea {
    width: 100%;
  }
}

.deploy-section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
}

.deploy-section:first-of-type {
  padding-top: 0;
  margin-top: 0;
  border-top: none;
}

.deploy-section__title {
  margin-bottom: 16px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
}

.deploy-section__hint {
  padding: 10px 12px;
  margin-bottom: 18px;
  color: #606266;
  font-size: 13px;
  line-height: 20px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.option-label {
  float: left;
}

.option-tech {
  float: right;
  color: #8492a6;
  font-size: 13px;
}

.upload-field-row {
  align-items: flex-start;
}

.upload-tip-list p {
  margin: 4px 0 0;
}

.asset-path-input::v-deep .el-input-group__prepend {
  width: 180px;
  box-sizing: border-box;
  padding: 0 12px;
  overflow: hidden;
  color: #606266;
  text-align: left;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.contract-address-input::v-deep .el-input-group__prepend {
  width: 70px;
  box-sizing: border-box;
  padding: 0 12px;
  text-align: center;
}

.deploy-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.deploy-footer .el-button + .el-button {
  margin-left: 0;
}

.submit-result::v-deep textarea {
  max-height: 180px;
  overflow-y: auto;
}

@media (max-width: 992px) {
  .upload-field-row .el-col {
    width: 100%;
  }
}
</style>

