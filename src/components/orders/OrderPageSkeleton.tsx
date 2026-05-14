"use client"

export function OrderPageSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8">
        {/* Main Content Skeleton */}
        <div className="flex-1 space-y-8">
          <div className="h-20 bg-muted/50 rounded-3xl animate-pulse" />
          
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted/50 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-40 bg-muted/30 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-[400px] h-[calc(100vh-120px)] bg-muted/20 rounded-[2.5rem] animate-pulse sticky top-24" />
      </div>
    </div>
  )
}
