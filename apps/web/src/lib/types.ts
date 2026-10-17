export type Role = 'user' | 'admin'
export type UserStatus = 'active' | 'blocked'

export type User = {
  id: number
  username: string
  nickname: string
  role: Role
  status: UserStatus
  createdAt: string
}

export type AdminUser = User & {
  blockedReason: string | null
  lastLoginAt: string | null
  postCount: number
  commentCount: number
}

export type League = {
  id: number
  name: string
  sport: string
  matchCount: number
  createdAt: string
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'

export type Match = {
  id: number
  leagueId: number
  leagueName: string
  sport: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  venue: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  postCount: number
}

export type Category = 'notice' | 'free' | 'match'
export type ContentStatus = 'pending' | 'visible' | 'hidden'

export type Author = { id: number; nickname: string }

export type PostSummary = {
  id: number
  category: Category
  matchId: number | null
  title: string
  author: Author
  views: number
  commentCount: number
  status: ContentStatus
  createdAt: string
}

export type Comment = {
  id: number
  postId: number
  author: Author
  body: string
  status: ContentStatus
  createdAt: string
}

export type AdminComment = Comment & { postTitle: string }

export type PostDetail = PostSummary & {
  body: string
  updatedAt: string
  match: Match | null
  comments: Comment[]
}

export type InquiryStatus = 'waiting' | 'answered'

export type Inquiry = {
  id: number
  title: string
  body: string
  status: InquiryStatus
  answer: string | null
  answeredAt: string | null
  createdAt: string
}

export type AdminInquiry = Inquiry & { user: Author }

export type Message = {
  id: number
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export type SentMessage = {
  id: number
  title: string
  body: string
  toAll: boolean
  to: Author | null
  createdAt: string
}

export type PublicSettings = {
  siteName: string
  noticeBanner: string
  signupEnabled: boolean
  postApprovalRequired: boolean
}

export type Settings = PublicSettings

export type Paged<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type MessageList = Paged<Message> & { unreadCount: number }

export type Dashboard = {
  users: { total: number; todaySignups: number; blocked: number }
  posts: { today: number; pending: number }
  comments: { today: number; pending: number }
  inquiries: { waiting: number }
  matches: { today: number; live: number }
  recentPosts: PostSummary[]
  recentInquiries: AdminInquiry[]
  recentUsers: AdminUser[]
}
