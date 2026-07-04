<template>
  <div class="app-container homepage">
    <el-card class="intro-card" shadow="never">
      <el-row :gutter="24" type="flex" class="intro-row">
        <el-col :xs="24" :sm="24" :md="17" :lg="18">
          <h1>交通大模型数据可信共享与隐私保护平台</h1>
          <div class="tag-list">
            <el-tag v-for="tag in capabilityTags" :key="tag.text" :type="tag.type" effect="plain">{{ tag.text }}</el-tag>
          </div>
        </el-col>
        <el-col :xs="24" :sm="24" :md="7" :lg="6">
          <div v-loading="baseDataRefreshing" class="status-panel">
            <div class="status-head">
              <div class="status-title">数据接入状态</div>
              <el-button
                icon="el-icon-refresh-left"
                type="text"
                @click="refreshBaseData"
              >刷新</el-button>
            </div>
            <div class="status-value">
              <span :class="['status-dot', baseDataStatusClass]" />
              <span>{{ baseDataStatusText }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row v-loading="baseDataRefreshing" :gutter="16" class="section metrics-row">
      <el-col v-for="metric in metricCards" :key="metric.title" :xs="24" :sm="12" :md="6">
        <el-card class="metric-card is-clickable" shadow="never" @click.native="goMetric(metric.path)">
          <div class="metric-top">
            <span>{{ metric.title }}</span>
            <i :class="metric.icon" />
          </div>
          <div class="metric-value">
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.unit }}</span>
          </div>
          <div class="metric-desc">{{ metric.desc }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="section">
      <el-col :xs="24" :sm="24" :md="16">
        <el-card class="network-card equal-card" shadow="never">
          <div slot="header" class="table-header">
            <div>
              <h2>可信协同网络</h2>
              <p>展示当前接入的区块链网络与可信账本状态</p>
            </div>
            <el-button icon="el-icon-refresh-left" type="text" @click="refreshChainsInfo">刷新</el-button>
          </div>
          <el-table
            v-loading="chainsInfoLoading"
            :data="chainsInfo"
            height="300px"
            tooltip-effect="light"
          >
            <el-table-column
              prop="path"
              label="协同网络标识"
              min-width="170"
              show-overflow-tooltip
            />
            <el-table-column
              prop="type"
              label="底层链类型"
              min-width="170"
              show-overflow-tooltip
            >
              <template slot-scope="scope">
                <el-tag class="chain-type-tag" type="info">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="number"
              label="可信账本高度"
              min-width="120"
            />
            <el-table-column
              label="数据资产"
              min-width="100"
            >
              <template slot-scope="scope">
                <el-popover
                  placement="bottom"
                  width="600"
                  trigger="click"
                  @show="pushToResourceDetail(scope.row.path)"
                >
                  <ResourceShower :ref="scope.row.path" :key="chainSelect" :chain="chainSelect" :page-size="10" class="resource-popover" />
                  <el-button slot="reference" type="text" size="mini">查看资产</el-button>
                </el-popover>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              min-width="80"
            >
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click="$router.push({ path: 'resource', query: { path: scope.row.path } })">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="8">
        <el-card class="infra-card equal-card" shadow="never">
          <div slot="header" class="table-header">
            <div>
              <h2>基础设施状态</h2>
              <p>首页仅保留摘要，详细信息可折叠查看</p>
            </div>
            <el-button
              icon="el-icon-refresh-left"
              type="text"
              @click="refreshInfrastructureInfo"
            >刷新</el-button>
          </div>
          <el-collapse v-model="activeStatusPanels" v-loading="infrastructureRefreshing" accordion>
            <el-collapse-item title="运行环境" name="runtime">
              <div class="info-row">
                <span>操作系统</span>
                <strong>{{ osSummary }}</strong>
              </div>
              <div class="info-row">
                <span>内存</span>
                <strong>{{ memorySummary }}</strong>
              </div>
              <div class="info-row">
                <span>磁盘</span>
                <strong>{{ diskSummary }}</strong>
              </div>
              <div class="info-row">
                <span>JVM</span>
                <strong>{{ jvmSummary }}</strong>
              </div>
            </el-collapse-item>
            <el-collapse-item title="跨链基础设施" name="router">
              <div class="info-row">
                <span>Router 版本</span>
                <strong>{{ displayValue(routerInfo.version) }}</strong>
              </div>
              <div class="info-row">
                <span>RPC</span>
                <strong>{{ displayValue(routerInfo.rpcNetInfo) }}</strong>
              </div>
              <div class="info-row">
                <span>P2P</span>
                <strong>{{ displayValue(routerInfo.p2pNetInfo) }}</strong>
              </div>
              <div class="info-row">
                <span>已加载插件</span>
                <strong>{{ pluginSummary }}</strong>
              </div>
              <el-button class="detail-button" type="text" @click="pluginDialogVisible = true">查看详情</el-button>
            </el-collapse-item>
            <el-collapse-item title="密码学能力" name="crypto">
              <div class="info-row">
                <span>密码学组件</span>
                <strong>{{ displayValue(systemInfo.providerName) }}</strong>
              </div>
              <div class="info-row">
                <span>组件版本</span>
                <strong>{{ displayValue(systemInfo.providerVersion) }}</strong>
              </div>
              <div class="info-row">
                <span>椭圆曲线</span>
                <strong>{{ namedGroupsSummary }}</strong>
              </div>
              <div class="info-row">
                <span>国密支持</span>
                <strong>SM2 / SM3</strong>
              </div>
              <div class="detail-links">
                <el-button type="text" @click="namedGroupsDialogVisible = true">椭圆曲线详情</el-button>
                <el-button type="text" @click="providerDialogVisible = true">密码学组件详细信息</el-button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog title="已加载插件" :visible.sync="pluginDialogVisible" width="520px">
      <div class="dialog-content">{{ displayValue(routerInfo.supportedStubs) }}</div>
    </el-dialog>
    <el-dialog title="椭圆曲线配置" :visible.sync="namedGroupsDialogVisible" width="520px">
      <div class="dialog-content">{{ displayValue(systemInfo.namedGroups) }}</div>
    </el-dialog>
    <el-dialog title="密码学组件详细信息" :visible.sync="providerDialogVisible" width="640px">
      <div class="dialog-content">{{ displayValue(systemInfo.providerInfo) }}</div>
    </el-dialog>
  </div>
</template>

<script>
import { systemStatus, routerStatus } from '@/api/status'
import { listChains, listPeers, listZones } from '@/api/conn'
import { getResourceList } from '@/api/resource'
import ResourceShower from '@/components/ResourceShower'

function readSessionCache(key, fallback) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key))
    return value == null ? fallback : value
  } catch (error) {
    return fallback
  }
}

function writeSessionCache(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value))
}

export default {
  name: 'Homepage',
  components: { ResourceShower },
  props: {},
  data() {
    return {
      chainsInfoLoading: false,
      systemInfo: readSessionCache('homepage-system-info', {}),
      routerInfo: readSessionCache('homepage-router-info', {}),
      chainsInfo: readSessionCache('homepage-chains-info', []),
      chainNumber: readSessionCache('homepage-chain-count', 0),
      routerNumber: readSessionCache('homepage-peer-count', 0),
      chainLoadAttempts: 0,
      peerLoadAttempts: 0,
      resourceNumber: readSessionCache('homepage-resource-count', 0),
      baseDataRefreshing: false,
      infrastructureRefreshing: false,
      initialLoadTimer: null,
      transactionType: [
        {
          label: 'XA 两阶段事务',
          disabled: false
        },
        {
          label: 'HTLC（暂未启用）',
          disabled: true
        }
      ],
      chainSelect: null,
      activeStatusPanels: 'runtime',
      pluginDialogVisible: false,
      namedGroupsDialogVisible: false,
      providerDialogVisible: false,
      requestStatus: {
        system: null,
        router: null,
        chains: null,
        peers: null,
        resources: null
      },
      capabilityTags: [
        { text: '区块链可信存证', type: 'success' },
        { text: '交通数据资产', type: 'primary' },
        { text: '云边端协同', type: 'warning' },
        { text: '隐私保护', type: 'danger' }
      ]
    }
  },
  computed: {
    enabledTransactionTypes() {
      return this.transactionType.filter(item => !item.disabled)
    },
    metricCards() {
      return [
        {
          title: '协同链网络',
          icon: 'el-icon-share',
          value: this.chainsInfo.length || this.chainNumber,
          unit: '条',
          desc: '已接入的底层区块链网络',
          path: 'transaction'
        },
        {
          title: '协同接入节点',
          icon: 'el-icon-connection',
          value: this.routerNumber,
          unit: '个',
          desc: '参与跨链通信的 Router/Peer 节点',
          path: 'router'
        },
        {
          title: '可信数据资产',
          icon: 'el-icon-files',
          value: this.resourceNumber,
          unit: '个',
          desc: '可发现和调用的链上资源',
          path: 'resource'
        },
        {
          title: '跨域协同模式',
          icon: 'el-icon-s-operation',
          value: this.enabledTransactionTypes.length,
          unit: '类',
          desc: '当前支持的跨链事务模式',
          path: 'xaTransaction'
        }
      ]
    },
    baseDataStatusText() {
      const statuses = Object.keys(this.requestStatus).map(key => this.requestStatus[key])
      if (statuses.some(status => status === false)) {
        return '部分数据获取异常'
      }
      return statuses.every(status => status === true) ? '基础数据已接入' : '基础数据接入中'
    },
    baseDataStatusClass() {
      if (this.baseDataStatusText === '部分数据获取异常') {
        return 'is-warning'
      }
      return this.baseDataStatusText === '基础数据已接入' ? 'is-success' : 'is-info'
    },
    pluginList() {
      return this.splitTextList(this.routerInfo.supportedStubs)
    },
    pluginSummary() {
      if (this.pluginList.length === 0) {
        return '-'
      }
      return 'BCOS、Fabric 等 ' + this.pluginList.length + ' 类插件'
    },
    namedGroupsList() {
      return this.splitTextList(this.systemInfo.namedGroups)
    },
    namedGroupsSummary() {
      if (this.namedGroupsList.length === 0) {
        return '未配置'
      }
      return '已配置 ' + this.namedGroupsList.length + ' 组椭圆曲线'
    },
    osSummary() {
      const items = [this.systemInfo.osName, this.systemInfo.osArch].filter(Boolean)
      return items.length > 0 ? items.join(' ') : '-'
    },
    memorySummary() {
      if (!this.systemInfo.freeMemorySize && !this.systemInfo.totalMemorySize) {
        return '-'
      }
      return this.displayValue(this.systemInfo.freeMemorySize) + ' / ' + this.displayValue(this.systemInfo.totalMemorySize)
    },
    diskSummary() {
      if (!this.systemInfo.totalDiskFreeSpace && !this.systemInfo.totalDiskSpace) {
        return '-'
      }
      return this.displayValue(this.systemInfo.totalDiskFreeSpace) + ' / ' + this.displayValue(this.systemInfo.totalDiskSpace)
    },
    jvmSummary() {
      if (!this.systemInfo.javaVMName && !this.systemInfo.javaVMVersion) {
        return '-'
      }
      const name = this.systemInfo.javaVMName && this.systemInfo.javaVMName.indexOf('OpenJDK') !== -1 ? 'OpenJDK' : this.displayValue(this.systemInfo.javaVMName)
      const version = this.getMajorVersion(this.systemInfo.javaVMVersion)
      return version === '-' ? name : name + ' ' + version
    }
  },
  mounted() {
    this.initialLoadTimer = setTimeout(() => {
      this.refreshBaseData()
      this.refreshChainsInfo()
    }, 600)
  },
  beforeDestroy() {
    if (this.initialLoadTimer) clearTimeout(this.initialLoadTimer)
  },
  methods: {
    displayValue(value) {
      if (value === null || typeof value === 'undefined' || value === '') {
        return '-'
      }
      return value
    },
    splitTextList(value) {
      if (!value) {
        return []
      }
      return String(value).split(/[,，\s]+/).map(item => item.trim()).filter(Boolean)
    },
    getMajorVersion(value) {
      if (!value) {
        return '-'
      }
      const match = String(value).match(/\d+/)
      return match ? match[0] : String(value)
    },
    goMetric(path) {
      if (path) {
        this.$router.push({ path: path })
      }
    },
    setRequestStatus(key, status) {
      this.$set(this.requestStatus, key, status)
    },
    refreshBaseData() {
      this.baseDataRefreshing = true
      return Promise.all([
        this.refreshInfrastructureInfo(false),

        this.getRouterNumber(),
        this.getResourceNumber()
      ]).finally(() => {
        this.baseDataRefreshing = false
      })
    },
    refreshInfrastructureInfo(showLoading = true) {
      if (showLoading) {
        this.infrastructureRefreshing = true
      }
      return Promise.all([
        this.refreshSystemInfo(),
        this.refreshRouterInfo()
      ]).finally(() => {
        if (showLoading) {
          this.infrastructureRefreshing = false
        }
      })
    },
    refreshSystemInfo() {
      return systemStatus().then(response => {
        if (!response.data || Object.keys(response.data).length === 0) {
          this.$message.error('本地系统信息返回为空，请检查后台信息')
          this.setRequestStatus('system', false)
          return
        }
        this.systemInfo = response.data
        writeSessionCache('homepage-system-info', response.data)
        this.setRequestStatus('system', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取系统信息失败，网络错误'
        })
        this.setRequestStatus('system', false)
      })
    },
    refreshRouterInfo() {
      return routerStatus().then(response => {
        if (!response.data || Object.keys(response.data).length === 0) {
          this.$message.error('路由信息返回为空，请检查后台信息')
          this.setRequestStatus('router', false)
          return
        }
        this.routerInfo = response.data
        writeSessionCache('homepage-router-info', response.data)
        this.setRequestStatus('router', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取路由信息失败，网络错误'
        })
        this.setRequestStatus('router', false)
      })
    },
    refreshChainsInfo() {
      this.chainsInfoLoading = true

      return listZones(null).then(response => {
        const zones = response.data && response.data.data ? response.data.data : []
        return Promise.all(zones.map(zone => listChains({ zone: zone })))
      }).then(responses => {
        const chainsInfo = []
        responses.forEach(res => {
          const chains = res.data && res.data.data ? res.data.data : []
          chains.forEach(chain => {
            chainsInfo.push({
              path: chain.zone + '.' + chain.chain,
              type: chain.type,
              number: chain.blockNumber
            })
          })
        })
        if (chainsInfo.length === 0 && this.chainLoadAttempts < 2) {
          this.chainLoadAttempts += 1
          setTimeout(() => this.refreshChainsInfo(), 800)
          return
        }
        this.chainLoadAttempts = 0
        if (chainsInfo.length === 0 && this.chainNumber > 0) return
        this.chainsInfo = chainsInfo
        writeSessionCache('homepage-chains-info', chainsInfo)
        this.chainNumber = chainsInfo.length
        writeSessionCache('homepage-chain-count', chainsInfo.length)
        this.setRequestStatus('chains', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取 Chains 信息失败，网络错误'
        })
        this.setRequestStatus('chains', false)
      }).finally(() => {
        this.chainsInfoLoading = false
      })
    },
    getChainNumber() {
      return listZones(null).then(response => {
        const zones = response.data && response.data.data ? response.data.data : []
        return Promise.all(zones.map(zone => listChains({ zone: zone })))
      }).then(responses => {
        let chainNumber = 0
        responses.forEach(res => {
          const chains = res.data && res.data.data ? res.data.data : []
          chainNumber += chains.length
        })
        this.chainNumber = chainNumber
        this.setRequestStatus('chains', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取 Chains 信息失败，网络错误'
        })
        this.setRequestStatus('chains', false)
      })
    },
    getRouterNumber() {
      return listPeers(null).then(response => {
        const peers = response.data && response.data.data ? response.data.data : []
        if (peers.length === 0 && this.peerLoadAttempts < 2) {
          this.peerLoadAttempts += 1
          setTimeout(() => this.getRouterNumber(), 800)
          return
        }
        this.peerLoadAttempts = 0
        if (peers.length === 0 && this.routerNumber > 0) return
        this.routerNumber = peers.length
        writeSessionCache('homepage-peer-count', peers.length)
        this.setRequestStatus('peers', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取 Peers 信息失败，网络错误'
        })
        this.setRequestStatus('peers', false)
      })
    },
    getResourceNumber() {
      return getResourceList(null, {
        version: 1,
        data: {
          ignoreRemote: false
        }
      }).then(response => {
        const resourceDetails = response.data && response.data.resourceDetails ? response.data.resourceDetails : []
        this.resourceNumber = resourceDetails.length
        writeSessionCache('homepage-resource-count', resourceDetails.length)
        this.setRequestStatus('resources', true)
      }).catch(_ => {
        this.$message({
          type: 'error',
          message: '获取 Resource 信息失败，网络错误'
        })
        this.setRequestStatus('resources', false)
      })
    },
    pushToResourceDetail(path) {
      this.chainSelect = path
      this.$nextTick(() => {
        const resourceRef = this.$refs[this.chainSelect]
        const resourceShower = Array.isArray(resourceRef) ? resourceRef[0] : resourceRef
        if (resourceShower && resourceShower.refresh) {
          resourceShower.refresh()
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
// .homepage {
//   background: #f5f7fb;
// }

.section {
  margin-top: 16px;
}

.intro-card,
.metric-card,
.network-card,
.infra-card {
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.intro-row {
  align-items: center;
}

.intro-card {
  h1 {
    margin: 0 0 18px;
    color: #1f2d3d;
    font-size: 26px;
    line-height: 34px;
    font-weight: 700;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .el-tag {
    cursor: default;
    transition: background-color .2s ease, border-color .2s ease, box-shadow .2s ease, transform .2s ease;

    &:hover {
      box-shadow: 0 5px 14px rgba(64, 158, 255, .16);
      transform: translateY(-1px);
    }
  }
}

.status-panel {
  height: 100%;
  min-height: 82px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.status-title {
  color: #606266;
  font-size: 14px;
}

.status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .el-button {
    padding: 0;
  }
}

.status-value {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #303133;
  font-size: 18px;
  font-weight: 700;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;

  &.is-success {
    background: #67c23a;
  }

  &.is-warning {
    background: #e6a23c;
  }

  &.is-info {
    background: #909399;
  }
}

.metrics-row .el-col {
  margin-bottom: 16px;
}

.metric-card {
  min-height: 154px;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 6px 18px rgba(31, 45, 61, .08);
      transform: translateY(-1px);
    }
  }
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #303133;
  font-size: 16px;
  font-weight: 700;

  i {
    color: #409eff;
    font-size: 24px;
  }
}

.metric-value {
  margin-top: 22px;

  strong {
    color: #1677d2;
    font-size: 34px;
    line-height: 42px;
    text-shadow: 0 4px 12px rgba(64, 158, 255, .18);
  }

  span {
    margin-left: 6px;
    color: #606266;
    font-size: 14px;
    font-weight: 400;
  }
}

.metric-desc {
  margin-top: 12px;
  color: #606266;
  font-size: 13px;
  line-height: 20px;
}

.equal-card {
  height: 430px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    color: #303133;
    font-size: 17px;
    line-height: 24px;
  }

  p {
    margin: 6px 0 0;
    color: #909399;
    font-size: 13px;
    line-height: 20px;
  }

  .el-button {
    padding: 0;
  }
}

.chain-type-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.resource-popover {
  height: 400px;
  width: 100%;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: #606266;
  font-size: 13px;
  line-height: 20px;

  span {
    flex: 0 0 86px;
    color: #909399;
  }

  strong {
    flex: 1;
    color: #303133;
    font-weight: 500;
    text-align: right;
    word-break: break-word;
  }
}

.detail-button,
.detail-links .el-button {
  padding: 6px 0 0;
}

.detail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-content {
  color: #303133;
  font-size: 14px;
  line-height: 24px;
  word-break: break-word;
  white-space: pre-wrap;
}

@media (max-width: 992px) {
  .intro-row {
    display: block;
  }

  .status-panel {
    margin-top: 16px;
  }

  .equal-card {
    height: auto;
    margin-bottom: 16px;
  }
}
</style>
