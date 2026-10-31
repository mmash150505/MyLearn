import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const { id } = await params
    
    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        parseStatus: true,
        parseError: true,
        totalPages: true,
        chapters: {
          select: { id: true, number: true, title: true },
        },
      },
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
    }
    
    if (course.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    return NextResponse.json({
      parseStatus: course.parseStatus,
      parseError: course.parseError,
      totalPages: course.totalPages,
      chaptersCount: course.chapters.length,
    })
  } catch (error) {
    console.error('Error fetching parse status:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}