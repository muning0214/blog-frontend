import { createApp } from 'vue'
import {
  Avatar,
  Button,
  ConfigProvider,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Menu,
  Modal,
  Popconfirm,
  Progress,
  Result,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
} from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'
import './assets/main.css'

/**
 * 按需注册用到的 antd 组件。
 *
 * 刻意不用 `app.use(Antd)` 全量注册：那样会把整套组件库打进包里（含大量用不到的部分）。
 * 命令式 API（message / Modal.confirm / notification）不在这里注册，
 * 用到的地方直接从 'ant-design-vue' 引入即可。
 */
const COMPONENTS = [
  Avatar,
  Button,
  ConfigProvider,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Menu,
  // 声明式 <a-modal> 需要注册；Modal.confirm 这种命令式用法不注册也能用
  Modal,
  Popconfirm,
  Progress,
  Result,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
]

const app = createApp(App)
COMPONENTS.forEach((component) => app.use(component))
app.use(router)
app.mount('#app')
