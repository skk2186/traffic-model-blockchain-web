<template>
  <el-dialog
    class="json-result-dialog-wrapper cross-verification-page"
    custom-class="json-result-dialog"
    :title="title"
    :visible="visible"
    width="760px"
    append-to-body
    @close="close"
  >
    <pre class="json-content cross-verification-json">{{ formattedJson }}</pre>
    <span slot="footer" class="dialog-footer">
      <el-button size="small" icon="el-icon-document-copy" @click="copyAll">复制全部</el-button>
      <el-button size="small" type="primary" @click="close">关闭</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { copyText } from '../utils/verificationUtils'

export default {
  name: 'JsonResultDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '完整结果'
    },
    data: {
      type: [Object, Array, String, Number, Boolean],
      default: null
    }
  },
  computed: {
    formattedJson() {
      if (typeof this.data === 'string') {
        return this.data
      }
      return JSON.stringify(this.data, null, 2)
    }
  },
  methods: {
    close() {
      this.$emit('update:visible', false)
    },
    copyAll() {
      copyText(this.formattedJson)
        .then(() => this.$message.success('完整结果已复制'))
        .catch(() => this.$message.warning('请手动选择内容复制'))
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/common.scss';

.json-content {
  max-height: 420px;
  min-height: 180px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #303133;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  font: 12px/1.6 Consolas, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dialog-footer {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
}
.json-result-dialog-wrapper::v-deep .json-result-dialog {
  max-width: calc(100vw - 40px);
}
</style>
