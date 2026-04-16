'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseNavigationLoadingReturn {
  isNavigating: boolean
  navigateWithLoading: (path: string) => void
  resetNavigation: () => void
}

export const useNavigationLoading = (): UseNavigationLoadingReturn => {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const navigateWithLoading = useCallback((path: string) => {
    setIsNavigating(true)
    
    // Immediate visual feedback
    requestAnimationFrame(() => {
      router.push(path)
    })
    
    // Fallback reset after 3 seconds
    setTimeout(() => {
      setIsNavigating(false)
    }, 3000)
  }, [router])

  const resetNavigation = useCallback(() => {
    setIsNavigating(false)
  }, [])

  return {
    isNavigating,
    navigateWithLoading,
    resetNavigation
  }
}

export default useNavigationLoading