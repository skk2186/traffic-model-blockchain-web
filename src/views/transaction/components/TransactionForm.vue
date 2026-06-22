<template>
  <div>
    <el-row>
      <el-form
        ref="transactionForm"
        :label-width="labelWidth"
        label-position="right"
        :model="transaction"
        :rules="formRules"
        :class="['dynamicForm', { 'transaction-dialog-form': assetMode }]"
      >
        <div v-if="assetMode" class="transaction-mode-summary">
          <div class="transaction-mode-summary__title">{{ operationTitle }}</div>
          <div class="transaction-mode-summary__desc">{{ operationDesc }}</div>
        </div>
        <el-form-item :label="execMethodLabel">
          <el-col>
            <el-radio-group v-model="transaction.execMethod" size="small" @change="onExecMethodChange">
              <el-radio label="sendTransaction">{{ sendLabel }}</el-radio>
              <el-radio label="call">{{ callLabel }}</el-radio>
            </el-radio-group>
          </el-col>
        </el-form-item>
        <el-form-item :label="pathLabel" prop="path">
          <slot name="path" />
        </el-form-item>
        <el-form-item label="调用方法:" prop="method">
          <el-input v-model.trim="transaction.method" placeholder="请输入调用方法" @input="onInputMethod" />
        </el-form-item>
        <div v-if="transaction.args.length > 0">
          <div v-for="(arg, index) in transaction.args" :key="arg.key">
            <el-form-item
              :label="'调用参数:'"
              :prop="'args.' + index + '.value'"
            >
              <div class="transaction-arg-row">
                <el-input v-model="arg.value" :placeholder="'若为空则参数为空字符串'" class="transaction-arg-input">
                  <template slot="prepend">参数 {{ index }}</template>
                </el-input>
                <el-button
                  icon="el-icon-circle-plus-outline"
                  class="hoverButton"
                  type="text"
                  @click.prevent="addArg"
                />
                <el-button
                  icon="el-icon-remove-outline"
                  class="hoverButton"
                  type="text"
                  @click.prevent="removeArg(arg)"
                />
              </div>
            </el-form-item>
          </div>
        </div>
        <div v-else>
          <el-form-item
            :label="'调用参数:'"
            :rules="[{ required: true, message: '参数输入不能为空，可删除该参数置空', trigger: 'blur'}]"
          >
            <div class="transaction-arg-row">
              <el-button
                icon="el-icon-circle-plus-outline"
                class="hoverButton"
                type="text"
                @click.prevent="addArg"
              />
            </div>
          </el-form-item>
        </div>
        <el-form-item v-if="submitResponse !== null" :label="resultLabel">
          <el-input
            v-if="submitResponse !== null"
            v-model="submitResponse"
            type="textarea"
            :rows="5"
            readonly
            resize="none"
            class="transaction-result"
          />
        </el-form-item>
        <div class="transaction-form-footer">
          <el-button v-if="showCancel" size="small" @click="onCancel">取消</el-button>
          <el-button size="small" @click="clearForm">{{ resetLabel }}</el-button>
          <el-popconfirm
            :title="confirmTitle"
            @onConfirm="onSubmit"
          >
            <el-button
              slot="reference"
              v-loading.fullscreen.lock="loading"
              size="small"
              type="primary"
            >{{ submitLabel }}</el-button>
          </el-popconfirm>
        </div>
      </el-form>
    </el-row>
  </div>
</template>

<script>

import { handleErrorMsgBox } from '@/utils/messageBox'
import { isChainAccountFit } from '@/utils/chainAccountIntro'
import { detail } from '@/api/resource'

export default {
  name: 'TransactionForm',
  props: {
    transaction: {
      type: Object,
      default: () => {
        return {
          transactionID: null,
          path: null,
          method: null,
          args: [{
            value: '',
            key: 0
          }],
          execMethod: null,
          isXATransaction: false
        }
      }
    },
    assetMode: {
      type: Boolean,
      default: false
    },
    showCancel: {
      type: Boolean,
      default: false
    },
    context: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      transactionRules: {
        path: [
          {
            required: true, message: '资源路径不能为空', trigger: 'blur'
          },
          {
            pattern: /^((?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+\.){2}(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/,
            required: true,
            message: '资源路径格式错误，应形如 \'path.to.resource\'',
            trigger: 'blur'
          }
        ],
        method: [
          {
            required: true, message: '调用方法不能为空', trigger: 'blur'
          },
          {
            required: true, message: '调用方法总长度不能超过128', trigger: 'blur', max: 128
          },
          {
            pattern: /^(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/,
            required: true,
            message: '调用方法格式错误, 不支持特殊符号',
            trigger: 'blur'
          }
        ]
      },
      submitResponse: null,
      loading: false
    }
  },
  computed: {
    formRules() {
      return {
        path: [
          {
            required: true, message: this.isXAContext ? '数据资产标识不能为空' : '资源路径不能为空', trigger: 'blur'
          },
          {
            pattern: /^((?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+\.){2}(?!_)(?!-)(?!.*?_$)(?!.*?-$)[\u4e00-\u9fa5\w-]+$/,
            required: true,
            message: this.isXAContext ? '数据资产标识格式错误，应形如 \'path.to.resource\'' : '资源路径格式错误，应形如 \'path.to.resource\'',
            trigger: 'blur'
          }
        ],
        method: this.transactionRules.method
      }
    },
    labelWidth() {
      return this.assetMode ? '120px' : 'auto'
    },
    isXAContext() {
      return this.context === 'xa'
    },
    execMethodLabel() {
      return this.isXAContext ? '操作类型:' : '调用方式:'
    },
    sendLabel() {
      if (this.isXAContext) {
        return '写入操作'
      }
      return this.assetMode ? '发起可信共享' : '发交易'
    },
    callLabel() {
      if (this.isXAContext) {
        return '只读查询'
      }
      return this.assetMode ? '查询资产状态' : '查状态'
    },
    pathLabel() {
      return this.assetMode || this.isXAContext ? '数据资产标识:' : '资源路径:'
    },
    resultLabel() {
      if (this.isXAContext) {
        return '步骤执行结果:'
      }
      return this.assetMode ? '执行结果:' : '调用结果:'
    },
    resetLabel() {
      if (this.isXAContext) {
        return '重置'
      }
      return this.assetMode ? '重置' : '重置表单'
    },
    submitLabel() {
      return this.isXAContext ? '执行当前步骤' : '执行调用'
    },
    confirmTitle() {
      return this.isXAContext ? '确定执行当前步骤？' : '确定执行该调用？'
    },
    operationTitle() {
      return this.transaction.execMethod === 'call' ? '当前操作：查询资产状态' : '当前操作：发起可信共享'
    },
    operationDesc() {
      return this.transaction.execMethod === 'call'
        ? '该操作执行只读调用，不产生新的链上交易'
        : '该操作会提交链上交易并形成可审计记录'
    }
  },
  methods: {
    onInputMethod() {
      this.submitResponse = null
    },
    onExecMethodChange() {
      const tempPath = this.transaction.path
      this.clearForm()
      this.transaction.path = tempPath
      this.$forceUpdate()
    },
    addArg() {
      this.submitResponse = null
      this.transaction.args.push({
        value: '',
        key: Date.now()
      })
    },
    removeArg(item) {
      this.submitResponse = null
      const index = this.transaction.args.indexOf(item)
      if (index !== -1) {
        this.transaction.args.splice(index, 1)
      }
    },
    onSubmit() {
      this.submitResponse = null
      this.$refs['transactionForm'].validate((validate) => {
        if (validate) {
          detail(this.transaction.path).then(res => {
            if (!res) {
              this.$message.error('response 为空，请检查后台运行状态')
              return
            }
            if (res.errorCode !== 0) {
              this.$message.error(res.message)
              return
            }
            if (!res.data || !res.data.stubType) {
              this.$message.error('Resource not found')
            } else {
              isChainAccountFit(res.data.stubType, () => {
                this.$emit('submitClick', this.transaction)
              })
            }
          }).catch(err => {
            this.$message.error('网络错误：' + err)
          })
        } else {
          this.$message({
            message: '请检查所有输入',
            type: 'warning'
          })
        }
      })
    },
    onResponse(response) {
      if (response.errorCode !== 0 || response.data.errorCode !== 0) {
        this.submitResponse = null
        let code, message
        if (response.errorCode !== 0) {
          code = response.errorCode
          message = response.message
        } else {
          code = response.data.errorCode
          message = response.data.message
        }
        handleErrorMsgBox('执行错误：', '错误码: ' + code, message, null).catch(_ => {})
      } else {
        if (!response.data.result) {
          this.submitResponse = 'response返回错误，result为空'
        }
        const res = JSON.stringify(response.data.result)
        this.submitResponse = (res === '[]') ? '调用成功，返回结果为空' : res
      }
    },
    onCancel() {
      this.$emit('cancelClick')
    },
    clearForm() {
      this.$refs['transactionForm'].resetFields()
      this.submitResponse = null
      this.$emit('clearClick')
      // this.$forceUpdate()
    }
  }
}
</script>

<style lang="scss" scoped>
body {
  margin: 0;
}
.dynamicForm {
  .el-input {
    margin-right: 10px;
    width: 100%;
  }
}

.transaction-dialog-form {
  .el-input,
  .el-textarea {
    margin-right: 0;
    width: 100%;
  }
}

.transaction-mode-summary {
  padding: 12px 14px;
  margin-bottom: 18px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.transaction-mode-summary__title {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.transaction-mode-summary__desc {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
  line-height: 20px;
}

.transaction-arg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.transaction-arg-row .el-button + .el-button,
.transaction-form-footer .el-button + .el-button {
  margin-left: 0;
}

.transaction-arg-input {
  flex: 1;
  min-width: 0;
}

.transaction-arg-input::v-deep .el-input-group__prepend {
  width: 80px;
  box-sizing: border-box;
  padding: 0 12px;
  text-align: center;
}

.transaction-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.transaction-result::v-deep textarea {
  max-height: 180px;
  overflow-y: auto;
}

.hoverButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #909399;
  font-size: 22px;
  &:hover {
    transform: rotate(180deg);
  }
}
</style>
