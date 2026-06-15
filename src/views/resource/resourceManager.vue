<template>
  <div class="app-container">
    <div class="business-page-header">
      <h2>交通数据资产</h2>
      <p>统一查看和调用可信数据资产。页面中的底层对象仍是智能合约、Chaincode 或跨链资源，不等同于原始数据文件。</p>
    </div>
    <el-row :gutter="10">
      <el-col :span="6">
        <el-card style="height: 80vh;">
          <div slot="header">
            <span>协同网络导航</span>
            <el-tooltip id="resourceHelp" effect="light" content="如何使用？" placement="top">
              <el-button type="text" size="mini" style="margin-left: 10px;padding: 0px" @click="howToUseResource">
                <svg-icon style="vertical-align: 0px" icon-class="question" />
              </el-button>
            </el-tooltip>
          </div>
          <el-row style="height: calc(70vh - 20px); overflow-y:auto; padding: 10px;">
            <ChainExplorer id="ChainExplorer" :chain="currentChain" @zone-click="onZoneClick" @chain-click="onChainClick" />
          </el-row>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card style="height: 80vh">
          <div slot="header">
            <span>可信数据资产列表</span>
            <div style="float: right; margin-top: -10px">
              <el-input v-model="currentChain" style="width: 30vw;" placeholder="当前协同网络标识" prefix-icon="el-icon-folder" readonly>
                <template slot="prepend">
                  <el-button icon="el-icon-refresh" size="mini" @click="() => {if(typeof currentChain !== 'undefined'){$refs['ResourceExplorer'].refresh()}}" />
                </template>
              </el-input>
              <el-button id="resourceDeploy" icon="el-icon-upload" type="primary" style="margin-left: 10px;" @click="onDeploy">登记数据资产</el-button>
            </div>
          </div>
          <ResourceExplorer id="ResourceExplorer" ref="ResourceExplorer" :chain="currentChain" :page-size="10" style="height: calc(80vh - 90px)" />
        </el-card>
      </el-col>
    </el-row>
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

</style>
