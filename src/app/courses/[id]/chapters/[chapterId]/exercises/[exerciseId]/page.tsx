'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronLeft, ChevronRight, CheckCircle, Clock, ArrowLeft, Flag, Loader2, Eye, EyeOff, Copy, Check, AlertCircle, Save } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { MathText, MathRenderer } from '@/components/MathRenderer'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ExerciseData {
  id: string
  number: string
  statement: string
  solution: string | null
  difficulty: string
  tags: string[]
  order: number
  chapter: {
    id: string
    number: number
    title: string
    courseId: string
  }
  userAttempt?: UserAttempt | null
}

interface UserAttempt {
  id: string
  status: string
  userAnswer: string | null
  timeSpent: number
  attempts: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

function ExerciseContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const chapterId = params.chapterId as string
  const exerciseId = params.exerciseId as string
  const showSolution = searchParams.get('showSolution') === 'true'
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [userAnswer, setUserAnswer] = useState('')
  const [showSolutionLocal, setShowSolutionLocal] = useState(showSolution)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime] = useState(Date.now())
  const [timeSpent, setTimeSpent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      const res = await fetch(`/api/exercises/${exerciseId}`)
      if (!res.ok) throw new Error('Failed to fetch exercise')
      return res.json() as Promise<ExerciseData>
    },
  })

  const saveAttemptMutation = useMutation({
    mutationFn: async (data: { answer: string; timeSpent: number; status: string }) => {
      const res = await fetch(`/api/exercises/${exerciseId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save attempt')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] })
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/exercises/${exerciseId}/attempt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] })
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })
    },
  })

  const handleSaveDraft = () => {
    saveAttemptMutation.mutate({
      answer: userAnswer,
      timeSpent,
      status: userAnswer ? 'IN_PROGRESS' : 'NOT_STARTED',
    })
    toast({ title: 'Brouillon sauvegardé', description: 'Votre réponse a été enregistrée' })
  }

  const handleMarkSolved = () => {
    updateStatusMutation.mutate('SOLVED')
    toast({ title: 'Exercice résolu !', description: 'Bravo !', variant: 'success' })
  }

  const handleMarkNeedsReview = () => {
    updateStatusMutation.mutate('NEEDS_REVIEW')
    toast({ title: 'Marqué pour révision', description: 'Vous pourrez y revenir plus tard' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Exercice non trouvé</h2>
          <Button asChild variant="outline">
            <Link href={`/courses/${courseId}/chapters/${chapterId}`}>Retour au chapitre</Link>
          </Button>
        </div>
      </div>
    )
  }

  const attempt = exercise.userAttempt
  const isSolved = attempt?.status === 'SOLVED'
  const isInProgress = attempt?.status === 'IN_PROGRESS'
  const isNeedsReview = attempt?.status === 'NEEDS_REVIEW'

  useEffect(() => {
    if (attempt?.userAnswer && !userAnswer) {
      setUserAnswer(attempt.userAnswer)
    }
  }, [attempt?.userAnswer, userAnswer])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - minimal for exercise focus */}
      <aside className="w-64 lg:w-64 flex-shrink-0 border-r bg-card hidden lg:block">
        <div className="p-4 border-b">
          <Badge variant="outline" className="mb-1 gap-1">
            <Flag className="h-3 w-3" />
            Chapitre {exercise.chapter.number}
          </Badge>
          <h1 className="font-semibold truncate">{exercise.chapter.title}</h1>
        </div>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Temps passé</span>
            <span className="font-medium">{formatTime(timeSpent + (attempt?.timeSpent || 0))}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Tentatives</span>
            <span className="font-medium">{attempt?.attempts || 0}</span>
          </div>
        </div>
        <div className="p-4">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href={`/courses/${courseId}/chapters/${chapterId}`}>
              <ArrowLeft className="h-4 w-4" />
              Retour au chapitre
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b bg-card/50 sticky top-0 z-10 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <Flag className="h-3 w-3" />
                Exercice {exercise.number}
              </Badge>
              <Badge variant={
                exercise.difficulty === 'EASY' ? 'success' :
                exercise.difficulty === 'HARD' ? 'destructive' : 'default'
              }>
                {exercise.difficulty}
              </Badge>
              {isSolved && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Résolu</Badge>}
              {isInProgress && !isSolved && <Badge variant="default"><Clock className="h-3 w-3 mr-1" /> En cours</Badge>}
              {isNeedsReview && <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" /> À réviser</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/courses/${courseId}/chapters/${chapterId}`}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Chapitre
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          <Tabs defaultValue="exercise" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
              <TabsTrigger value="exercise">Énoncé</TabsTrigger>
              <TabsTrigger value="answer">Ma réponse</TabsTrigger>
              {exercise.solution && <TabsTrigger value="solution">Solution</TabsTrigger>}
            </TabsList>

            {/* Exercise Statement */}
            <TabsContent value="exercise" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Énoncé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MathText text={exercise.statement} className="text-lg leading-relaxed" />
                  {exercise.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t">
                      {exercise.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Answer */}
            <TabsContent value="answer" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      Votre réponse
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-1" />
                        Sauvegarder
                      </Button>
                      {!isSolved && (
                        <Button size="sm" onClick={handleMarkSolved} disabled={isSubmitting || !userAnswer.trim()}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marquer résolu
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="answer">Votre réponse (LaTeX supporté avec $...$ ou $$...$$)</Label>
                      <Textarea
                        id="answer"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Écrivez votre réponse ici...&#10;&#10;Exemple : $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$"
                        className="min-h-[200px] font-mono text-sm"
                        rows={12}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Raccourcis : $...$ pour inline, $$...$$ pour display. Précédent : {attempt?.userAnswer ? 'Oui' : 'Non'}
                      </p>
                    </div>

                    {/* Live Preview */}
                    {userAnswer && (
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <Label>Aperçu en direct</Label>
                        <div className="mt-2 prose max-w-none">
                          <MathText text={userAnswer} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Button 
                        variant={isSolved ? 'default' : 'outline'} 
                        onClick={handleMarkSolved} 
                        disabled={isSubmitting || !userAnswer.trim() || isSolved}
                      >
                        {isSolved ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Exercice résolu
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marquer comme résolu
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" onClick={handleMarkNeedsReview} disabled={isSubmitting}>
                        <AlertCircle className="h-4 w-4 mr-1" />
                        À réviser plus tard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Previous attempt */}
              {attempt?.userAnswer && attempt.userAnswer !== userAnswer && (
                <Card className="border-amber-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-5 w-5" />
                      Tentative précédente ({formatTime(attempt.timeSpent)})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MathText text={attempt.userAnswer} className="text-muted-foreground" />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Solution */}
            {exercise.solution && (
              <TabsContent value="solution" className="space-y-4">
                <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-900/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Eye className="h-5 w-5" />
                      Solution détaillée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MathText text={exercise.solution} className="text-lg leading-relaxed" />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Navigation */}
          <div className="pt-6 border-t flex justify-between">
            <Button variant="outline" asChild>
              <Link href={`/courses/${courseId}/chapters/${chapterId}`}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Liste des exercices
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExercisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ExerciseContent />
    </Suspense>
  )
}