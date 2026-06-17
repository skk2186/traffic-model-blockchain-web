<template>
  <div class="app-container resource-manager">
    <el-card>
      <div class="resource-manager__header">
        <div>
          <h2 class="resource-manager__title">交通数据资产</h2>
          <p class="resource-manager__desc">统一发现、登记和调用不同协同链网络中的交通数据资源</p>
        </div>
        <el-button id="resourceDeploy" icon="el-icon-upload" type="primary" @click="onDeploy">登记数据资产</el-button>
      </div>

      <el-row :gutter="16" class="resource-manager__content">
        <el-col class="resource-manager__col" :xs="24" :sm="24" :md="7" :lg="6">
          <el-card class="network-panel">
            <div slot="header" class="network-panel__header">
              <div>
                <span class="network-panel__title">协同网络</span>
                <p class="network-panel__desc">请选择数据资产所属的链网络</p>
              </div>
              <!-- <el-tooltip id="resourceHelp" effect="light" content="如何使用数据资产目录？" placement="top">
                <el-button type="text" size="mini" class="network-panel__help" @click="howToUseResource">
                  <svg-icon style="vertical-align: 0px" icon-class="question" />
                </el-button>
              </el-tooltip> -->
            </div>
            <div class="network-panel__tree">
              <ChainExplorer id="ChainExplorer" :chain="currentChain" @zone-click="onZoneClick" @chain-click="onChainClick" />
            </div>
          </el-card>
        </el-col>
        <el-col class="resource-manager__col" :xs="24" :sm="24" :md="17" :lg="18">
          <el-card class="resource-panel">
            <div slot="header" class="resource-panel__header">
              <div class="resource-panel__heading">
                <span class="resource-panel__title">数据资产目录</span>
                <div class="resource-panel__chain">
                  <span>当前协同网络：</span>
                  <el-tag v-if="currentChain" type="info" size="mini">{{ currentChain }}</el-tag>
                  <span v-else class="resource-panel__chain-empty">未选择</span>
                </div>
              </div>
              <el-button icon="el-icon-refresh" size="mini" :disabled="!currentChain" :loading="resourceRefreshing" @click="refreshResource">刷新</el-button>
            </div>
            <ResourceExplorer id="ResourceExplorer" ref="ResourceExplorer" :chain="currentChain" :page-size="1024" @loading-change="resourceRefreshing = $event" />
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import ChainExplorer from '@/components/ChainExplorer'
import ResourceExplorer from '@/components/ResourceExplorer'
import { resourceManagerSteps } from './resourceSteps/resourceManagerSteps'
import introJS from 'intro.js'
import 'intro.js/introjs.css'
import 'intro.js/themes/introjs-modern.css'

export default {
  name: 'ResourceManager',
  components: {
    ChainExplorer,
    ResourceExplorer
  },
  props: {},
  data() {
    return {
      currentZone: undefined,
      currentChain: undefined,
      currentChainData: {},
      resourceRefreshing: false,
      searchPath: null
    }
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      if (typeof vm.currentChain !== 'undefined' && vm.currentChain !== null) {
        vm.$refs.ResourceExplorer.refresh()
      }
    })
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
    onDeploy() {
      this.$router.push({
        path: 'resourceDeployment',
        query: {
          stubType: this.currentChainData.type,
          path: this.currentChain
        }
      })
    },
    refreshResource() {
      if (this.currentChain) {
        this.$refs.ResourceExplorer.refresh(true)
      }
    },
    howToUseResource() {
      introJS().setOptions({
        prevLabel: '上一步',
        nextLabel: '下一步',
        doneLabel: '结束',
        disableInteraction: true,
        steps: resourceManagerSteps
      }).start()
    }
  }
}
</script>

<style lang="scss" scoped>
// .resource-manager {
//   min-height: calc(100vh - 84px);
//   background: #f5f7fa;
// }

.resource-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.resource-manager__title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  // line-height: 32px;
}

.resource-manager__desc {
  margin: 4px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.resource-manager__content {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.resource-manager__col {
  display: flex;
}

.network-panel,
.resource-panel {
  width: 100%;
  height: 500px;
}

.network-panel {
  margin-bottom: 16px;
}

.network-panel::v-deep .el-card__body {
  height: calc(100% - 77px);
  padding: 0;
}

.resource-panel::v-deep .el-card__body {
  box-sizing: border-box;
  height: calc(100% - 77px);
  padding: 12px 16px;
}

.network-panel__header,
.resource-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.network-panel__title,
.resource-panel__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.network-panel__desc {
  margin: 2px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 20px;
}

.network-panel__help {
  padding: 0;
  margin-left: 10px;
}

.network-panel__tree {
  height: 100%;
  overflow-y: auto;
  padding: 12px 16px;
}

.resource-panel__heading {
  min-width: 0;
}

.resource-panel__chain {
  display: flex;
  align-items: center;
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
  line-height: 22px;
}

.resource-panel__chain .el-tag {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-panel__chain-empty {
  color: #909399;
}

@media (max-width: 992px) {
  .network-panel,
  .resource-panel {
    height: 430px;
  }
}
</style>
