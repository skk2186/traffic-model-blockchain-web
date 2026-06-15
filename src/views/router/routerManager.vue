<template>
  <div class="app-container">
    <div class="business-page-header">
      <h2>云边端协同节点</h2>
      <p>协同节点负责连接不同区域或不同类型的区块链网络。当前页面展示后端 Peer/Router 接入信息，不对节点类型做虚假分类。</p>
    </div>
    <el-row>
      <el-card style="height: 82vh" header="协同节点列表">
        <el-row>
          <el-button-group>
            <el-button plain icon="el-icon-refresh" :disabled="loading" @click="refresh">刷新</el-button>
            <el-button plain icon="el-icon-plus" :disabled="loading" @click="addRouter">接入协同节点</el-button>
          </el-button-group>
        </el-row>
        <el-row style="margin-top: 10px">
          <el-table v-loading="loading" :data="routers" fit tooltip-effect="light" height="calc(82vh - 180px)" empty-text="暂无协同节点接入信息">
            <el-table-column label="协同节点别名" min-width="40px" show-overflow-tooltip>
              <template slot-scope="item">
                {{ getAlias(item.row.nodeID) !== null ? getAlias(item.row.nodeID) : '未设置' }}
              </template>
            </el-table-column>
            <el-table-column label="协同节点标识" :show-overflow-tooltip="true" min-width="60px">
              <template slot-scope="item">
                <clipboard v-if="item.row.nodeID!=='Local'" :input-data="item.row.nodeID" style="float: left;margin-right: 10px" />
                {{ item.row.nodeID==='Local'?'':item.row.nodeID }}
                <el-tag v-if="item.row.nodeID==='Local'" type="info">{{ item.row.nodeID }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="接入地址" min-width="60px">
              <template slot-scope="item">
                {{ item.row.address }}
              </template>
            </el-table-column>
            <el-table-column label="已连接区块链网络" min-width="100px">
              <template slot-scope="item">
                <li v-for="chainItem in item.row.chainInfos" :key="chainItem.name" style="list-style-type:none; margin: 5px">
                  <el-tag type="info">{{ chainItem.stubType }}</el-tag>
                </li>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140px">
              <template slot-scope="item">
                <el-button-group>
                  <el-button plain icon="el-icon-edit" @click="setAlias(item.row.nodeID)">设置别名</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-row>
        <el-row style="margin-top: 10px;">
          <el-pagination
            style="text-align: center;"
            background
            :page-size="pageSize"
            :pager-count="9"
            layout="prev, pager, next"
            :total="total"
            :current-page="currentPage"
            :disabled="loading"
            @current-change="setPage"
          />
        </el-row>
      </el-card>
    </el-row>
  </div>
</template>

<script>
import { listPeers } from '@/api/conn'
import { addPeer } from '@/api/conn'
import Clipboard from '@/components/Clipboard'

export default {
  name: 'RouterManager',
  components: { Clipboard },
  props: {},
  data() {
    return {
      routers: [],
      pageSize: 10,
      total: 0,
      currentPage: 1,
      loading: false
    }
  },
  created() {
    this.refresh()
  },
  mounted() {
  },
  methods: {
    refresh() {
      this.loading = true
      this.routers = []
      listPeers({
        offset: (this.currentPage - 1) * 10,
        size: this.pageSize
      }).then(response => {
        this.total = response.data.size + 1
        for (const datum of response.data.data) {
          this.routers.push(datum)
        }
        this.loading = false
      }).catch(() => {
        this.$message({
          type: 'error',
          message: '刷新失败，网络异常'
        })
        this.loading = false
      })
    },
    addRouter() {
      this.$prompt('请输入待接入协同节点的IP和端口，IP和端口使用:分隔', {
        inputPlaceholder: '例子：127.0.0.1:8051',
        inputPattern: /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5])):[1-9]\d{0,4}$/,
        inputErrorMessage: '请输入正确格式的IP和端口，例如\'127.0.0.1:8051\''
      }).then(data => {
        addPeer({
          version: '1',
          data: {
            address: data.value
          }
        }).then(response => {
          if (response.errorCode === 0) {
            this.$message({
              type: 'success',
              message: '发送接入协同节点 ' + data.value + ' 请求成功，请手动刷新查看'
            })
            this.refresh()
          } else {
            this.$message({
              type: 'error',
              message: '接入协同节点 ' + data.value + ' 失败'
            })
          }
        })
      }).catch(() => {

      })
    },
    setAlias(nodeID) {
      this.$prompt('为当前协同节点设置别名', {}).then(data => {
        localStorage.setItem('routerAlias-' + nodeID, data.value)

        this.refresh()
      })
    },
    getAlias(nodeID) {
      return localStorage.getItem('routerAlias-' + nodeID)
    },
    setPage(page) {
      this.currentPage = page
      this.refresh()
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
