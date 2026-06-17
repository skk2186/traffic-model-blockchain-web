<template>
  <div class="app-container audit-manager">
    <el-card>
      <div class="audit-manager__header">
        <div>
          <h2 class="audit-manager__title">可信共享审计</h2>
          <p class="audit-manager__desc">查询不同协同链网络中的数据调用记录、操作主体与链上执行凭证</p>
        </div>
      </div>

      <el-row :gutter="16" class="audit-manager__content">
        <el-col class="audit-manager__col" :xs="24" :sm="24" :md="7" :lg="6">
          <el-card class="audit-network-panel">
            <div slot="header" class="audit-network-panel__header">
              <div>
                <span class="audit-network-panel__title">协同网络</span>
                <p class="audit-network-panel__desc">请选择需要审计的链网络</p>
              </div>
              <!-- <el-tooltip id="transactionHelp" effect="light" content="如何使用可信共享审计？" placement="top">
                <el-button type="text" size="mini" class="audit-network-panel__help" @click="howToUseTransaction">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip> -->
            </div>
            <div class="audit-network-panel__tree">
              <ChainExplorer id="ChainExplorer" :chain="currentChain" @zone-click="onZoneClick" @chain-click="onChainClick" />
            </div>
          </el-card>
        </el-col>
        <el-col class="audit-manager__col" :xs="24" :sm="24" :md="17" :lg="18">
          <el-card class="audit-record-panel">
            <div slot="header" class="audit-record-panel__header">
              <div class="audit-record-panel__heading">
                <span class="audit-record-panel__title">共享审计记录</span>
                <div class="audit-record-panel__chain">
                  <span>当前协同网络：</span>
                  <el-tag v-if="currentChain" type="info" size="mini">{{ currentChain }}</el-tag>
                  <span v-else class="audit-record-panel__chain-empty">未选择</span>
                </div>
              </div>
              <el-button icon="el-icon-refresh" size="mini" :disabled="!currentChain" @click="handleSearch">刷新</el-button>
            </div>
            <TransactionListExplorer
              id="TransactionListExplorer"
              ref="transactionList"
              :chain="currentChain"
            />
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import ChainExplorer from '@/components/ChainExplorer'
import TransactionListExplorer from '@/components/TransactionListExplorer'
import { transactionManagerSteps } from './transactionSteps/transactionManagerSteps'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'

export default {
  name: 'TransactionManager',
  components: {
    ChainExplorer,
    TransactionListExplorer
  },
  props: {},
  beforeRouteEnter(to, from, next) {
    next(vm => {
      if (vm.currentChain !== null) {
        vm.$refs.transactionList.handleSearch(vm.currentChain)
      }
    })
  },
  data() {
    return {
      currentZone: null,
      currentChain: null,
      currentChainData: {},
      searchPath: null
    }
  },
  methods: {
    onZoneClick(path) {
      if (this.currentZone !== path) {
        this.currentZone = path
      }
    },
    onChainClick(path, data) {
      if (this.currentChain !== path) {
        this.currentChain = path
        this.currentChainData = data
        this.currentZone = path.split('.')[0]
      }
    },
    handleSearch() {
      if (this.currentChain === null || this.currentChainData === null) {
        return
      }
      this.$refs.transactionList.handleSearch(
        this.currentChain,
        this.currentChainData.type
      )
    },
    howToUseTransaction() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: transactionManagerSteps
      }).start()
    }
  }
}
</script>

<style lang="scss" scoped>
.audit-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.audit-manager__title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.audit-manager__desc {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.audit-manager__content {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.audit-manager__col {
  display: flex;
}

.audit-network-panel,
.audit-record-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 560px;
  min-height: 0;
}

.audit-network-panel {
  margin-bottom: 0;
}

.audit-network-panel::v-deep .el-card__body {
  flex: 1;
  height: auto;
  min-height: 0;
  padding: 0;
}

.audit-record-panel::v-deep .el-card__body {
  box-sizing: border-box;
  flex: 1;
  height: auto;
  min-height: 0;
  padding: 12px 16px 0;
}

.audit-network-panel__header,
.audit-record-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.audit-network-panel__title,
.audit-record-panel__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.audit-network-panel__desc {
  margin: 2px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}

.audit-network-panel__help {
  padding: 0;
  margin-left: 10px;
}

.audit-network-panel__tree {
  height: 100%;
  overflow-y: auto;
  padding: 12px 16px;
}

.audit-record-panel__heading {
  min-width: 0;
}

.audit-record-panel__chain {
  display: flex;
  align-items: center;
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.audit-record-panel__chain .el-tag {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-record-panel__chain-empty {
  color: #909399;
}

@media (max-width: 991px) {
  .audit-network-panel {
    margin-bottom: 16px;
  }
}
</style>
