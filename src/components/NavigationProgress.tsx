'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface NavigationProgressProps {
  className?: string
}

const NavigationProgress: React.FC<NavigationProgressProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    // Reset progress when pathname changes
    setIsLoading(false)
    setProgress(0)
  }, [pathname])

  useEffect(() => {
    // Listen for navigation start events
    const handleStart = () => {
      setIsLoading(true)
      setProgress(10)
    }

    const handleComplete = () => {
      setProgress(100)
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 200)
    }

    // Simulate progress during loading
    let progressInterval: NodeJS.Timeout
    if (isLoading && progress < 90) {
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + Math.random() * 10
          if (prev < 60) return prev + Math.random() * 5
          if (prev < 90) return prev + Math.random() * 2
          return prev
        })
      }, 200)
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [isLoading, progress])

  if (!isLoading) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div 
        className="h-1 bg-blue-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
      <div className="absolute inset-0 bg-blue-200 opacity-20 animate-pulse" />
    </div>
  )
}

export default NavigationProgress