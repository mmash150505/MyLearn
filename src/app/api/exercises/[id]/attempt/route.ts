import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const attemptSchema = z.object({
  answer: z.string().optional(),
  timeSpent: z.number().default(0),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { answer, timeSpent } = attemptSchema.parse(body)
    
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: { chapter: { include: { course: true } } },
    })
    
    if (!exercise) {
      return NextResponse.json({ error: 'Exercice non trouvé' }, { status: 404 })
    }
    
    if (!exercise.chapter.course.isPublic && exercise.chapter.course.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    const attempt = await prisma.userExercise.upsert({
      where: {
        userId_exerciseId: {
          userId: session.user.id,
          exerciseId: id,
        },
      },
      update: {
        status: answer ? 'IN_PROGRESS' : 'NOT_STARTED',
        userAnswer: answer,
        timeSpent: { increment: timeSpent },
        attempts: { increment: answer ? 1 : 0 },
      },
      create: {
        userId: session.user.id,
        exerciseId: id,
        status: answer ? 'IN_PROGRESS' : 'NOT_STARTED',
        userAnswer: answer,
        timeSpent,
        attempts: answer ? 1 : 0,
      },
    })
    
    return NextResponse.json(attempt)
  } catch (error) {
    console.error('Error saving attempt:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { status } = body
    
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'SOLVED', 'NEEDS_REVIEW']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    
    const attempt = await prisma.userExercise.update({
      where: {
        userId_exerciseId: {
          userId: session.user.id,
          exerciseId: id,
        },
      },
      data: {
        status,
        completedAt: status === 'SOLVED' ? new Date() : null,
      },
    })
    
    // Update progress
    await updateProgress(session.user.id, attempt.exerciseId, status === 'SOLVED')
    
    return NextResponse.json(attempt)
  } catch (error) {
    console.error('Error updating attempt:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function updateProgress(userId: string, exerciseId: string, solved: boolean) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { chapterId: true },
  })
  
  if (!exercise) return
  
  const chapter = await prisma.chapter.findUnique({
    where: { id: exercise.chapterId },
    select: { courseId: true },
  })
  
  if (!chapter) return
  
  const progress = await prisma.progress.findUnique({
    where: {
      userId_courseId: { userId, courseId: chapter.courseId },
    },
  })
  
  if (progress) {
    await prisma.progress.update({
      where: { id: progress.id },
      data: {
        currentChapterId: exercise.chapterId,
        lastStudiedAt: new Date(),
      },
    })
  } else {
    await prisma.progress.create({
      data: {
        userId,
        courseId: chapter.courseId,
        currentChapterId: exercise.chapterId,
      },
    })
  }
}