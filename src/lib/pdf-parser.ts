import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import path from 'path'
import { fileURLToPath } from 'url'

// Polyfill for Promise.try (Node.js 22+)
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function<T>(callback: () => T | Promise<T>): Promise<T> {
    return Promise.resolve().then(callback)
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configure worker for both browser and server
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${require('pdfjs-dist/package.json').version}/pdf.worker.min.js`
} else {
  // Server-side: use local worker from legacy build
  GlobalWorkerOptions.workerSrc = path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
}

export interface ParsedPage {
  pageNumber: number
  text: string
  items: TextItem[]
}

export interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName: string
  fontSize: number
}

export interface ParsedSection {
  type: 'DEFINITION' | 'EXAMPLE' | 'PROPOSITION' | 'THEOREM' | 'COROLLARY' | 'REMARK' | 'EXERCISE' | 'CHAPTER' | 'UNKNOWN'
  number: string
  title?: string
  content: string
  pageStart: number
  pageEnd: number
  order: number
}

export interface ParsedChapter {
  number: number
  title: string
  sections: ParsedSection[]
  exercises: ParsedExercise[]
}

export interface ParsedExercise {
  number: string
  statement: string
  solution?: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  tags: string[]
  order: number
}

export interface ParsedCourse {
  title: string
  totalPages: number
  chapters: ParsedChapter[]
}

/**
 * Clean text from PDF artifacts
 */
function cleanText(text: string): string {
  return text
    .replace(/IFRI\s*\|\s*Notes de cours\s*\|\s*Dr COMBETE & Dr KOUDJO\s*©\s*Oct \d+/gi, '')
    .replace(/\d+\/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract text from PDF pages
 */
async function extractPages(buffer: ArrayBuffer): Promise<ParsedPage[]> {
  const pdf = await getDocument({ data: buffer }).promise
  const totalPages = pdf.numPages
  const allPages: ParsedPage[] = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    const items: TextItem[] = textContent.items.map((item: any) => ({
      str: item.str,
      transform: item.transform,
      width: item.width,
      height: item.height,
      fontName: item.fontName,
      fontSize: item.transform ? Math.abs(item.transform[0]) : 12,
    }))

    const text = cleanText(items.map(i => i.str).join(' '))
    allPages.push({ pageNumber: i, text, items })
  }

  return allPages
}

/**
 * Parse the full course structure from all pages
 * Uses position-based extraction on concatenated text to find structural elements
 */
function parseCourseStructure(pages: ParsedPage[]): ParsedCourse {
  // Concatenate all pages with page markers
  const fullText = pages.map(p => `[PAGE ${p.pageNumber}] ${p.text}`).join(' ')
  
  // Known chapter structure from the PDF
  const chapterTitles = new Map<number, string>([
    [1, 'Structures de groupes'],
    [2, "Structures d'anneaux et corps"],
    [3, 'Arithmétique dans Z'],
  ])

  // Initialize chapters
  const chapters: ParsedChapter[] = []
  for (const [num, title] of chapterTitles) {
    chapters.push({
      number: num,
      title,
      sections: [],
      exercises: [],
    })
  }
  chapters.sort((a, b) => a.number - b.number)

  // Find all structural elements with their exact positions in fullText
  interface FoundElement {
    type: ParsedSection['type']
    number: string
    label: string // e.g., "Définition"
    fullMatch: string // e.g., "Définition 1.1"
    pos: number
    chapterNum: number
  }

  const foundElements: FoundElement[] = []

  // Chapter markers - find actual chapter starts: "[PAGE N] Chapitre X Title"
// These appear at the beginning of chapter pages, not in table of contents
  const actualChapterRegex = /\[PAGE \d+\] Chapitre\s+(\d+)\s+([^\d[]+?)(?=\s*(?:\[PAGE|IFRI|Notes))/g
  let chapterMatch: RegExpExecArray | null
  const chapterMarkers: { num: number; pos: number }[] = []
  
  while ((chapterMatch = actualChapterRegex.exec(fullText)) !== null) {
    const num = parseInt(chapterMatch[1])
    if (num >= 1 && num <= 3 && chapterMatch.index !== undefined) {
      chapterMarkers.push({ num, pos: chapterMatch.index })
    }
  }

  // Deduplicate chapter markers (keep first occurrence per chapter)
  const uniqueChapterMarkers = new Map<number, number>()
  for (const m of chapterMarkers) {
    if (!uniqueChapterMarkers.has(m.num) || m.pos < uniqueChapterMarkers.get(m.num)!) {
      uniqueChapterMarkers.set(m.num, m.pos)
    }
  }
  const sortedChapterMarkers = Array.from(uniqueChapterMarkers.entries())
    .map(([num, pos]) => ({ num, pos }))
    .sort((a, b) => a.pos - b.pos)

  // Define chapter boundaries
  const chapterBoundaries: { chapterNum: number; startPos: number; endPos: number }[] = []
  for (let i = 0; i < sortedChapterMarkers.length; i++) {
    const start = sortedChapterMarkers[i].pos
    const end = i + 1 < sortedChapterMarkers.length ? sortedChapterMarkers[i + 1].pos : fullText.length
    chapterBoundaries.push({
      chapterNum: sortedChapterMarkers[i].num,
      startPos: start,
      endPos: end,
    })
  }

  // Helper: determine which chapter a position belongs to
  function getChapterForPosition(pos: number): number {
    for (const boundary of chapterBoundaries) {
      if (pos >= boundary.startPos && pos < boundary.endPos) {
        return boundary.chapterNum
      }
    }
    return 1 // default
  }

  // Pattern to find ALL structural elements with their positions
  // Matches: "Définition 1.1", "Exemple 1.1", "Remarque 1.1", "Proposition 1.1", "Théorème 1.1", "Corollaire 1.1", "Exercice 1.1"
  const elementPatterns: { regex: RegExp; type: ParsedSection['type']; label: string }[] = [
    { regex: /Définition\s+(\d+\.\d+)/g, type: 'DEFINITION', label: 'Définition' },
    { regex: /Exemple\s+(\d+\.\d+)/g, type: 'EXAMPLE', label: 'Exemple' },
    { regex: /Remarque\s+(\d+\.\d+)/g, type: 'REMARK', label: 'Remarque' },
    { regex: /Proposition\s+(\d+\.\d+)/g, type: 'PROPOSITION', label: 'Proposition' },
    { regex: /Théorème\s+(\d+\.\d+)/g, type: 'THEOREM', label: 'Théorème' },
    { regex: /Corollaire\s+(\d+\.\d+)/g, type: 'COROLLARY', label: 'Corollaire' },
    { regex: /Exercice\s+(\d+\.\d+)/g, type: 'EXERCISE', label: 'Exercice' },
  ]

  // Find all elements with their exact positions
  for (const { regex, type, label } of elementPatterns) {
    let m: RegExpExecArray | null
    while ((m = regex.exec(fullText)) !== null) {
      const number = m[1]
      const pos = m.index!
      const chapterNum = getChapterForPosition(pos)
      foundElements.push({ type, number, label, fullMatch: m[0], pos, chapterNum })
    }
  }

  // Sort all elements by position in text
  foundElements.sort((a, b) => a.pos - b.pos)

  // Now extract content for each element: from this element's position to the next element's position
  for (let i = 0; i < foundElements.length; i++) {
    const el = foundElements[i]
    const nextEl = foundElements[i + 1]
    
    const contentStart = el.pos + el.fullMatch.length
    const contentEnd = nextEl ? nextEl.pos : fullText.length
    const rawContent = fullText.substring(contentStart, contentEnd).trim()
    
    // Clean up the content - remove page markers and extra whitespace
    const content = rawContent
      .replace(/\[PAGE \d+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!content) continue

    const chapterIdx = chapters.findIndex(c => c.number === el.chapterNum)
    if (chapterIdx === -1) continue

    const chapter = chapters[chapterIdx]

    // Find page number
    let pageStart = 1
    for (const page of pages) {
      const pageMarker = `[PAGE ${page.pageNumber}]`
      const markerPos = fullText.indexOf(pageMarker, el.pos)
      if (markerPos !== -1 && markerPos < contentEnd) {
        pageStart = page.pageNumber
      }
    }

    const section: ParsedSection = {
      type: el.type,
      number: el.number,
      title: content.substring(0, 100),
      content,
      pageStart,
      pageEnd: pageStart,
      order: chapter.sections.length,
    }
    chapter.sections.push(section)
  }

  // Sort sections by number within each chapter
  for (const chapter of chapters) {
    chapter.sections.sort((a, b) => {
      const numA = parseFloat(a.number)
      const numB = parseFloat(b.number)
      return numA - numB
    })
    chapter.sections.forEach((s, i) => s.order = i)
  }

  // Extract exercises
  parseExercises(chapters)

  return {
    title: 'Structures algébriques et applications',
    totalPages: pages.length,
    chapters,
  }
}

function parseExercises(chapters: ParsedChapter[]) {
  for (const chapter of chapters) {
    let exerciseOrder = 0
    for (const section of chapter.sections) {
      if (section.type === 'EXERCISE') {
        exerciseOrder++
        const ex: ParsedExercise = {
          number: section.number,
          statement: section.content,
          difficulty: 'MEDIUM',
          tags: extractTags(section.content),
          order: exerciseOrder,
        }
        chapter.exercises.push(ex)
      }
    }
  }
}

function extractTags(content: string): string[] {
  const tags: string[] = []
  const lower = content.toLowerCase()

  if (lower.includes('groupe')) tags.push('groupes')
  if (lower.includes('anneau')) tags.push('anneaux')
  if (lower.includes('corps')) tags.push('corps')
  if (lower.includes('morphisme') || lower.includes('homomorphisme')) tags.push('morphismes')
  if (lower.includes('lagrange')) tags.push('lagrange')
  if (lower.includes('sous-groupe') || lower.includes('subgroup')) tags.push('sous-groupes')
  if (lower.includes('isomorphisme')) tags.push('isomorphismes')
  if (lower.includes('cyclique')) tags.push('groupes-cycliques')
  if (lower.includes('loi de composition')) tags.push('loi-composition')
  if (lower.includes('magma')) tags.push('magmas')
  if (lower.includes('stable')) tags.push('parties-stables')
  if (lower.includes('neutre')) tags.push('element-neutre')
  if (lower.includes('symétrique') || lower.includes('inverse')) tags.push('element-symetrique')
  if (lower.includes('commutative')) tags.push('commutativite')
  if (lower.includes('associative')) tags.push('associativite')

  return tags.length > 0 ? tags : ['général']
}

export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedCourse> {
  const pages = await extractPages(buffer)
  return parseCourseStructure(pages)
}