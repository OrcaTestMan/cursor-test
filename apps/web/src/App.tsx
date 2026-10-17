import { Route, Routes } from 'react-router'
import AdminLayout from './components/AdminLayout'
import { RequireAdmin, RequireAuth } from './components/guards'
import UserLayout from './components/UserLayout'
import AdminBlacklistPage from './pages/admin/AdminBlacklistPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminInquiriesPage from './pages/admin/AdminInquiriesPage'
import AdminLeaguesPage from './pages/admin/AdminLeaguesPage'
import AdminMatchesPage from './pages/admin/AdminMatchesPage'
import AdminMessagesPage from './pages/admin/AdminMessagesPage'
import AdminPostsPage from './pages/admin/AdminPostsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import BoardPage from './pages/BoardPage'
import HomePage from './pages/HomePage'
import InquiriesPage from './pages/InquiriesPage'
import InquiryDetailPage from './pages/InquiryDetailPage'
import LivePage from './pages/LivePage'
import LoginPage from './pages/LoginPage'
import MatchDetailPage from './pages/MatchDetailPage'
import MatchesPage from './pages/MatchesPage'
import MePage from './pages/MePage'
import MessagesPage from './pages/MessagesPage'
import NotFoundPage from './pages/NotFoundPage'
import PostDetailPage from './pages/PostDetailPage'
import SignupPage from './pages/SignupPage'
import WritePage from './pages/WritePage'

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="matches" element={<AdminMatchesPage />} />
          <Route path="leagues" element={<AdminLeaguesPage />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="inquiries" element={<AdminInquiriesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="blacklist" element={<AdminBlacklistPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route element={<UserLayout />}>
        <Route index element={<HomePage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="matches/:id" element={<MatchDetailPage />} />
        <Route path="board/:category" element={<BoardPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route path="write" element={<WritePage />} />
          <Route path="posts/:id/edit" element={<WritePage />} />
          <Route path="me" element={<MePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="inquiries/:id" element={<InquiryDetailPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
