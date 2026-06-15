import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/register',
    component: () => import('@/views/register/index'),
    name: 'Register',
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/404'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    name: 'Home',
    redirect: '/home',
    children: [{
      path: 'home',
      name: 'homepage',
      component: () => import('@/views/homepage/index'),
      meta: { title: '交通数据可信协同总览', icon: 'el-icon-s-home' }
    }]
  }
]

export const asyncRoutes = [
  {
    path: '/account',
    component: Layout,
    name: 'Account',
    redirect: '/account/index',
    children: [
      {
        path: 'index',
        name: 'AccountManager',
        component: () => import('@/views/account/index'),
        meta: {
          title: '链上身份管理',
          icon: 'el-icon-user',
          roles: ['admin', 'user']
        }
      },
      {
        path: 'changePassword',
        hidden: true,
        component: () => import('@/views/account/changePassword'),
        meta: {
          title: '修改密码',
          icon: 'el-icon-user',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  {
    path: '/router',
    component: Layout,
    name: 'Router',
    redirect: '/router/routerManager',
    children: [
      {
        name: 'routerManager',
        path: 'routerManager',
        component: () => import('@/views/router/routerManager'),
        meta: {
          title: '云边端协同节点',
          icon: 'el-icon-connection',
          roles: ['admin', 'user']
        }
      },
      {
        path: 'routerGuide',
        hidden: true,
        component: () => import('@/views/router/routerGuide'),
        meta: {
          title: '协同节点接入',
          icon: 'el-icon-upload',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  {
    path: '/resource',
    component: Layout,
    name: 'Resource',
    redirect: '/resource/resourceList',
    children: [
      {
        name: 'resourceList',
        path: 'resourceList',
        component: () => import('@/views/resource/resourceManager'),
        meta: {
          title: '交通数据资产',
          icon: 'el-icon-files',
          roles: ['admin', 'user']
        }
      },
      {
        name: 'resourceDeployment',
        path: 'resourceDeployment',
        hidden: true,
        component: () => import('@/views/resource/resourceDeployment'),
        meta: {
          title: '数据资产登记',
          icon: 'el-icon-upload',
          activeMenu: '/resource/resourceList',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  {
    path: '/transaction',
    component: Layout,
    name: 'Transaction',
    redirect: 'transaction/transactionList',
    children: [
      {
        path: 'rawTransaction',
        hidden: true,
        component: () => import('@/views/transaction/rawTransaction'),
        meta: {
          title: '发起可信共享',
          icon: 'el-icon-s-opportunity',
          activeMenu: '/transaction/transactionList',
          roles: ['admin', 'user']
        }
      },
      {
        path: 'transactionList',
        name: 'TransactionList',
        component: () => import('@/views/transaction/transactionManager'),
        meta: {
          title: '可信共享记录',
          icon: 'el-icon-sort',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  {
    path: '/xaTransaction',
    component: Layout,
    name: 'XATransaction',
    redirect: 'xaTransaction/xaTransactionList',
    children: [
      {
        name: 'xaTransaction',
        path: 'xaTransaction',
        hidden: true,
        component: () => import('@/views/transaction/xaTransaction'),
        meta: {
          title: '创建跨域协同任务',
          icon: 'el-icon-s-order',
          activeMenu: '/xaTransaction/xaTransactionList',
          roles: ['admin', 'user']
        }
      },
      {
        name: 'xaTransactionList',
        path: 'xaTransactionList',
        component: () => import('@/views/transaction/xaTransactionList'),
        meta: {
          title: '跨域协同任务',
          icon: 'el-icon-finished',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  {
    path: '/admin',
    component: Layout,
    name: 'AccessManager',
    redirect: '/admin/index',
    children: [{
      path: 'index',
      name: 'access',
      component: () => import('@/views/access/index'),
      meta: {
        title: '参与方与访问控制',
        icon: 'el-icon-lock',
        roles: ['admin']
      }
    }]
  },
  {
    path: '/documents',
    component: Layout,
    name: 'Documents',
    redirect: '/documents/index',
    children: [
      {
        path: 'index',
        component: () => import('@/views/document/index'),
        meta: {
          title: '平台使用指南',
          icon: 'el-icon-document',
          roles: ['admin', 'user']
        }
      }
    ]
  },
  // 404 page must be placed at the end !!!
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  // mode: 'history', // require service support
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
