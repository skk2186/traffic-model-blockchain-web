<template>
  <div class="page-container style-preview">
    <section class="page-header">
      <h2 class="page-header__title">UI 样式预览</h2>
      <p class="page-header__description">
        用于验证统一主题下的 Element UI 基础组件、弹出层和常见交互状态。
      </p>
    </section>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card class="preview-card" header="按钮">
          <div class="preview-line">
            <el-button>默认按钮</el-button>
            <el-button type="primary">主要按钮</el-button>
            <el-button type="success">成功按钮</el-button>
            <el-button type="warning">警告按钮</el-button>
            <el-button type="danger">危险按钮</el-button>
            <el-button type="text">文本按钮</el-button>
          </div>
          <div class="preview-line">
            <el-button disabled>禁用按钮</el-button>
            <el-button type="primary" disabled>禁用主要</el-button>
            <el-button plain>朴素按钮</el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="preview-card" header="表单控件">
          <el-form label-width="86px">
            <el-form-item label="输入框">
              <el-input v-model="form.input" placeholder="请输入内容" />
            </el-form-item>
            <el-form-item label="文本域">
              <el-input v-model="form.textarea" type="textarea" placeholder="请输入说明" />
            </el-form-item>
            <el-form-item label="选择器">
              <el-select v-model="form.select" placeholder="请选择">
                <el-option label="链上身份认证" value="identity" />
                <el-option label="共享过程审计" value="audit" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期">
              <el-date-picker v-model="form.date" type="date" placeholder="选择日期" />
            </el-form-item>
            <el-form-item label="复选">
              <el-checkbox v-model="form.checked">启用访问控制</el-checkbox>
            </el-form-item>
            <el-form-item label="单选">
              <el-radio-group v-model="form.radio">
                <el-radio label="audit">审计</el-radio>
                <el-radio label="record">存证</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card class="preview-card" header="表格与分页">
          <el-table :data="tableData" stripe border highlight-current-row>
            <el-table-column prop="name" label="能力名称" />
            <el-table-column prop="status" label="状态" width="120">
              <template slot-scope="{ row }">
                <el-tag :type="row.type">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="desc" label="说明" />
          </el-table>
          <div class="preview-pagination">
            <el-pagination
              background
              layout="prev, pager, next, total"
              :total="42"
              :page-size="10"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card class="preview-card" header="标签、标签页和空状态">
          <div class="preview-line">
            <el-tag>默认</el-tag>
            <el-tag type="success">成功</el-tag>
            <el-tag type="warning">警告</el-tag>
            <el-tag type="danger">危险</el-tag>
            <el-tag type="info">信息</el-tag>
          </div>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="已接入能力" name="ready">
              <el-empty description="暂无更多能力项" />
            </el-tab-pane>
            <el-tab-pane label="规划能力" name="plan">
              <el-empty description="暂无规划项" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="preview-card" header="弹出层与加载">
      <div class="preview-line">
        <el-button type="primary" @click="dialogVisible = true">打开 Dialog</el-button>
        <el-button @click="openMessageBox">打开 MessageBox</el-button>
        <el-popover placement="top" width="220" trigger="click" content="这是 Popover 内容。">
          <el-button slot="reference">Popover</el-button>
        </el-popover>
        <el-tooltip content="这是 Tooltip 内容" placement="top">
          <el-button>Tooltip</el-button>
        </el-tooltip>
        <el-dropdown>
          <el-button>
            Dropdown<i class="el-icon-arrow-down el-icon--right" />
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item>链上身份认证</el-dropdown-item>
            <el-dropdown-item>数据可信存证</el-dropdown-item>
            <el-dropdown-item disabled>禁用项</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-button @click="showLoading">Loading</el-button>
        <el-button @click="$message.success('操作成功')">Message</el-button>
        <el-button @click="openNotification">Notification</el-button>
      </div>
    </el-card>

    <el-dialog title="统一弹窗样式" :visible.sync="dialogVisible" width="420px">
      <p>这里用于验证 Dialog 标题、内容、边框和底部按钮的统一视觉。</p>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogVisible = false">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'StylePreview',
  data() {
    return {
      dialogVisible: false,
      activeTab: 'ready',
      form: {
        input: '',
        textarea: '',
        select: '',
        date: '',
        checked: true,
        radio: 'audit'
      },
      tableData: [
        { name: '链上身份认证', status: '已接入', type: 'success', desc: '用于验证参与方链上操作身份。' },
        { name: '共享过程审计', status: '已接入', type: 'primary', desc: '用于记录可信共享操作过程。' },
        { name: '跨链事务一致性', status: '可用', type: 'warning', desc: '用于保障多链状态协同一致。' }
      ]
    }
  },
  methods: {
    openMessageBox() {
      this.$confirm('确认执行该危险操作？', '危险操作确认', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }).catch(() => {})
    },
    openNotification() {
      this.$notify({
        title: '通知',
        message: '平台主题样式已统一加载。',
        type: 'success'
      })
    },
    showLoading() {
      const loading = this.$loading({
        lock: true,
        text: '加载中',
        spinner: 'el-icon-loading'
      })
      window.setTimeout(() => {
        loading.close()
      }, 800)
    }
  }
}
</script>

<style lang="scss" scoped>
.style-preview {
  .preview-card {
    margin-bottom: 16px;
  }

  .preview-line {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .preview-pagination {
    margin-top: 16px;
    text-align: right;
  }
}
</style>
