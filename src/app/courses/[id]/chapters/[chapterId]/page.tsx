'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle, Clock, ArrowLeft, Menu, X, Lock, Target, Flag } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { MathText } from '@/components/MathRenderer'
import { useState, Suspense } from 'react'

interface ChapterData {
  id: string
  number: number
  title: string
  course: { id: string; title: string }
  sections: Section[]
  exercises: Exercise[]
}

interface Section {
  id: string
  type: string
  number: string
  title: string | null
  content: string
  pageStart: number
  pageEnd: number
  order: number
}

interface Exercise {
  id: string
  number: string
  statement: string
  solution: string | null
  difficulty: string
  tags: string[]
  order: number
  userAttempt?: UserAttempt | null
}

interface UserAttempt {
  id: string
  status: string
  userAnswer: string | null
  timeSpent: number
  attempts: number
  completedAt: string | null
}

function ChapterContent() {
  const params = useParams()
  const courseId = params.id as string
  const chapterId = params.chapterId as string
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'course' | 'exercises'>('course')
  const handleTabChange = (value: string) => setActiveTab(value as 'course' | 'exercises')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const res = await fetch(`/api/chapters/${chapterId}`)
      if (!res.ok) throw new Error('Failed to fetch chapter')
      return res.json() as Promise<ChapterData>
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chapitre non trouvé</h2>
          <Button asChild variant="outline">
            <Link href={`/courses/${courseId}`}>Retour au cours</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Chapter sections navigation */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'} lg:w-72 flex-shrink-0 border-r bg-card transition-all duration-200 flex flex-col`}
        style={{ zIndex: mobileSidebarOpen ? 50 : 10 }}
      >
        {/* Chapter header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className="mb-1 gap-1">
              <BookOpen className="h-3 w-3" />
              Chapitre {chapter.number}
            </Badge>
            <h1 className="font-semibold truncate">{chapter.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{chapter.course.title}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden" 
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sections list */}
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {chapter.sections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                className="w-full justify-start text-left gap-2 px-3 py-2"
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                  setMobileSidebarOpen(false)
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge 
                    variant={
                      section.type === 'DEFINITION' ? 'default' :
                      section.type === 'THEOREM' ? 'destructive' :
                      section.type === 'PROPOSITION' ? 'secondary' :
                      section.type === 'COROLLARY' ? 'success' :
                      section.type === 'EXAMPLE' ? 'outline' : 'outline'
                    }
                    className="text-xs flex-shrink-0"
                  >
                    {section.type.slice(0, 3)}
                  </Badge>
                  <span className="truncate text-sm">{section.number}</span>
                  {section.title && <span className="truncate text-sm text-muted-foreground">{section.title}</span>}
                </div>
              </Button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href={`/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4" />
              Voir le cours
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Tab navigation */}
        <div className="border-b bg-card/50 sticky top-0 z-10">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="course">
                <Target className="h-4 w-4 mr-2" />
                Cours
              </TabsTrigger>
              <TabsTrigger value="exercises">
                <Flag className="h-4 w-4 mr-2" />
                Exercices ({chapter.exercises.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          {activeTab === 'course' && (
            <div className="space-y-6">
              {/* Chapter title */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold">{chapter.title}</h2>
                <p className="text-muted-foreground">Chapitre {chapter.number} — {chapter.sections.length} sections, {chapter.exercises.length} exercices</p>
              </div>

              {/* Sections content */}
              <div className="space-y-6">
                {chapter.sections.map((section) => (
                  <section 
                    key={section.id} 
                    id={section.id}
                    className="space-y-3 p-4 rounded-lg border"
                  >
                    <div className="flex items-start gap-3">
                      <Badge 
                        variant={
                          section.type === 'DEFINITION' ? 'default' :
                          section.type === 'THEOREM' ? 'destructive' :
                          section.type === 'PROPOSITION' ? 'secondary' :
                          section.type === 'COROLLARY' ? 'success' :
                          section.type === 'EXAMPLE' ? 'outline' : 'outline'
                        }
                        className="flex-shrink-0"
                      >
                        {section.type.charAt(0) + section.type.slice(1).toLowerCase()} {section.number}
                      </Badge>
                      <div className="flex-1">
                        {section.title && <h3 className="font-medium text-lg">{section.title}</h3>}
                        <MathText text={section.content} className="text-muted-foreground/90 leading-relaxed" />
                      </div>
                    </div>
                  </section>
                ))}

                {chapter.sections.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune section dans ce chapitre</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exercises' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Exercices du chapitre {chapter.number}</h2>
                <Badge variant="outline">{chapter.exercises.length} exercices</Badge>
              </div>

              {chapter.exercises.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun exercice dans ce chapitre</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chapter.exercises.map((exercise) => {
                    const attempt = exercise.userAttempt
                    const isSolved = attempt?.status === 'SOLVED'
                    const isInProgress = attempt?.status === 'IN_PROGRESS'
                    const isNeedsReview = attempt?.status === 'NEEDS_REVIEW'
                    
                    return (
                      <Card 
                        key={exercise.id} 
                        className={isSolved ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : ''}
                      >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline">Exercice {exercise.number}</Badge>
                                <Badge variant={
                                  exercise.difficulty === 'EASY' ? 'success' :
                                  exercise.difficulty === 'HARD' ? 'destructive' : 'default'
                                }>
                                  {exercise.difficulty}
                                </Badge>
                                {isSolved && (
                                  <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Résolu</Badge>
                                )}
                                {isInProgress && !isSolved && (
                                  <Badge variant="default"><Clock className="h-3 w-3 mr-1" /> En cours</Badge>
                                )}
                                {isNeedsReview && (
                                  <Badge variant="warning"><Lock className="h-3 w-3 mr-1" /> À réviser</Badge>
                                )}
                              </div>
                              <MathText text={exercise.statement} className="text-muted-foreground/90 mb-2" />
                              {exercise.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {exercise.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button 
                                variant={isSolved ? 'default' : 'outline'} 
                                size="sm"
                                asChild
                              >
                                <Link href={`/courses/${courseId}/chapters/${chapterId}/exercises/${exercise.id}`}>
                                  {isSolved ? 'Revoir' : 'Faire'}
                                  <ChevronRight className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                              {exercise.solution && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  asChild
                                >
                                  <Link href={`/courses/${courseId}/chapters/${chapterId}/exercises/${exercise.id}?showSolution=true`}>
                                    Solution
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ChapterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ChapterContent />
    </Suspense>
  )
}