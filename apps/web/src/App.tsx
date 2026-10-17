import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import AdminPage from './pages/AdminPage'
import BoardPage from './pages/BoardPage'
import HomePage from './pages/HomePage'
import MatchDetailPage from './pages/MatchDetailPage'
import MatchesPage from './pages/MatchesPage'
import NotFoundPage from './pages/NotFoundPage'
import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="matches/:id" element={<MatchDetailPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="board/write" element={<WritePage />} />
        <Route path="board/:id" element={<PostDetailPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
