'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, BookOpen, CheckCircle, Clock, ArrowLeft, Menu, X, Lock } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { MathText } from '@/components/MathRenderer'

interface Course {
  id: string
  title: string
  description: string | null
  pdfName: string
  totalPages: number
  isPublic: boolean
  ownerId: string
  chapters: Chapter[]
  progress?: Progress
}

interface Chapter {
  id: string
  number: number
  title: string
  order: number
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

interface Progress {
  currentChapterId: string | null
  completedSections: string[]
  streakDays: number
  totalTimeSpent: number
}

function CourseContent() {
  const params = useParams()
  const courseId = params.id as string
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses?id=${courseId}`)
      if (!res.ok) throw new Error('Failed to fetch course')
      return res.json() as Promise<Course>
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Cours non trouvé</h2>
          <Button asChild variant="outline">
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>
      </div>
    )
  }

  const currentChapter = course.chapters.find(c => c.id === course.progress?.currentChapterId) || course.chapters[0]
  const completedCount = course.progress?.completedSections.length || 0
  const totalSections = course.chapters.reduce((acc, c) => acc + c.sections.length, 0)
  const progressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'} lg:w-72 flex-shrink-0 border-r bg-card transition-all duration-200 flex flex-col`}
        style={{ zIndex: mobileSidebarOpen ? 50 : 10 }}
      >
        {/* Course header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{course.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{course.pdfName}</p>
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

        {/* Progress */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Progression globale</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>{completedCount}/{totalSections} sections</span>
            <span>{formatTime(course.progress?.totalTimeSpent || 0)}</span>
          </div>
        </div>

        {/* Chapters list */}
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {course.chapters.map((chapter) => {
              const isCurrent = chapter.id === currentChapter?.id
              const chapterCompleted = chapter.sections.every(s => 
                course.progress?.completedSections.includes(s.id)
              )
              const chapterProgress = chapter.sections.filter(s => 
                course.progress?.completedSections.includes(s.id)
              ).length
              
              return (
                <Button
                  key={chapter.id}
                  variant={isCurrent ? 'default' : 'ghost'}
                  className="w-full justify-start text-left gap-2 px-3 py-2"
                  asChild
                >
                  <Link
                    href={`/courses/${courseId}/chapters/${chapter.id}`}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                        chapterCompleted ? 'bg-green-500 text-white' : 
                        isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {chapterCompleted ? <CheckCircle className="h-3 w-3" /> : chapter.number}
                      </span>
                      <span className="truncate font-medium text-sm">{chapter.title}</span>
                    </div>
                    {chapterProgress > 0 && !chapterCompleted && (
                      <span className="text-xs text-muted-foreground">{chapterProgress}/{chapter.sections.length}</span>
                    )}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chapter content */}
        {currentChapter && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
            <div className="space-y-6">
              {/* Chapter header */}
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Chapitre {currentChapter.number}
                </Badge>
                <h2 className="text-2xl font-bold">{currentChapter.title}</h2>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                {currentChapter.sections.map((section) => {
                  const isCompleted = course.progress?.completedSections.includes(section.id)
                  
                  return (
                    <section 
                      key={section.id} 
                      id={section.id}
                      className={`space-y-3 p-4 rounded-lg border transition-colors ${
                        isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''
                      }`}
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
                          {section.title && (
                            <h3 className="font-medium text-lg">{section.title}</h3>
                          )}
                          <MathText text={section.content} className="text-muted-foreground/90 leading-relaxed" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() => {
                            // Mark section as completed
                          }}
                          aria-label={isCompleted ? 'Marquer comme non lu' : 'Marquer comme lu'}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </section>
                  )
                })}

                {/* Exercises */}
                {currentChapter.exercises.length > 0 && (
                  <div className="pt-6 border-t">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Exercices ({currentChapter.exercises.length})
                    </h3>
                    <div className="space-y-3">
                      {currentChapter.exercises.map((exercise) => {
                        const attempt = exercise.userAttempt
                        const isSolved = attempt?.status === 'SOLVED'
                        const isInProgress = attempt?.status === 'IN_PROGRESS'
                        
                        return (
                          <Card key={exercise.id} className={isSolved ? 'border-green-500/50' : ''}>
                            <CardContent className="pt-4 pb-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
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
                                  </div>
                                  <MathText text={exercise.statement} className="text-muted-foreground/90" />
                                  {exercise.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {exercise.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button 
                                  variant={isSolved ? 'default' : 'outline'} 
                                  size="sm"
                                  asChild
                                >
                                  <Link href={`/courses/${courseId}/chapters/${currentChapter.id}/exercises/${exercise.id}`}>
                                    {isSolved ? 'Revoir' : 'Faire'}
                                    <ChevronRight className="ml-1 h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="pt-6 border-t flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/courses/${courseId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tous les chapitres
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/courses/${courseId}/chapters/${currentChapter.id}/exercises/${currentChapter.exercises[0]?.id || ''}`}>
                    Commencer les exercices
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function CoursePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <CourseContent />
    </Suspense>
  )
}