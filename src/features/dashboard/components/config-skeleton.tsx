"use client"

export function ConfigSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        {/* Skeleton del Título */}
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-3/4 mx-auto" />

        {/* Skeleton de la Card Principal */}
        <div className="h-64 bg-white rounded-2xl shadow-sm border border-gray-200 animate-pulse flex flex-col p-6 space-y-4">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-10 bg-gray-50 rounded" />
            <div className="h-10 bg-gray-50 rounded" />
          </div>
        </div>

        {/* Skeleton del Botón */}
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-1/2 mx-auto" />
      </div>
    </div>
  )
}
