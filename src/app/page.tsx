import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, BookOpen, Zap, Shield, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 text-sm font-medium">
            <Zap className="h-4 w-4" />
            <span>Nouveau : Parsing PDF intelligent avec IA</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Transformez vos PDF de cours en
            <br />
            <span className="text-primary">parcours d'apprentissage interactifs</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Upload votre PDF, on extrait automatiquement chapitres, définitions, théorèmes, exemples et exercices.
            Naviguez chapitre par chapitre, résolvez des exercices, suivez votre progression.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="xl" asChild>
              <Link href="/auth/signin">Commencer gratuitement</Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="#demo">Voir la démo</Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">149</div>
              <div className="text-sm text-muted-foreground">Pages analysées</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">Chapitres structurés</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Exercices extraits</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Révisions possibles</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="demo" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tout ce qu'il faut pour apprendre efficacement</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              De l'extraction automatique à la répétition espacée, en passant par le rendu mathématique parfait.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Structure automatique</CardTitle>
                <CardDescription>
                  Détection des chapitres, sections, définitions, théorèmes, exemples via heuristiques LaTeX/Beamer
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Exercices interactifs</CardTitle>
                <CardDescription>
                  Zone de réponse, auto-évaluation, solutions détaillées, suivi des tentatives et temps passé
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Progression & Rétention</CardTitle>
                <CardDescription>
                  Streak jours, temps d'étude, chapitres complétés, révision espacée (bientôt)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Trois étapes simples pour transformer votre PDF en plateforme d'apprentissage.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl text-primary">1</div>
              <h3 className="text-xl font-semibold mb-2">Upload du PDF</h3>
              <p className="text-muted-foreground">Glissez-déposez votre fichier de cours (jusqu'à 500 pages). Support Beamer, LaTeX, PDF standards.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl text-primary">2</div>
              <h3 className="text-xl font-semibold mb-2">Parsing intelligent</h3>
              <p className="text-muted-foreground">Extraction automatique : structure hiérarchique, formules math (KaTeX), exercices, métadonnées.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl text-primary">3</div>
              <h3 className="text-xl font-semibold mb-2">Apprenez !</h3>
              <p className="text-muted-foreground">Navigation latérale, lecture fluide, exercices interactifs, progression sauvegardée, partage entre camarades.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Prêt à transformer vos cours ?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Rejoignez des centaines d'étudiants qui apprennent plus efficacement avec MyLearn.
          </p>
          <Button size="xl" variant="secondary" asChild>
            <Link href="/auth/signin">Créer mon compte gratuit</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>MyLearn - Plateforme d'apprentissage interactive pour cours universitaires</p>
          <div className="flex items-center gap-4">
            <Users className="h-4 w-4" />
            <span>Développé pour les étudiants de l'IFRI-UAC</span>
          </div>
        </div>
      </footer>
    </div>
  )
}