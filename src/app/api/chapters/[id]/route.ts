import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
        sections: { orderBy: { order: 'asc' } },
        exercises: { orderBy: { order: 'asc' } },
      },
    })
    
    if (!chapter) {
      return NextResponse.json({ error: 'Chapitre non trouvé' }, { status: 404 })
    }
    
    if (!chapter.course.isPublic && chapter.course.ownerId !== session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    // Get user progress for exercises
    let userExercises: Record<string, any> = {}
    if (session?.user?.id) {
      const attempts = await prisma.userExercise.findMany({
        where: {
          userId: session.user.id,
          exerciseId: { in: chapter.exercises.map((e: { id: string }) => e.id) },
        },
      })
      userExercises = Object.fromEntries(attempts.map((a: { exerciseId: string }) => [a.exerciseId, a]))
    }
    
    return NextResponse.json({
      ...chapter,
      exercises: chapter.exercises.map((ex: { id: string }) => ({
        ...ex,
        userAttempt: userExercises[ex.id] || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}