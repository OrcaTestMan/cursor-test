export type Role = 'user' | 'admin'
export type UserStatus = 'active' | 'blocked' | 'deleted'

export type User = {
  id: number
  username: string
  nickname: string
  role: Role
  status: UserStatus
  nicknameChangedAt: string | null
  bio?: string
  avatarUploadId?: number | null
  createdAt: string
}

export type AdminUser = User & {
  blockedReason: string | null
  blockedUntil: string | null
  blockedAt: string | null
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

export type CheerSide = 'home' | 'away'
export type PredictionPick = 'home' | 'draw' | 'away'

export type MatchDetail = Match & {
  cheers: { home: number; away: number }
  myCheer: CheerSide | null
  prediction: { home: number; draw: number; away: number }
  myPick: PredictionPick | null
  /** 응원·예측을 바꿀 수 있는지. 시작 시각 전이고 상태가 scheduled일 때만 true */
  open: boolean
}

export type MyPrediction = {
  match: Match
  pick: PredictionPick
  result: 'hit' | 'miss' | 'pending'
}

export type MyPredictionList = Paged<MyPrediction> & {
  summary: { total: number; decided: number; hits: number; rate: number }
}

export type StandingRow = {
  rank: number
  team: string
  played: number
  win: number
  draw: number
  loss: number
  goalsFor: number
  goalsAgainst: number
  diff: number
  points: number
  winRate: number
}

export type Standings = {
  league: League
  mode: 'points' | 'winRate'
  rows: StandingRow[]
}

export type Category = 'notice' | 'free' | 'match' | 'humor' | 'review' | 'news'
export type ContentStatus = 'pending' | 'visible' | 'hidden'
export type SearchType = 'title' | 'title_body' | 'author'

export type Author = { id: number; nickname: string; avatarUploadId?: number | null }

export type Team = {
  id: number
  name: string
  sport: string
  leagueId: number | null
  active: boolean
  isPrimary?: boolean
}

export type UploadFile = {
  id: number
  url: string
  mime: string
  size: number
  originalName: string
  sortOrder: number
}

export type PostSummary = {
  id: number
  category: Category
  matchId: number | null
  tag: string | null
  title: string
  author: Author
  views: number
  likeCount: number
  isBest: boolean
  commentCount: number
  status: ContentStatus
  createdAt: string
  thumbnailId?: number | null
}

export type AdminPostSummary = PostSummary & { bestExcluded: boolean; reportCount: number }

export type Comment = {
  id: number
  postId: number
  parentId: number | null
  author: Author
  /** deleted가 true면 빈 문자열 */
  body: string
  deleted: boolean
  likeCount: number
  liked: boolean
  status: ContentStatus
  createdAt: string
}

export type AdminComment = Comment & { postTitle: string; reportCount: number }

export type PostPollOption = {
  id: number
  label: string
  sortOrder: number
  votes: number
  percent: number
}

export type PostPoll = {
  closesAt: string
  closed: boolean
  totalVotes: number
  myOptionId: number | null
  options: PostPollOption[]
}

export type OpenPoll = {
  postId: number
  title: string
  closesAt: string
  totalVotes: number
  options: { id: number; label: string }[]
}

export type PostNeighbor = {
  id: number
  title: string
  tag: string | null
}

export type PostDetail = PostSummary & {
  body: string
  updatedAt: string
  match: Match | null
  liked: boolean
  bookmarked: boolean
  subscribed: boolean
  poll: PostPoll | null
  images: UploadFile[]
  teams: Team[]
  comments: Comment[]
  prev?: PostNeighbor | null
  next?: PostNeighbor | null
  related?: PostSummary[]
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

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'inquiry_answer'
  | 'message'
  | 'report_result'
  | 'mention'
  | 'subscribe'
  | 'follow'

export type Notification = {
  id: number
  type: NotificationType
  text: string
  link: string
  readAt: string | null
  createdAt: string
  available: boolean
}

export type NotificationSettings = Record<NotificationType, boolean>

export type NotificationList = Paged<Notification> & { unreadCount: number }

export type ReportTarget = 'post' | 'comment' | 'chat'
export type ReportReason = 'abuse' | 'obscene' | 'spam' | 'privacy' | 'etc'
export type ReportStatus = 'pending' | 'resolved' | 'rejected'

export type ReportGroup = {
  targetType: ReportTarget
  targetId: number
  status: ReportStatus
  reportCount: number
  reasons: Partial<Record<ReportReason, number>>
  details: string[]
  latestAt: string
  target: {
    postId: number
    title: string
    excerpt: string
    author: Author
    status: ContentStatus
    deleted: boolean
  }
  handledBy: Author | null
  handledAt: string | null
  handleNote: string | null
}

export type ForbiddenWord = { id: number; word: string; createdAt: string }

export type AdminLog = {
  id: number
  admin: Author | null
  action: string
  targetType: string
  targetId: number | null
  detail: string
  createdAt: string
}

export type PublicSettings = {
  siteName: string
  noticeBanner: string
  signupEnabled: boolean
  postApprovalRequired: boolean
  bestThreshold: number
  freeTags: string[]
  matchTags: string[]
  humorTags: string[]
  reviewTags: string[]
  newsTags: string[]
}

export type Settings = PublicSettings & {
  reportHideThreshold: number
  postCooldownSec: number
  commentCooldownSec: number
}

export type FilterMeta = {
  range: 'today' | 'custom' | 'all'
  from: string | null
  to: string | null
  dateField?: string
}

export type Paged<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  filter?: FilterMeta
}

export type MessageList = Paged<Message> & { unreadCount: number }

export type Dashboard = {
  users: { total: number; todaySignups: number; blocked: number }
  posts: { today: number; pending: number }
  comments: { today: number; pending: number }
  inquiries: { waiting: number }
  reports: { pending: number }
  matches: { today: number; live: number }
  chat?: { today: number }
  polls?: { open: number }
  recentPosts: PostSummary[]
  recentInquiries: AdminInquiry[]
  recentUsers: AdminUser[]
}

export type HotComment = {
  id: number
  postId: number
  postTitle: string
  author: Author
  body: string
  likeCount: number
  createdAt: string
}

export type PredictionRank = {
  rank: number
  user: Author
  total: number
  decided: number
  hits: number
  rate: number
}

export type PredictionRanking = { items: PredictionRank[] }

export type PublicProfile = {
  id: number
  nickname: string
  bio: string
  avatarUploadId: number | null
  createdAt: string
  postCount: number
  commentCount: number
  likeReceived: number
  teams: Team[]
  badges: { id: string; label: string }[]
  recentPosts: PostSummary[]
  prediction: { total: number; decided: number; hits: number; rate: number }
  followerCount: number
  followingCount: number
  followed: boolean
  muted: boolean
}

export type SocialUser = Author & { createdAt: string }

export type MeProfile = {
  bio: string
  avatarUploadId: number | null
  teams: Team[]
}
