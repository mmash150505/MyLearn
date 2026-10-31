'use client'

import { useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  children: string
  displayMode?: boolean
  className?: string
}

export function MathRenderer({ children, displayMode = false, className }: MathRendererProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current) return
    
    try {
      katex.render(children, ref.current, {
        displayMode,
        throwOnError: false,
        strict: 'warn',
      })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de rendu')
    }
  }, [children, displayMode])

  if (error) {
    return (
      <span className={cn('text-red-500 text-sm', className)} title={error}>
        [Erreur LaTeX: {children}]
      </span>
    )
  }

  return <span ref={ref} className={className} />
}

import { cn } from '@/lib/utils'

interface MathTextProps {
  text: string
  className?: string
}

export function MathText({ text, className }: MathTextProps) {
  // Split text into math and non-math parts
  // Math delimiters: $$...$$ (display), $...$ (inline), \(...\) (inline), \[...\] (display)
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g)
  
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <MathRenderer key={i} displayMode>{part.slice(2, -2)}</MathRenderer>
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <MathRenderer key={i}>{part.slice(1, -1)}</MathRenderer>
        }
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          return <MathRenderer key={i}>{part.slice(2, -2)}</MathRenderer>
        }
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          return <MathRenderer key={i} displayMode>{part.slice(2, -2)}</MathRenderer>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}