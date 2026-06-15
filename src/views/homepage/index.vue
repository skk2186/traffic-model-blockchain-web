<template>
  <div class="homepage-dashboard">
    <section class="hero-section">
      <div>
        <p class="hero-kicker">Trusted Traffic Data Collaboration</p>
        <h1>交通大模型数据可信共享与隐私保护平台</h1>
        <p class="hero-desc">面向交通数据跨域共享、模型协同与可信监管的一体化区块链管理平台。</p>
        <!-- <p class="hero-subtitle">Blockchain-Enabled Cloud-Edge-End Federated Collaboration Platform</p> -->
      </div>
      <div class="hero-status">
        <span :class="['status-dot', hasError ? 'is-error' : 'is-normal']" />
        <span>{{ hasError ? '部分数据获取异常' : '平台基础数据已接入' }}</span>
      </div>
    </section>

    <div class="metric-grid">
      <el-card v-for="metric in metrics" :key="metric.key" class="metric-card" shadow="never" @click.native="goTo(metric.route)">
        <div class="metric-main">
          <div>
            <p class="metric-title">{{ metric.title }}</p>
            <p class="metric-desc">{{ metric.desc }}</p>
          </div>
          <i :class="['metric-icon', metric.icon]" />
        </div>
        <div class="metric-value">
          <span>{{ metric.value }}</span>
          <small>{{ metric.unit }}</small>
        </div>
      </el-card>
    </div>

    <el-row :gutter="16">
      <el-col :span="24">
        <el-card class="dashboard-card capability-card" shadow="never">
          <div slot="header" class="card-header">
            <div>
              <span>隐私保护与可信能力</span>
              <p>能力说明不代表实时运行指标。</p>
            </div>
          </div>
          <div class="capability-list">
            <div v-for="item in trustedCapabilities" :key="item.name" class="capability-item is-ready">
              <i class="el-icon-check" />
              <div>
                <span>{{ item.name }}</span>
                <small>{{ item.desc }}</small>
              </div>
            </div>
            <div v-for="item in plannedCapabilities" :key="item.name" class="capability-item is-plan">
              <i class="el-icon-time" />
              <div>
                <span>{{ item.name }}</span>
                <small>{{ item.desc }}</small>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="15">
        <el-card class="dashboard-card asset-card" shadow="never">
          <div slot="header" class="card-header">
            <div>
              <span>可信数据资产</span>
              <p>基于链和资源接口展示，原始字段未修改。</p>
            </div>
            <el-button icon="el-icon-refresh-left" type="text" :loading="chainsInfoLoading" @click="refreshChainsInfo">刷新</el-button>
          </div>
          <el-alert
            v-if="errors.chains"
            :title="errors.chains"
            type="error"
            show-icon
            :closable="false"
            class="dashboard-alert"
          />
          <el-table
            v-loading="chainsInfoLoading"
            :data="chainsInfo"
            class="dashboard-table"
            height="300px"
            tooltip-effect="light"
            empty-text="暂无链网络与数据资产信息"
          >
            <el-table-column prop="path" label="协同网络标识" min-width="160px" show-overflow-tooltip />
            <el-table-column prop="type" label="底层链类型" min-width="110px">
              <template slot-scope="scope">
                <el-tag type="info">{{ scope.row.type || '未知' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="number" label="可信账本高度" min-width="120px">
              <template slot-scope="scope">{{ formatValue(scope.row.number) }}</template>
            </el-table-column>
            <el-table-column label="数据资产详情" width="130px">
              <template slot-scope="scope">
                <el-popover
                  placement="bottom"
                  width="680"
                  trigger="click"
                  popper-class="dashboard-resource-popover"
                  @show="pushToResourceDetail(scope.row.path)"
                >
                  <ResourceShower :ref="scope.row.path" :key="chainSelect" :chain="chainSelect" :page-size="10" class="resource-popover" />
                  <el-button slot="reference" type="text" size="mini">查看详情</el-button>
                </el-popover>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="9">
        <el-card class="dashboard-card status-card" shadow="never">
          <div slot="header" class="card-header">
            <div>
              <span>平台运行状态</span>
              <p>基础环境信息已降低展示优先级。</p>
            </div>
            <el-button icon="el-icon-refresh-left" type="text" :loading="systemLoading || routerLoading" @click="refreshStatusInfo">刷新</el-button>
          </div>
          <el-alert
            v-if="errors.system || errors.router"
            :title="errors.system || errors.router"
            type="error"
            show-icon
            :closable="false"
            class="dashboard-alert"
          />
          <el-collapse v-model="activeStatus" accordion>
            <el-collapse-item title="平台运行状态" name="system">
              <dl v-loading="systemLoading" class="status-list">
                <template v-for="item in systemStatusItems">
                  <dt :key="item.label + '-label'">{{ item.label }}</dt>
                  <dd :key="item.label + '-value'">{{ item.value }}</dd>
                </template>
              </dl>
            </el-collapse-item>
            <el-collapse-item title="区块链基础设施状态" name="router">
              <dl v-loading="routerLoading" class="status-list">
                <template v-for="item in routerStatusItems">
                  <dt :key="item.label + '-label'">{{ item.label }}</dt>
                  <dd :key="item.label + '-value'">{{ item.value }}</dd>
                </template>
              </dl>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { systemStatus, routerStatus } from '@/api/status'
import { listChains, listPeers, listZones } from '@/api/conn'
import { getResourceList } from '@/api/resource'
import ResourceShower from '@/components/ResourceShower'

export default {
  name: 'Homepage',
  components: { ResourceShower },
  data() {
    return {
      chainsInfoLoading: false,
      systemLoading: false,
      routerLoading: false,
      systemInfo: {},
      routerInfo: {},
      chainsInfo: [],
      chainNumber: 0,
      routerNumber: 0,
      resourceNumber: 0,
      transactionType: [
        {
          label: '两阶段事务',
          disabled: false
        },
        {
          label: 'HTLC',
          disabled: true
        }
      ],
      chainSelect: null,
      activeStatus: 'system',
      errors: {
        system: '',
        router: '',
        chains: '',
        peers: '',
        resources: ''
      },
      trustedCapabilities: [
        { name: '链上身份认证', desc: '基于链账户和平台用户完成身份管理' },
        { name: '数据访问控制', desc: '通过平台角色和链资源访问策略承载' },
        { name: '数据可信存证', desc: '依托区块链账本记录共享行为' },
        { name: '共享过程审计', desc: '通过交易和事务记录追踪调用过程' },
        { name: '跨链事务一致性', desc: '支持 XA 跨链事务协同' },
        { name: '国密算法支持', desc: '复用现有密码学组件能力' }
      ]
    }
  },
  computed: {
    enabledTransactionTypes() {
      return this.transactionType.filter(item => !item.disabled)
    },
    maxBlockNumber() {
      if (this.chainsInfo.length === 0) {
        return 0
      }
      return Math.max(...this.chainsInfo.map(item => Number(item.number) || 0))
    },
    metrics() {
      return [
        {
          key: 'chain',
          title: '协同链网络',
          value: this.chainNumber,
          unit: '条',
          desc: '已接入的区块链网络',
          icon: 'el-icon-s-grid',
          route: '/resource/resourceList'
        },
        {
          key: 'router',
          title: '云边协同节点',
          value: this.routerNumber,
          unit: '个',
          desc: '来自 Peer/Router 接入信息',
          icon: 'el-icon-connection',
          route: '/router/routerManager'
        },
        {
          key: 'resource',
          title: '可信数据资产',
          value: this.resourceNumber,
          unit: '个',
          desc: '跨域可发现的数据资源',
          icon: 'el-icon-files',
          route: '/resource/resourceList'
        },
        {
          key: 'transaction',
          title: '跨域协同能力',
          value: this.enabledTransactionTypes.length,
          unit: '类',
          desc: this.enabledTransactionTypes.map(item => item.label).join('、') || '暂无已启用事务模式',
          icon: 'el-icon-s-order',
          route: '/xaTransaction/xaTransactionList'
        },
        {
          key: 'block',
          title: '可信账本高度',
          value: this.maxBlockNumber,
          unit: '最高',
          desc: '来自链 blockNumber 字段',
          icon: 'el-icon-data-line',
          route: '/transaction/transactionList'
        }
      ]
    },
    hasError() {
      return Object.keys(this.errors).some(key => !!this.errors[key])
    },
    systemStatusItems() {
      return [
        { label: '操作系统名称', value: this.formatValue(this.systemInfo.osName) },
        { label: '操作系统架构', value: this.formatValue(this.systemInfo.osArch) },
        { label: '操作系统版本', value: this.formatValue(this.systemInfo.osVersion) },
        { label: '磁盘剩余情况', value: this.joinStatus(this.systemInfo.totalDiskFreeSpace, this.systemInfo.totalDiskSpace) },
        { label: '内存剩余情况', value: this.joinStatus(this.systemInfo.freeMemorySize, this.systemInfo.totalMemorySize) },
        { label: 'JVM名称', value: this.formatValue(this.systemInfo.javaVMName) },
        { label: 'JVM供应商', value: this.formatValue(this.systemInfo.javaVMVendor) },
        { label: 'JVM版本', value: this.formatValue(this.systemInfo.javaVMVersion) },
        { label: '密码学组件名', value: this.formatValue(this.systemInfo.providerName) },
        { label: '密码学组件版本', value: this.formatValue(this.systemInfo.providerVersion) },
        { label: '已配置的椭圆曲线', value: this.formatValue(this.systemInfo.namedGroups) },
        { label: '密码学组件详细信息', value: this.formatValue(this.systemInfo.providerInfo) }
      ]
    },
    routerStatusItems() {
      return [
        { label: '跨链路由版本', value: this.formatValue(this.routerInfo.version) },
        { label: '已加载的插件', value: this.formatValue(this.routerInfo.supportedStubs) },
        { label: 'RPC接入配置', value: this.formatValue(this.routerInfo.rpcNetInfo) },
        { label: 'P2P接入配置', value: this.formatValue(this.routerInfo.p2pNetInfo) },
        { label: '管理员账号', value: this.formatValue(this.routerInfo.adminAccount) }
      ]
    }
  },
  created() {
    this.loadDashboardData()
  },
  methods: {
    loadDashboardData() {
      this.refreshStatusInfo()
      this.refreshChainsInfo()
      this.getRouterNumber()
      this.getResourceNumber()
    },
    refreshStatusInfo() {
      this.loadSystemStatus()
      this.loadRouterStatus()
    },
    loadSystemStatus() {
      this.systemLoading = true
      this.errors.system = ''
      systemStatus().then(response => {
        if (!response.data) {
          this.systemInfo = {}
          this.errors.system = '本地系统信息返回为空，请检查后台信息'
          this.$message.error(this.errors.system)
          return
        }
        this.systemInfo = response.data
      }).catch(() => {
        this.errors.system = '获取系统信息失败，网络错误'
        this.$message({
          type: 'error',
          message: this.errors.system
        })
      }).finally(() => {
        this.systemLoading = false
      })
    },
    loadRouterStatus() {
      this.routerLoading = true
      this.errors.router = ''
      routerStatus().then(response => {
        if (!response.data) {
          this.routerInfo = {}
          this.errors.router = '路由信息返回为空，请检查后台信息'
          this.$message.error(this.errors.router)
          return
        }
        this.routerInfo = response.data
      }).catch(() => {
        this.errors.router = '获取插件列表失败，网络错误'
        this.$message({
          type: 'error',
          message: this.errors.router
        })
      }).finally(() => {
        this.routerLoading = false
      })
    },
    refreshChainsInfo() {
      this.chainsInfoLoading = true
      this.errors.chains = ''
      this.chainsInfo = []
      listZones(null).then(response => {
        const zones = response.data && response.data.data ? response.data.data : []
        if (zones.length === 0) {
          this.chainNumber = 0
          return []
        }
        return Promise.all(zones.map(zone => {
          return listChains({ zone: zone }).then(res => {
            const chains = res.data && res.data.data ? res.data.data : []
            return chains.map(chain => ({
              path: chain.zone + '.' + chain.chain,
              type: chain.type,
              number: chain.blockNumber
            }))
          })
        }))
      }).then(results => {
        const chainsInfo = Array.isArray(results) ? [].concat(...results) : []
        this.chainsInfo = chainsInfo
        this.chainNumber = chainsInfo.length
      }).catch(() => {
        this.errors.chains = '获取Chains或Zones信息失败，网络错误'
        this.$message({
          type: 'error',
          message: this.errors.chains
        })
      }).finally(() => {
        this.chainsInfoLoading = false
      })
    },
    getRouterNumber() {
      this.errors.peers = ''
      listPeers(null).then(response => {
        const peers = response.data && response.data.data ? response.data.data : []
        this.routerNumber = peers.length
      }).catch(() => {
        this.routerNumber = 0
        this.errors.peers = '获取Peers信息失败，网络错误'
        this.$message({
          type: 'error',
          message: this.errors.peers
        })
      })
    },
    getResourceNumber() {
      this.errors.resources = ''
      getResourceList(null, {
        version: 1,
        data: {
          ignoreRemote: false
        }
      }).then(response => {
        const resourceDetails = response.data && response.data.resourceDetails ? response.data.resourceDetails : []
        this.resourceNumber = resourceDetails.length
      }).catch(() => {
        this.resourceNumber = 0
        this.errors.resources = '获取Resource信息失败，网络错误'
        this.$message({
          type: 'error',
          message: this.errors.resources
        })
      })
    },
    pushToResourceDetail(path) {
      this.chainSelect = path
      this.$nextTick(() => {
        if (this.$refs[this.chainSelect]) {
          this.$refs[this.chainSelect].refresh()
        }
      })
    },
    goTo(route) {
      if (route) {
        this.$router.push({ path: route })
      }
    },
    formatValue(value) {
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join('、') : '暂无'
      }
      if (value === null || typeof value === 'undefined' || value === '') {
        return '暂无'
      }
      return value
    },
    joinStatus(current, total) {
      if (!current && !total) {
        return '暂无'
      }
      return this.formatValue(current) + ' / ' + this.formatValue(total)
    }
  }
}
</script>

<style lang="scss" scoped>
.homepage-dashboard {
  min-height: calc(100vh - 50px);
  padding: 20px;
  background: #061426;
  color: #EAF6FF;
}

.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 26px 28px;
  margin-bottom: 16px;
  border: 1px solid rgba(55, 226, 255, 0.18);
  background: linear-gradient(135deg, rgba(13, 34, 59, 0.96), rgba(7, 26, 50, 0.92));

  h1 {
    margin: 8px 0 10px;
    font-size: 30px;
    line-height: 1.35;
    font-weight: 700;
  }
}

.hero-kicker,
.hero-desc,
.hero-subtitle,
.card-header p,
.metric-desc,
.capability-item small {
  margin: 0;
  color: #91ACC7;
}

.hero-kicker {
  color: #37E2FF;
  font-size: 13px;
  letter-spacing: 0;
}

.hero-desc {
  font-size: 15px;
}

.hero-subtitle {
  margin-top: 8px;
  color: #A9C7E8;
}

.hero-status {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 8px 12px;
  color: #A9C7E8;
  border: 1px solid rgba(55, 226, 255, 0.18);
  background: rgba(6, 20, 38, 0.68);
}

.status-dot {
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: #2ED6A1;

  &.is-error {
    background: #FFB84D;
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  height: 168px;
  cursor: pointer;
  background: #0D223B;
  border-color: rgba(55, 226, 255, 0.16);

  &:hover {
    border-color: rgba(55, 226, 255, 0.58);
  }
}

.metric-main,
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.metric-card ::v-deep .el-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.metric-title {
  margin: 0 0 8px;
  color: #EAF6FF;
  font-size: 16px;
  font-weight: 600;
}

.metric-icon {
  flex: 0 0 auto;
  color: #37E2FF;
  font-size: 30px;
}

.metric-desc {
  min-height: 36px;
  line-height: 18px;
}

.metric-value {
  margin-top: auto;

  span {
    color: #37E2FF;
    font-size: 34px;
    line-height: 1;
    font-weight: 700;
  }

  small {
    margin-left: 8px;
    color: #A9C7E8;
  }
}

.dashboard-card {
  margin-bottom: 16px;
  background: #0D223B;
  border-color: rgba(55, 226, 255, 0.16);
}

.card-header {
  span {
    color: #EAF6FF;
    font-size: 16px;
    font-weight: 600;
  }

  p {
    margin-top: 4px;
    font-size: 13px;
  }
}

.capability-card {
  min-height: 250px;
}

.capability-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.capability-item {
  display: flex;
  gap: 10px;
  min-height: 88px;
  padding: 12px;
  border: 1px solid rgba(55, 226, 255, 0.16);
  background: rgba(6, 20, 38, 0.48);

  i {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #2ED6A1;
  }

  &.is-plan i {
    color: #FFB84D;
  }

  span {
    display: block;
    margin-bottom: 6px;
    color: #EAF6FF;
    font-weight: 600;
  }
}

.asset-card {
  min-height: 455px;
}

.status-card {
  min-height: 455px;
}

.dashboard-alert {
  margin-bottom: 12px;
}

.dashboard-table {
  width: 100%;
}

::v-deep .dashboard-table .el-tag--info {
  background: rgba(55, 226, 255, 0.12);
  border-color: rgba(55, 226, 255, 0.36);
  color: #37E2FF;
}

.resource-popover {
  width: 100%;
  height: 420px;
}

.status-list {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 10px 14px;
  margin: 0;
  color: #A9C7E8;

  dt {
    color: #91ACC7;
  }

  dd {
    margin: 0;
    color: #EAF6FF;
    word-break: break-word;
  }
}

::v-deep .el-card__body {
  color: #EAF6FF;
}

::v-deep .el-loading-mask {
  background-color: rgba(6, 20, 38, 0.78);
}

::v-deep .el-loading-spinner .path {
  stroke: #37E2FF;
}

::v-deep .el-loading-spinner .el-loading-text {
  color: #37E2FF;
}

::v-deep .el-collapse {
  border-color: rgba(55, 226, 255, 0.14);
}

::v-deep .el-collapse-item__header,
::v-deep .el-collapse-item__wrap {
  background: transparent;
  border-color: rgba(55, 226, 255, 0.14);
  color: #EAF6FF;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .capability-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .homepage-dashboard {
    padding: 12px;
  }

  .hero-section {
    display: block;
    padding: 20px;

    h1 {
      font-size: 24px;
    }
  }

  .hero-status {
    margin-top: 16px;
  }

  .metric-grid,
  .capability-list {
    grid-template-columns: 1fr;
  }

  .status-list {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="scss">
.dashboard-resource-popover {
  background: #0D223B;
  border-color: rgba(55, 226, 255, 0.24);
  color: #EAF6FF;

  &[x-placement^="bottom"] .popper__arrow {
    border-bottom-color: rgba(55, 226, 255, 0.24);

    &::after {
      border-bottom-color: #0D223B;
    }
  }

  .el-table,
  .el-table__expanded-cell,
  .el-table th,
  .el-table tr {
    background-color: #0D223B;
    color: #EAF6FF;
  }

  .el-table th {
    color: #A9C7E8;
  }

  .el-table td,
  .el-table th.is-leaf {
    border-bottom-color: rgba(145, 172, 199, 0.16);
  }

  .el-table--enable-row-hover .el-table__body tr:hover > td {
    background-color: #12304F;
  }

  .el-pagination .btn-prev,
  .el-pagination .btn-next,
  .el-pagination button:disabled,
  .el-pager li {
    background-color: #0B1E35;
    color: #EAF6FF;
  }

  .el-pager li.active {
    color: #37E2FF;
  }
}
</style>
