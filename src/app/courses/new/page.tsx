'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowLeft, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function NewCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [parseStatus, setParseStatus] = useState<'idle' | 'uploading' | 'parsing' | 'completed' | 'error'>('idle')
  const [parseError, setParseError] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const validateForm = () => {
    if (!title.trim()) return 'Le titre est requis'
    if (!file) return 'Un fichier PDF est requis'
    if (file.type !== 'application/pdf') return 'Le fichier doit être un PDF'
    if (file.size > 50 * 1024 * 1024) return 'Le fichier ne doit pas dépasser 50 MB'
    return null
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
      } else {
        toast({ title: 'Format invalide', description: 'Veuillez déposer un fichier PDF', variant: 'destructive' })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
      } else {
        toast({ title: 'Format invalide', description: 'Veuillez sélectionner un fichier PDF', variant: 'destructive' })
        e.target.value = ''
      }
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toast({ title: 'Erreur', description: validationError, variant: 'destructive' })
      return
    }

    setIsUploading(true)
    setParseStatus('uploading')
    setUploadProgress(0)
    setParseError('')

    try {
      const formData = new FormData()
      formData.append('file', file!)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('isPublic', isPublic.toString())

      // Upload with progress simulation
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const res = await fetch('/api/courses', {
        method: 'POST',
        body: formData,
      })

      clearInterval(uploadInterval)
      setUploadProgress(100)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du cours')
      }

      setCourseId(data.course.id)
      setParseStatus('parsing')
      toast({ title: 'Upload réussi', description: 'Parsing du PDF en cours...' })

      // Poll for parsing status
      const pollInterval = setInterval(async () => {
        if (!data.course.id) return
        
        try {
          const statusRes = await fetch(`/api/courses/${data.course.id}/parse-status`)
          const statusData = await statusRes.json()
          
          if (statusData.parseStatus === 'COMPLETED') {
            clearInterval(pollInterval)
            setParseStatus('completed')
            toast({ title: 'Parsing terminé', description: 'Votre cours est prêt !', variant: 'success' })
            
            setTimeout(() => {
              router.push(`/courses/${data.course.id}`)
              router.refresh()
            }, 1500)
          } else if (statusData.parseStatus === 'FAILED') {
            clearInterval(pollInterval)
            setParseStatus('error')
            setParseError(statusData.parseError || 'Erreur lors du parsing')
            toast({ title: 'Erreur de parsing', description: statusData.parseError, variant: 'destructive' })
          }
        } catch {
          // Ignore polling errors
        }
      }, 3000)

    } catch (error) {
      setIsUploading(false)
      setParseStatus('error')
      setParseError(error instanceof Error ? error.message : 'Erreur inconnue')
      toast({ title: 'Erreur', description: error instanceof Error ? error.message : 'Erreur lors de la création', variant: 'destructive' })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">M</span>yLearn
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Nouveau cours</h1>
          <p className="text-muted-foreground mt-1">Importez un PDF et transformez-le en parcours d'apprentissage interactif</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Zone */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>Fichier PDF du cours</CardTitle>
              </div>
              <CardDescription>
                Glissez-déposez votre fichier PDF ici, ou cliquez pour parcourir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                
                {file ? (
                  <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-10 w-10 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium mb-1">Déposez votre PDF ici</p>
                    <p className="text-muted-foreground mb-4">ou</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file')?.click()}
                      disabled={isUploading}
                    >
                      Parcourir les fichiers
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">PDF uniquement, max 50 MB</p>
                  </>
                )}
              </div>

              {/* Upload Progress */}
              {(parseStatus === 'uploading' || parseStatus === 'parsing') && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{parseStatus === 'uploading' ? 'Upload en cours...' : 'Parsing du PDF...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                  {parseStatus === 'parsing' && (
                    <p className="text-xs text-muted-foreground text-center">
                      Extraction des chapitres, sections, exercices...
                    </p>
                  )}
                </div>
              )}

              {/* Parse Status */}
              {parseStatus === 'completed' && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Parsing terminé avec succès !</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Redirection vers le cours...</p>
                  </div>
                </div>
              )}

              {parseStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300">Erreur lors du parsing</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du cours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre du cours *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Structures algébriques et applications"
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du cours, niveau, prérequis..."
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isUploading}
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Rendre ce cours public (visible par d'autres utilisateurs)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isUploading || parseStatus === 'parsing' || parseStatus === 'completed'}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : parseStatus === 'parsing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing en cours...
                </>
              ) : (
                'Créer le cours'
              )}
            </Button>
            <Button type="button" variant="outline" asChild disabled={isUploading}>
              <Link href="/dashboard">Annuler</Link>
            </Button>
          </div>

          {/* Tips */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Conseils pour un meilleur parsing
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">• <span>Utilisez des PDF générés depuis LaTeX/Beamer (structure préservée)</span></li>
                <li className="flex items-start gap-2">• <span>Les titres de chapitres/sections doivent être clairement identifiables</span></li>
                <li className="flex items-start gap-2">• <span>Les exercices numérotés (Exercice 1.1, 1.2...) sont détectés automatiquement</span></li>
                <li className="flex items-start gap-2">• <span>Les formules mathématiques sont rendues avec KaTeX</span></li>
                <li className="flex items-start gap-2">• <span>Évitez les PDF scannés (images) - le texte doit être sélectionnable</span></li>
              </ul>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}