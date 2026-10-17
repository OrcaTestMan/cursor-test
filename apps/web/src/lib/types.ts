export type League = {
  id: number
  name: string
  sport: string
  createdAt: string
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'

export type Match = {
  id: number
  leagueId: number
  leagueName: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  venue: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
}

export type Category = 'free' | 'match'

export type PostSummary = {
  id: number
  category: Category
  matchId: number | null
  author: string
  title: string
  views: number
  createdAt: string
  commentCount: number
}

export type PostList = {
  items: PostSummary[]
  total: number
  page: number
  pageSize: number
}

export type Post = {
  id: number
  category: Category
  matchId: number | null
  author: string
  title: string
  body: string
  views: number
  createdAt: string
}

export type Comment = {
  id: number
  postId: number
  author: string
  body: string
  createdAt: string
}

export type PostDetail = Post & { comments: Comment[] }
