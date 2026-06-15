<template>
  <div class="app-container">
    <div class="business-page-header">
      <h2>协同节点接入</h2>
      <p>用于接入新的跨链 Router/Peer 节点，连接不同区域或不同底层链网络。</p>
    </div>
    <el-row style="margin-top:20px;">
      <el-card>
        <div style="height: 500px;">
          <el-steps direction="vertical" :active="1">
            <el-step title="基本信息" description="配置协同分区、监听端口信息" />
            <el-step title="身份服务" description="配置身份服务的IP端口信息" />
            <el-step title="下载安装包" description="下载完成的协同节点安装包" />
          </el-steps>
        </div>
      </el-card>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'RouterGuide',
  props: {},
  data() {
    return {
      routers: []
    }
  },
  created() {},
  mounted() {},
  methods: {}
}
</script>

<style lang="scss" scoped>

</style>
