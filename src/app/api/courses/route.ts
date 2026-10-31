import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parsePDF } from '@/lib/pdf-parser'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '../../../../../uploads')

async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch {}
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')
    const publicOnly = searchParams.get('public') === 'true'
    
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          chapters: {
            include: {
              sections: true,
              exercises: true,
            },
            orderBy: { number: 'asc' },
          },
          owner: { select: { id: true, name: true, image: true } },
          _count: { select: { progress: true } },
        },
      })
      
      if (!course) {
        return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 })
      }
      
      if (!course.isPublic && course.ownerId !== session?.user?.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
      
      return NextResponse.json(course)
    }
    
    const courses = await prisma.course.findMany({
      where: publicOnly 
        ? { isPublic: true }
        : { ownerId: session?.user?.id },
      include: {
        chapters: { select: { id: true, number: true, title: true } },
        owner: { select: { id: true, name: true, image: true } },
        _count: { select: { progress: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    
    return NextResponse.json(courses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'true'
    
    if (!file || !title) {
      return NextResponse.json({ error: 'Fichier et titre requis' }, { status: 400 })
    }
    
    // Read file once as ArrayBuffer for both storage and parsing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload PDF - use Vercel Blob in production, local storage in development
    let pdfUrl: string
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    
    if (hasBlobToken) {
      const blob = await put(file.name, buffer, { access: 'public' })
      pdfUrl = blob.url
    } else {
      // Local development: save file to uploads directory
      await ensureUploadDir()
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filepath = path.join(UPLOAD_DIR, filename)
      await writeFile(filepath, buffer)
      pdfUrl = `/uploads/${filename}`
    }
    
    // Create course record with pending parse status
    const course = await prisma.course.create({
      data: {
        title,
        description,
        pdfUrl,
        pdfName: file.name,
        totalPages: 0,
        ownerId: session.user.id,
        isPublic,
        parseStatus: 'PROCESSING',
      },
    })
    
    // Start async parsing with the arrayBuffer - use setImmediate to not block response
    setImmediate(() => parseCourseAsync(course.id, arrayBuffer))
    
    return NextResponse.json({ 
      course,
      message: 'Cours créé. Parsing en cours...' 
    })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function parseCourseAsync(courseId: string, arrayBuffer: ArrayBuffer) {
  try {
    const parsed = await parsePDF(arrayBuffer)
    
    for (const chapter of parsed.chapters) {
      const createdChapter = await prisma.chapter.create({
        data: {
          courseId,
          number: chapter.number,
          title: chapter.title,
          order: chapter.number,
        },
      })
      
      for (const section of chapter.sections) {
        // Skip EXERCISE and CHAPTER types - they're handled separately
        if (section.type === 'EXERCISE' || section.type === 'CHAPTER') continue
        
        await prisma.section.create({
          data: {
            chapterId: createdChapter.id,
            type: section.type as 'DEFINITION' | 'EXAMPLE' | 'PROPOSITION' | 'THEOREM' | 'COROLLARY' | 'REMARK',
            number: section.number,
            title: section.title,
            content: section.content,
            pageStart: section.pageStart,
            pageEnd: section.pageEnd,
            order: section.order,
          },
        })
      }
      
      for (const exercise of chapter.exercises) {
        await prisma.exercise.create({
          data: {
            chapterId: createdChapter.id,
            number: exercise.number,
            statement: exercise.statement,
            solution: exercise.solution,
            difficulty: exercise.difficulty,
            tags: exercise.tags,
            order: exercise.order,
          },
        })
      }
    }
    
    await prisma.course.update({
      where: { id: courseId },
      data: {
        totalPages: parsed.totalPages,
        parseStatus: 'COMPLETED',
      },
    })
  } catch (error) {
    console.error('Parsing error:', error)
    await prisma.course.update({
      where: { id: courseId },
      data: {
        parseStatus: 'FAILED',
        parseError: error instanceof Error ? error.message : 'Erreur inconnue',
      },
    })
  }
}