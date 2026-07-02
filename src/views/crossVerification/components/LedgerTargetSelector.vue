<template>
  <section class="ledger-target-selector">
    <el-form label-position="top" size="small">
      <el-form-item class="switch-item">
        <el-switch
          :value="writeLedger"
          active-text="同步到可信账本"
          @change="handleWriteLedgerChange"
        />
      </el-form-item>

      <template v-if="writeLedger">
        <el-row :gutter="12">
          <el-col :xs="24" :md="12">
            <el-form-item label="目标协同网络">
              <el-select
                :value="currentTargets.network"
                :loading="resourceLoading"
                placeholder="请选择目标协同网络"
                style="width: 100%"
                filterable
                @visible-change="handleDropdownVisible"
                @change="handleNetworkChange"
              >
                <el-option
                  v-for="network in networkOptions"
                  :key="network.value"
                  :label="network.label"
                  :value="network.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="目标验证合约">
              <el-select
                :value="currentTargets.resourcePath"
                :loading="resourceLoading"
                placeholder="选择验证合约"
                style="width: 100%"
                filterable
                @visible-change="handleDropdownVisible"
                @change="handleResourceChange"
              >
                <el-option
                  v-for="resource in filteredResources"
                  :key="resource.path"
                  :label="resource.path"
                  :value="resource.path"
                >
                  <span>{{ resource.path }}</span>
                  <span class="resource-type">{{ resource.type || resource.stubType || '' }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert
          v-if="resourceError"
          class="resource-alert"
          :title="resourceError"
          type="warning"
          :closable="false"
          show-icon
        />
      </template>
    </el-form>
  </section>
</template>

<script>
import { getResourceList } from '@/api/resource'

export default {
  name: 'LedgerTargetSelector',
  props: {
    writeLedger: {
      type: Boolean,
      default: false
    },
    ledgerTargets: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      resourceLoading: false,
      resourceOptions: [],
      resourceError: ''
    }
  },
  computed: {
    currentTargets() {
      return Object.assign({ network: '', resourcePath: '' }, this.ledgerTargets)
    },
    networkOptions() {
      const seen = new Set()
      return this.resourceOptions.reduce((options, resource) => {
        const network = this.getNetworkFromPath(resource.path)
        if (network && !seen.has(network)) {
          seen.add(network)
          options.push({ label: network, value: network })
        }
        return options
      }, [])
    },
    filteredResources() {
      const network = this.currentTargets.network
      if (!network) {
        return this.resourceOptions
      }
      return this.resourceOptions.filter(resource => this.getNetworkFromPath(resource.path) === network)
    }
  },
  methods: {
    handleWriteLedgerChange(value) {
      this.$emit('update:writeLedger', value)
      this.$emit('change', {
        writeLedger: value,
        ledgerTargets: this.currentTargets
      })
      if (value && !this.resourceOptions.length) {
        this.loadResources()
      }
    },
    handleNetworkChange(network) {
      const nextTargets = Object.assign({}, this.currentTargets, {
        network,
        resourcePath: ''
      })
      this.emitTargets(nextTargets)
    },
    handleResourceChange(resourcePath) {
      const nextTargets = Object.assign({}, this.currentTargets, {
        network: this.currentTargets.network || this.getNetworkFromPath(resourcePath),
        resourcePath
      })
      this.emitTargets(nextTargets)
    },
    emitTargets(targets) {
      this.$emit('update:ledgerTargets', targets)
      this.$emit('change', {
        writeLedger: this.writeLedger,
        ledgerTargets: targets
      })
    },
    handleDropdownVisible(visible) {
      if (visible && !this.resourceOptions.length && !this.resourceLoading) {
        this.loadResources()
      }
    },
    async loadResources() {
      this.resourceLoading = true
      this.resourceError = ''
      try {
        const response = await getResourceList({ path: null, offset: 0, size: 1000 }, null)
        if (response.errorCode !== 0) {
          throw new Error(response.message || '资源列表加载失败')
        }
        this.resourceOptions = (response.data.resourceDetails || []).filter(resource => resource.path)
      } catch (error) {
        this.resourceOptions = []
        this.resourceError = '未能加载 WeCross 资源列表，请稍后重试'
      } finally {
        this.resourceLoading = false
      }
    },
    getNetworkFromPath(resourcePath) {
      const parts = String(resourcePath || '').split('.').filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]}.${parts[1]}`
      }
      return resourcePath || ''
    }
  }
}
</script>

<style lang="scss" scoped>
.ledger-target-selector {
  padding: 12px 14px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.ledger-target-selector::v-deep .el-form-item {
  margin-bottom: 12px;
}
.switch-item {
  margin-bottom: 10px;
}
.resource-type {
  display: inline-block;
  margin-left: 16px;
  color: #909399;
  font-size: 12px;
}
.resource-alert {
  margin-top: 2px;
}
</style>
