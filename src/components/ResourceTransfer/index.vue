<template>
  <div class="wl-transfer" :style="{ width, height }">
    <!-- transfer left -->
    <div class="transfer-base">
      <h3 class="transfer-title">
        <span>{{ sourceTitle }}</span>
      </h3>
      <div class="transfer-left">

        <!-- transfer left panel -->
        <div class="transfer-main">
          <el-input v-model="filterFrom" :placeholder="filterPlaceholder" size="small" class="filter-tree" />
          <el-tree
            ref="from-tree"
            lazy
            node-key="key"
            :load="leftLoadNode"
            :props="defaultProps"
            highlight-current
            :filter-node-method="filterNodeFrom"
            @node-click="onChainClick"
          />
        </div>
      </div>
      <div class="transfer-left-table">
        <div class="transfer-main">
          <el-table
            ref="finderTable"
            stripe
            tooltip-effect="light"
            :data="tableShowData"
            height="calc(100% - 44px)"
            @selection-change="handleSelectionChange"
          >
            <el-table-column fixed width="42px" type="selection" :selectable="(row)=>{return !row.path.endsWith('.WeCrossHub')}" />
            <el-table-column :label="sourceColumnLabel" prop="path" show-overflow-tooltip>
              <template slot-scope="scope">
                <span class="path-text">{{ scope.row.path }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            small
            :pager-count="5"
            :page-size="pageObject.pageSize"
            layout="prev, pager, next"
            :total="pageObject.totalPageNumber"
            style="text-align: center; margin-top: 10px; height: 20px"
            :current-page.sync="pageObject.currentPage"
            @current-change="setPage"
            @prev-click="prevPage"
            @next-click="nextPage"
          />
        </div>
      </div>
    </div>
    <!-- transfer button -->
    <div class="transfer-center">
      <template>
        <p class="transfer-center-item">
          <el-button :disabled="from_disabled" @click="addToAims">
            {{ addButtonText }}
            <i class="el-icon-arrow-right" />
          </el-button>
        </p>
        <p class="transfer-center-item">
          <el-button
            :disabled="to_disabled"
            icon="el-icon-arrow-left"
            @click="removeToSource"
          >{{ removeButtonText }}
          </el-button>
        </p>
      </template>
    </div>
    <!-- transfer right  -->
    <div class="transfer-right">
      <h3 class="transfer-title">
        <el-checkbox
          v-model="to_check_all"
          :indeterminate="to_is_indeterminate"
          @change="toAllBoxChange"
        />
        <span>{{ targetTitle }}<template v-if="showTargetCount">（{{ toShowData.length }}）</template></span>
      </h3>
      <!-- transfer right panel -->
      <div class="transfer-main">
        <el-input v-model="filterTo" :placeholder="filterPlaceholder" size="small" class="filter-tree" />
        <el-checkbox-group v-model="to_check_keys" class="transfer-right-panel">
          <el-checkbox
            v-for="item in toDataFilter"
            :key="item.path"
            class="el-transfer-panel__item"
            :label="item.path"
          >
            <span class="path-text">{{ item.path }}</span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
  </div>
</template>

<script>

import { listChains, listZones } from '@/api/conn'
import { uniqueObjectArray } from '@/utils'

export default {
  name: 'ResourceTransfer',
  props: {
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '450px'
    },
    resourceData: {
      type: Array,
      default: () => []
    },
    pageObject: {
      required: true,
      type: Object,
      default: () => {
        return {
          currentPage: 0,
          totalPageNumber: 0,
          pageSize: 0
        }
      }
    },
    toData: {
      type: Array,
      default: () => []
    },
    sourceTitle: {
      type: String,
      default: '待选资源列表'
    },
    sourceColumnLabel: {
      type: String,
      default: '可选资源路径'
    },
    targetTitle: {
      type: String,
      default: '已选资源列表'
    },
    addButtonText: {
      type: String,
      default: '添加'
    },
    removeButtonText: {
      type: String,
      default: '移除'
    },
    filterPlaceholder: {
      type: String,
      default: '输入关键字进行过滤'
    },
    showTargetCount: {
      type: Boolean,
      default: false
    },
    defaultProps: {
      type: Object,
      default: () => {
        return {
          children: 'children',
          label: 'name',
          disabled: 'disabled',
          isLeaf: 'hasChildren'
        }
      }
    }
  },
  data() {
    return {
      to_is_indeterminate: false,
      to_check_all: false,
      from_disabled: true,
      to_disabled: true,
      from_check_keys: [],
      to_check_keys: [],
      filterFrom: '',
      filterTo: '',
      tableShowData: [],
      toShowData: this.toData,
      toDataFilter: []
    }
  },
  watch: {
    resourceData(val) {
      this.tableShowData = val.filter((item) => {
        return JSON.stringify(this.toShowData).indexOf(JSON.stringify(item)) === -1
      })
    },
    from_check_keys(val) {
      this.from_disabled = (val.length === 0)
    },
    to_check_keys(val) {
      if (val.length > 0) {
        this.to_disabled = false
        this.to_is_indeterminate = val.length < this.toShowData.length
        this.to_check_all = val.length === this.toShowData.length
      } else {
        this.to_disabled = true
        this.to_is_indeterminate = false
        this.to_check_all = false
      }
    },
    filterFrom(val) {
      this.$refs['from-tree'].filter(val)
    },
    filterTo(val) {
      this.toDataFilter = this.toShowData
      this.toFilter(val)
    }
  },
  created() {
  },
  mounted() {
  },
  methods: {
    prevPage() {
      this.$emit('prev-click')
    },
    setPage(value) {
      this.$emit('current-change', value)
    },
    nextPage() {
      this.$emit('next-click')
    },
    addToAims() {
      this.toShowData = this.toShowData.concat(this.from_check_keys)
      this.toDataFilter = this.toShowData

      for (const fromCheckKey of this.from_check_keys) {
        this.tableShowData = this.tableShowData.filter((item) => item.path !== fromCheckKey.path)
      }
      this.from_check_keys = []

      this.$emit('add-button')
      this.$emit('update:toData', this.toShowData)
    },
    removeToSource() {
      for (const toDatum of this.to_check_keys) {
        if (toDatum.startsWith(this.$refs['from-tree'].getCurrentKey() + '.')) {
          this.tableShowData.push({ path: toDatum })
        }
        this.toShowData = this.toShowData.filter((item) => item.path !== toDatum)
      }
      this.to_check_keys = []
      this.toDataFilter = this.toShowData
      this.toFilter(this.filterTo)

      this.$emit('remove-button')
      this.$emit('update:toData', this.toShowData)
    },
    handleSelectionChange(val) {
      this.from_check_keys = val
    },
    onChainClick(data) {
      if (data.type === 'zone') {
        this.$emit('zone-click', data.key)
      } else if (data.type === 'chain') {
        this.$emit('chain-click', data.key, data.data)
      }
    },
    leftLoadNode(node, resolve) {
      if (node.level === 0) {
        listZones({
          offset: 0,
          size: 0
        }).then(response => {
          if (response.errorCode === 0) {
            let zones = []
            for (const zone of response.data.data) {
              zones.push({
                name: zone,
                children: [],
                hasChildren: false,
                type: 'zone',
                key: zone
              })
            }
            zones = uniqueObjectArray(zones)
            return resolve(zones)
          } else {
            this.$message({
              type: 'error',
              message: '获取分区列表失败: ' + response.errorCode + ' 错误信息: ' + response.message
            })
          }
        }).catch(() => {
          this.$message({
            type: 'error',
            message: '网络异常'
          })
        })
      }
      if (node.level === 1) {
        const zone = node.data.key
        listChains({
          zone: zone,
          offset: 0,
          size: 0
        }).then(response => {
          if (response.errorCode === 0) {
            let chains = []
            for (const chain of response.data.data) {
              chains.push({
                name: chain.chain,
                children: [],
                hasChildren: true,
                type: 'chain',
                key: chain.zone + '.' + chain.chain
              })
            }
            chains = uniqueObjectArray(chains)
            return resolve(chains)
          } else {
            this.$message({
              type: 'error',
              message: '获取区块链列表失败: ' + response.errorCode + ' 错误信息: ' + response.message
            })
          }
        }).catch(() => {
          this.$message({
            type: 'error',
            message: '网络异常'
          })
        })
      }
    },
    toAllBoxChange(val) {
      if (this.toShowData.length === 0) {
        return
      }
      if (val) {
        const check_keys = []
        for (const toData of this.toDataFilter) {
          check_keys.push(toData.path)
        }
        this.to_check_keys = check_keys
      } else {
        this.to_check_keys = []
      }
    },
    filterNodeFrom(value, data) {
      if (!value) return true
      return data['key'].indexOf(value) !== -1
    },
    toFilter(value) {
      this.toDataFilter = this.toDataFilter.filter((item) => {
        return item.path.indexOf(value) > -1
      })
    }
  }
}
</script>

<style lang="scss" scoped>
body {
  line-height: 1.666;
  color: #666;
  font-size: 14px;
}

body,
h1,
h2,
h3,
h4,
h5,
h6,
ul,
ol,
li,
p,
dl,
dt,
dd,
table,
th,
td {
  margin: 0;
  padding: 0;
}

table,
th,
td,
img {
  border: 0;
}

em,
i,
th {
  font-style: normal;
  text-decoration: none;
}

h1,
h2,
h3,
h4,
h5,
h6,
th,
strong {
  font-size: 100%;
  font-weight: normal;
}

input,
select,
button,
textarea,
table {
  margin: 0;
  font-family: inherit;
  font-size: 100%;
}

input,
button {
  outline: none;
}

ul,
ol {
  list-style: none;
}

table {
  border-collapse: collapse;
  border-spacing: 0;
}

th,
caption {
  text-align: left;
}

a {
  color: #666;
  text-decoration: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.wl-transfer {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) 128px minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;

  .el-tree {
    min-width: 100%;
    display: inline-block !important;
  }

  .transfer-base {
    display: grid;
    grid-template-rows: 40px minmax(0, 1fr);
    grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
    border: 1px solid #ebeef5;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: 5px;
    vertical-align: middle;
    overflow: hidden;
  }

  .transfer-left {
    grid-row: 2;
    grid-column: 1;
  }

  .transfer-left-table {
    grid-row: 2;
    grid-column: 2;
  }

  .transfer-right {
    grid-column: 3;
  }

  .transfer-right-only {
    height: 100%;
  }

  .transfer-main {
    display: flex;
    flex-direction: column;
    padding: 10px;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .transfer-left {
    width: 100%;
    height: 100%;
    vertical-align: middle;
    min-width: 0;
    overflow: hidden;
  }

  .transfer-left-table {
    width: 100%;
    height: 100%;
    vertical-align: middle;
    min-width: 0;
    overflow: hidden;
  }

  .transfer-right-panel{
    flex: 1;
    margin:0;
    padding:6px 0;
    list-style:none;
    min-height: 0;
    overflow:auto;
    -webkit-box-sizing:border-box;
    box-sizing:border-box
  }

  .transfer-right {
    display: grid;
    grid-template-rows: 40px minmax(0, 1fr);
    border: 1px solid #ebeef5;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: 5px;
    vertical-align: middle;
    overflow: hidden;
    min-width: 0;
  }

  .transfer-center {
    display: flex;
    flex-direction: column;
    grid-column: 2;
    align-items: center;
    justify-content: center;
    width: 100%;
    text-align: center;
  }

  .transfer-center-item {
    padding: 10px;
    overflow: hidden;
  }

  .transfer-center-item .el-button {
    width: 96px;
  }

  .transfer-title {
    grid-column: 1 / -1;
    border-bottom: 1px solid #ebeef5;
    padding: 0 15px;
    height: 40px;
    line-height: 40px;
    color: #333;
    font-size: 16px;
    background-color: #f5f7fa;
  }

  .transfer-title .el-checkbox {
    margin-right: 10px;
  }

  .filter-tree {
    flex: 0 0 32px;
    margin-bottom: 10px;
  }

  .el-table {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .el-tree {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .transfer-left .el-tree {
    scrollbar-width: none;
  }

  .transfer-left .el-tree::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .transfer-left-table::v-deep .el-table__body-wrapper {
    overflow-x: hidden;
  }

  .el-pagination {
    flex: 0 0 24px;
  }

  .el-checkbox {
    max-width: 100%;
  }

  .el-checkbox::v-deep .el-checkbox__label {
    max-width: calc(100% - 24px);
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
    white-space: nowrap;
  }

  .path-text {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
    white-space: nowrap;
  }
}
</style>
