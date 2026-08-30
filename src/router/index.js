import Vue from "vue"
import VueRouter from "vue-router"
import { MessageBox } from "element-ui"
import Login from "@/views/Login"
import Home from "@/views/Home"
import { clearAllDirtyStates, hasDirtyState } from "@/utils/dirty-state"

const MyApi = () => import(/* webpackChunkName: "address" */ "@/views/MyApi")
const PluginManage = () =>
  import(/* webpackChunkName: "plugins" */ "@/views/plugin/PluginManage")
const StoreManage = () =>
  import(/* webpackChunkName: "store" */ "@/views/store/StoreManage")
const MainCommand = () =>
  import(/* webpackChunkName: "command" */ "@/views/command/MainCommand")
const FriendGroupManage = () =>
  import(/* webpackChunkName: "manage" */ "@/views/manage/FriendGroupManage")
const DatabaseManage = () =>
  import(/* webpackChunkName: "database" */ "@/views/database/DatabaseManage")
const MainDashboard = () =>
  import(/* webpackChunkName: "dashboard" */ "@/views/dashboard/MainDashboard")
const SystemInfo = () =>
  import(/* webpackChunkName: "system" */ "@/views/system/SystemInfo")
const Configure = () =>
  import(/* webpackChunkName: "configure" */ "@/views/configure/Configure")
const About = () =>
  import(/* webpackChunkName: "about" */ "@/views/about/About")
const ProtocolSetting = () =>
  import(/* webpackChunkName: "protocol" */ "@/views/protocol/ProtocolSetting")
const ConsoleConnect = () =>
  import(/* webpackChunkName: "connect" */ "@/views/ConsoleConnect")

Vue.use(VueRouter)

const routes = [
  {
    path: "/",
    name: "Login",
    component: Login,
  },
  {
    path: "/myapi",
    name: "MyApi",
    component: MyApi,
  },
  {
    path: "/configure",
    name: "Configure",
    component: Configure,
  },
  {
    path: "/connect",
    name: "ConsoleConnect",
    component: ConsoleConnect,
  },
  {
    path: "/home",
    name: "Home",
    component: Home,
    redirect: "/dashboard",
    children: [
      { path: "/dashboard", name: "仪表盘", component: MainDashboard },
      {
        path: "/command",
        name: "BOT控制台",
        component: MainCommand,
        meta: { requiresBot: true },
      },
      { path: "/plugin", name: "插件列表", component: PluginManage },
      { path: "/store", name: "插件商店", component: StoreManage },
      {
        path: "/manage",
        name: "好友/群组",
        component: FriendGroupManage,
        meta: { requiresBot: true },
      },
      { path: "/database", name: "数据库管理", component: DatabaseManage },
      { path: "/protocol", name: "协议端设置", component: ProtocolSetting },
      { path: "/system", name: "系统信息", component: SystemInfo },
      { path: "/about", name: "关于我们", component: About },
    ],
  },
]

const router = new VueRouter({
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { x: 0, y: 0 }
    }
  },
})

router.beforeEach(async (to, from, next) => {
  const isAuthenticated = window.sessionStorage.getItem("isAuthenticated")

  if (to.path !== from.path && hasDirtyState()) {
    try {
      await MessageBox.confirm(
        "当前页面有尚未保存的修改，离开后这些修改会丢失。",
        "离开当前页面？",
        {
          confirmButtonText: "放弃修改并离开",
          cancelButtonText: "继续编辑",
          type: "warning",
        }
      )
      clearAllDirtyStates()
    } catch (error) {
      next(false)
      return
    }
  }

  if (
    !["/", "/myapi", "/configure", "/connect"].includes(to.path) &&
    !isAuthenticated
  ) {
    next("/") // 重定向到登录页面
  } else {
    next()
  }
})

export default router
