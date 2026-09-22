import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import { HomePage } from './pages/Home'
import { ArticleListPage } from './pages/ArticleList'
import { ArticleDetailPage } from './pages/ArticleDetail'
import { TagsPage } from './pages/TagsPage'
import { AboutPage } from './pages/About'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { EditorPage } from './pages/Editor'
import { AccountPage } from './pages/Account'

function NotFoundPage() {
  return (
    <div className="container">
      <EmptyState
        title="这个地址没有对应内容"
        description="链接可能已经失效，或者文章被作者撤回了。"
        action={
          <Link className="btn btn--primary" to="/">
            回到首页
          </Link>
        }
      />
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      {/* 用 hash 路由：静态托管无需服务端 rewrite，深链刷新也不会 404 */}
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticleListPage />} />
            <Route path="/article/:slug" element={<ArticleDetailPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/write" element={<EditorPage />} />
            <Route path="/write/:id" element={<EditorPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  )
}
