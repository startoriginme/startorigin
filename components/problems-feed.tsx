"use client"

import { useState, useMemo } from "react"
import { ProblemCard } from "@/components/problem-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Crown, Award, Medal } from "lucide-react"

type Problem = {
  id: string
  title: string
  description: string
  category: string | null
  tags: string[] | null
  upvotes: number
  comment_count: number
  status: string
  created_at: string
  author_id: string
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

type ProblemsFeedProps = {
  initialProblems: Problem[]
  userId?: string
  trendingProblems?: Problem[]
}

export function ProblemsFeed({ initialProblems, userId, trendingProblems = [] }: ProblemsFeedProps) {
  const [problems] = useState<Problem[]>(initialProblems)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    problems.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats)
  }, [problems])

  // Separate trending and regular problems
  const { trendingProblemsWithRank, regularProblems } = useMemo(() => {
    const trendingIds = new Set(trendingProblems.map(p => p.id))
    
    const trending = trendingProblems.map((problem, index) => ({
      ...problem,
      rank: index + 1
    }))

    const regular = problems.filter(problem => !trendingIds.has(problem.id))

    return { trendingProblemsWithRank: trending, regularProblems: regular }
  }, [problems, trendingProblems])

  // Filter and sort regular problems (trending always stay on top)
  const filteredRegularProblems = useMemo(() => {
    let filtered = regularProblems

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((p) => p.category === filterCategory)
    }

    // Sort
    if (sortBy === "popular") {
      filtered = [...filtered].sort((a, b) => b.upvotes - a.upvotes)
    } else {
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered
  }, [regularProblems, searchQuery, sortBy, filterCategory])

  // Filter trending problems (they always stay on top but can be filtered out)
  const filteredTrendingProblems = useMemo(() => {
    let filtered = trendingProblemsWithRank

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((p) => p.category === filterCategory)
    }

    return filtered
  }, [trendingProblemsWithRank, searchQuery, filterCategory])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
      case 2:
        return <Award className="h-5 w-5 text-gray-400 fill-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
      default:
        return null
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-semibold">🥇 1st</div>
      case 2:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-400 text-white text-xs font-semibold">🥈 2nd</div>
      case 3:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600 text-white text-xs font-semibold">🥉 3rd</div>
      default:
        return null
    }
  }

  const allProblems = [...filteredTrendingProblems, ...filteredRegularProblems]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "recent" | "popular")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-4">
        {allProblems.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No problems found</p>
          </div>
        ) : (
          allProblems.map((problem) => (
            <div key={problem.id} className="relative">
              {/* Значки медалей для топ-3 */}
              {(problem as any).rank > 0 && (
                <>
                  <div className="absolute -top-2 -left-2 z-10">
                    {getRankIcon((problem as any).rank)}
                  </div>
                  <div className="absolute -top-2 -right-2 z-10">
                    {getRankBadge((problem as any).rank)}
                  </div>
                </>
              )}
              
              <ProblemCard 
                problem={problem} 
                userId={userId}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
