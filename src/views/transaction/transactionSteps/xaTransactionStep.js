export const xaTransactionManagerSteps = [
  {
    element: '#ChainExplorer',
    title: '1. 导航选择',
    intro: '第一步：从协同网络导航中选择对应的链',
    position: 'right'
  },
  {
    element: '#xaTransactionListExplorer',
    title: '2. 跨域协同任务展示',
    intro: '第二步：选择好对应的链之后，页面会展示这条链相关的跨域协同任务',
    position: 'left'
  },
  {
    element: '#sendxaTransaction',
    title: '创建跨域协同任务',
    intro: '若需要创建跨链一致性保障任务，请点击"创建跨域协同任务"按钮',
    position: 'left'
  }
]

export const startXASteps = [
  {
    element: '#XAID',
    title: '开启跨域协同任务',
    intro: '第一步：生成协同任务ID！<br>只支持输入16进制',
    position: 'bottom'
  },
  {
    element: '#XAPath',
    title: '开启跨域协同任务',
    intro: '第二步：选择任务涉及的数据资产！<br>从左边待选列表勾选资产，点击添加按钮到已选列表',
    position: 'top'
  },
  {
    element: '#btnGroup',
    title: '开启跨域协同任务',
    intro: '第三步：点击开启任务！',
    position: 'top'
  }
]

export const execXASteps = [
  {
    element: '#xaForm',
    title: '执行任务调用',
    intro: '执行任务内的链上资源调用！<br>填写资产、方法和参数，执行调用',
    position: 'top'
  },
  {
    element: '#xaList',
    title: '执行任务调用',
    intro: '查看跨域协同任务步骤！<br>查看 XA 事务详细步骤',
    position: 'top'
  }
]
