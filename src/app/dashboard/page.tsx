'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Plus, BookOpen, TrendingUp, Flame, Clock, ArrowRight, Upload, Menu, X } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { useState } from 'react'

interface CourseWithProgress {
  id: string
  title: string
  description: string | null
  pdfName: string
  totalPages: number
  isPublic: boolean
  updatedAt: string
  chapters: { id: string; number: number; title: string }[]
  _count: { progress: number }
  progress?: {
    currentChapterId: string | null
    completedSections: string[]
    streakDays: number
    totalTimeSpent: number
    lastStudiedAt: string
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin?callbackUrl=/dashboard')
    return null
  }

  // Mock data for now - will be replaced with real data fetching
  const mockCourses: CourseWithProgress[] = [
    {
      id: '1',
      title: 'Structures algébriques et applications',
      description: 'Cours de L2 - Groupes, anneaux, corps, arithmétique dans Z',
      pdfName: 'structures_algebriques_beamer-1.pdf',
      totalPages: 149,
      isPublic: false,
      updatedAt: new Date().toISOString(),
      chapters: [
        { id: 'ch1', number: 1, title: 'Structures de groupes' },
        { id: 'ch2', number: 2, title: 'Structures d\'anneaux et corps' },
        { id: 'ch3', number: 3, title: 'Arithmétique dans Z' },
      ],
      _count: { progress: 0 },
      progress: {
        currentChapterId: 'ch1',
        completedSections: ['sec1', 'sec2'],
        streakDays: 5,
        totalTimeSpent: 3600,
        lastStudiedAt: new Date().toISOString(),
      },
    },
  ]

  const totalStreak = mockCourses.reduce((acc, c) => acc + (c.progress?.streakDays || 0), 0)
  const totalTime = mockCourses.reduce((acc, c) => acc + (c.progress?.totalTimeSpent || 0), 0)
  const coursesInProgress = mockCourses.filter(c => c.progress && c.progress.currentChapterId).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">M</span>yLearn
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-foreground hover:text-primary">Tableau de bord</Link>
            <Link href="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground">Mes cours</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cours
              </Link>
            </Button>
            
            <div className="flex items-center gap-3 ml-2">
              <div className="hidden sm:block text-sm text-muted-foreground">
                {session?.user?.name || session?.user?.email}
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/api/auth/signout">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-2">
            <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium">Tableau de bord</Link>
            <Link href="/courses" className="block px-3 py-2 text-sm">Mes cours</Link>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/courses/new">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cours
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bonjour, {session?.user?.name?.split(' ')[0] || 'Étudiant'} !</h1>
          <p className="text-muted-foreground mt-1">Voici votre progression d'apprentissage</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours en cours</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coursesInProgress}</div>
              <p className="text-xs text-muted-foreground">{mockCourses.length} cours au total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Série actuelle</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{totalStreak} jours</div>
              <p className="text-xs text-muted-foreground">Continuez ainsi !</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps d'étude</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
              <p className="text-xs text-muted-foreground">Cette semaine</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progression globale</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">23%</div>
              <p className="text-xs text-muted-foreground">Chapitres complétés</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses grid */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Vos cours</h2>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer un PDF
            </Button>
          </div>

          {mockCourses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun cours pour l'instant</h3>
                <p className="text-muted-foreground mb-6">Importez votre premier PDF pour commencer</p>
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer un PDF
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockCourses.map((course) => (
                <Card key={course.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      </div>
                      <Badge variant={course.isPublic ? 'default' : 'secondary'}>
                        {course.isPublic ? 'Public' : 'Privé'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{course.chapters.length} chapitres</span>
                      <span>{course.totalPages} pages</span>
                    </div>

                    {course.progress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progression chapitre {course.chapters.find(c => c.id === course.progress?.currentChapterId)?.number || 1}</span>
                          <span className="font-medium">{(course.progress.completedSections.length / Math.max(course.chapters.length * 5, 1) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(course.progress.completedSections.length / Math.max(course.chapters.length * 5, 1) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dernière session : {new Date(course.progress.lastStudiedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}

                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      <Link href={`/courses/${course.id}`}>
                        Continuer <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Importer un nouveau cours</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const res = await fetch('/api/courses', { method: 'POST', body: formData })
                  if (res.ok) {
                    setShowUpload(false)
                    router.refresh()
                  }
                }}
                className="space-y-4"
                encType="multipart/form-data"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du cours</Label>
                  <Input id="title" name="title" placeholder="Ex: Structures algébriques" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <textarea id="description" name="description" className="w-full p-2 border rounded-md" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Fichier PDF</Label>
                  <Input id="file" name="file" type="file" accept=".pdf" required />
                  <p className="text-xs text-muted-foreground">Max 50MB, PDF uniquement</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Annuler</Button>
                  <Button type="submit" className="flex-1">Importer</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}