'use client'

import { useEffect, useState } from 'react'

export function LayoutMeasurements() {
  const [result, setResult] = useState('Measuring layout…')
  useEffect(() => {
    const measure = () => {
      const controls = Array.from(document.querySelectorAll('input[aria-label="Search workspace"], select'))
      const overlappingTabs = Array.from(document.querySelectorAll('[role="tab"]')).filter(tab => {
        const rect = tab.getBoundingClientRect()
        return controls.some(control => {
          const other = control.getBoundingClientRect()
          return rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top
        })
      }).map(tab => tab.textContent)
      setResult(JSON.stringify({
        width: document.documentElement.clientWidth,
        overlappingTabs,
        chartHeights: Array.from(document.querySelectorAll('.recharts-responsive-container')).map(chart => Math.round(chart.getBoundingClientRect().height)),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }))
    }
    const observer = new ResizeObserver(measure)
    document.querySelectorAll('[role="tablist"], .recharts-responsive-container').forEach(node => observer.observe(node))
    measure()
    return () => observer.disconnect()
  }, [])
  return <output aria-label="Layout measurements" style={{ display: 'block', overflowWrap: 'anywhere' }}>{result}</output>
}
