"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { loginSchema } from "@/features/auth/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { usePublicCompanyInfo } from "@/features/dashboard/hooks/useSystemConfig"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User, AlertTriangle } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)
  const [shouldShake, setShouldShake] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { companyName, loading } = usePublicCompanyInfo()

  // Función para disparar la animación de error (ISO 25010: Usabilidad)
  const triggerShake = () => {
    setShouldShake(true)
    setTimeout(() => setShouldShake(false), 500)
  }

  // Detectar si Bloq Mayús está activado (ISO 25010: Operabilidad / Prevención de Errores)
  const checkCapsLock = (e: React.KeyboardEvent) => {
    if (e.getModifierState("CapsLock")) {
      setIsCapsLockOn(true)
    } else {
      setIsCapsLockOn(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validación usando Zod (Métrica Estática de Calidad)
    const validation = loginSchema.safeParse({ username, password })
    if (!validation.success) {
      // Acceso defensivo a los errores para evitar TypeErrors (ISO 25010: Robustez)
      const firstError = validation.error.issues[0]
      setError(firstError?.message || "Por favor, verifica los campos")
      triggerShake()
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error === "Bloqueado") {
        setError("Cuenta bloqueada temporalmente. Demasiados intentos fallidos. Intente en 15 minutos.")
        triggerShake()
      } else if (result?.error) {
        // Mensaje genérico para seguridad (OWASP: Evitar enumeración de usuarios)
        setError("Credenciales inválidas")
        triggerShake()
      } else {
        // Obtener la sesión para verificar el rol
        const session = await getSession()
        if (session?.user?.role === "JEFE") {
          router.push("/dashboard")
        } else {
          router.push("/mesero")
        }
      }
    } catch (error) {
      setError("Error de conexión con el servidor")
      triggerShake()
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-950 dark:to-black p-4">
      {/* Título de la página para accesibilidad y SEO */}
      <title>{loading ? "Cargando..." : `Ingresar - ${companyName}`}</title>

      {/* Definición de la animación de sacudida (Inline CSS para asegurar compatibilidad) */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
      `}</style>
      
      <Card 
        className={`w-full max-w-md shadow-2xl border-t-4 border-t-primary dark:border-t-blue-600 dark:bg-slate-900 dark:border-x-slate-800 dark:border-b-slate-800 overflow-hidden transition-all duration-300 ${shouldShake ? 'animate-shake border-t-red-500 dark:border-t-red-600' : ''}`} 
        data-testid="login-card"
      >
        <CardHeader className="text-center flex flex-col items-center pt-8">
          <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-white w-full flex justify-center tracking-tight">
            {loading ? (
              <Skeleton className="h-9 w-3/4 dark:bg-slate-800" />
            ) : (
              companyName
            )}
          </CardTitle>
          <div className="text-gray-500 dark:text-slate-400 mt-2 w-full flex justify-center font-medium">
            {loading ? (
              <Skeleton className="h-4 w-1/2 dark:bg-slate-800" />
            ) : (
              "Sistema de Gestión de Restaurante"
            )}
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                Usuario
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary dark:group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError("") 
                  }}
                  required
                  placeholder="Nombre de usuario"
                  className="pl-10 h-11 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus-visible:ring-primary/20 dark:focus-visible:ring-blue-500/20 focus-visible:border-primary dark:focus-visible:border-blue-500 transition-all"
                  aria-invalid={error ? "true" : "false"}
                  data-testid="username-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary dark:group-focus-within:text-blue-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onKeyDown={checkCapsLock}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError("") 
                  }}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus-visible:ring-primary/20 dark:focus-visible:ring-blue-500/20 focus-visible:border-primary dark:focus-visible:border-blue-500 transition-all"
                  aria-invalid={error ? "true" : "false"}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isCapsLockOn && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 animate-bounce-subtle mt-1 px-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">Mayúsculas activadas</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 px-1">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                className="border-gray-300 dark:border-slate-700 data-[state=checked]:bg-primary dark:data-[state=checked]:bg-blue-600"
              />
              <label 
                htmlFor="remember" 
                className="text-sm font-medium text-gray-600 dark:text-slate-400 cursor-pointer select-none"
              >
                Recordarme en este dispositivo
              </label>
            </div>
            
            {error && (
              <div 
                className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
                role="alert"
                aria-live="assertive"
                data-testid="error-message"
              >
                <AlertCircle className="h-5 w-5 shrink-0 opacity-80" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-bold shadow-md hover:shadow-lg dark:shadow-blue-900/20 bg-primary hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-70"
              disabled={isLoading || loading}
              data-testid="login-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </CardContent>
        <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-slate-500 font-medium">
            <span>© {new Date().getFullYear()}</span>
            {loading ? (
              <Skeleton className="h-3 w-24 dark:bg-slate-800" />
            ) : (
              <span>{companyName}</span>
            )}
            <span>- Acceso Restringido</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
