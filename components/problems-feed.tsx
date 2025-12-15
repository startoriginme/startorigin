"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { ProblemCard } from "@/components/problem-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Crown, Award, Medal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

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
  const [problems, setProblems] = useState<Problem[]>(initialProblems)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const supabase = createClient()

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

  // Функция для загрузки следующих проблем
  const loadMoreProblems = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const offset = nextPage * 4 // Пропускаем уже загруженные
      
      // Создаем базовый запрос
      let query = supabase
        .from("problems")
        .select(`
          *,
          profiles:author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)

      // Применяем сортировку
      if (sortBy === "recent") {
        query = query.order("created_at", { ascending: false })
      } else if (sortBy === "popular") {
        query = query.order("upvotes", { ascending: false })
      }

      // Применяем фильтр категории
      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory)
      }

      // Применяем поиск
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Добавляем пагинацию
      const { data: newProblems, error } = await query
        .range(offset, offset + 3) // Загружаем следующую партию из 4 проблем

      if (error) {
        console.error("Error loading more problems:", error)
        return
      }

      if (newProblems && newProblems.length > 0) {
        setProblems(prev => [...prev, ...newProblems])
        setPage(nextPage)
        
        // Если загрузили меньше 4 проблем, значит это последняя страница
        if (newProblems.length < 4) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error in loadMoreProblems:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page, sortBy, filterCategory, searchQuery, supabase])

  // Эффект для сброса пагинации при изменении фильтров
  useEffect(() => {
    const fetchFilteredProblems = async () => {
      setIsLoading(true)
      setPage(1)
      setHasMore(true)
      
      try {
        // Создаем базовый запрос
        let query = supabase
          .from("problems")
          .select(`
            *,
            profiles:author_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `, { count: 'exact' })

        // Применяем сортировку
        if (sortBy === "recent") {
          query = query.order("created_at", { ascending: false })
        } else if (sortBy === "popular") {
          query = query.order("upvotes", { ascending: false })
        }

        // Применяем фильтр категории
        if (filterCategory !== "all") {
          query = query.eq("category", filterCategory)
        }

        // Применяем поиск
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        }

        // Берем первые 4 проблемы для новой фильтрации
        const { data: filteredProblems, error, count } = await query.limit(4)

        if (error) {
          console.error("Error fetching filtered problems:", error)
          return
        }

        setProblems(filteredProblems || [])
        
        // Если загрузили меньше 4 проблем, значит это все что есть
        if (!filteredProblems || filteredProblems.length < 4) {
          setHasMore(false)
        } else if (count && count <= 4) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }
      } catch (error) {
        console.error("Error in fetchFilteredProblems:", error)
      } finally {
        setIsLoading(false)
      }
    }

    // Задержка для поиска (дебаунс)
    const timer = setTimeout(() => {
      fetchFilteredProblems()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, sortBy, filterCategory, supabase])

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

  // Filter regular problems (excluding those already in trending)
  const filteredRegularProblems = useMemo(() => {
    const trendingIds = new Set(filteredTrendingProblems.map(p => p.id))
    const regular = problems.filter(problem => !trendingIds.has(problem.id))
    
    let filtered = regular

    // Search filter уже применен в useEffect, но оставляем на случай
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Category filter уже применен
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
  }, [problems, filteredTrendingProblems, searchQuery, sortBy, filterCategory])

  const allProblems = [...filteredTrendingProblems, ...filteredRegularProblems]

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

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Problems List */}
      {!isLoading && (
        <div className="space-y-4">
          {allProblems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No problems found</p>
            </div>
          ) : (
            <>
              {allProblems.map((problem) => (
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
              ))}
            </>
          )}
        </div>
      )}

      {/* Load More Button */}
      {!isLoading && hasMore && allProblems.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button 
            variant="outline" 
            className="gap-2 min-w-[140px]"
            onClick={loadMoreProblems}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}

      {/* No more problems message */}
      {!isLoading && !hasMore && allProblems.length > 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No more problems to load
        </div>
      )}
    </div>
  )
}
  сделай чтобы тут было 2 карты в ряд
