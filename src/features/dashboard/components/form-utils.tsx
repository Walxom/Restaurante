"use client"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfigFieldProps {
  id?: string
  label: string
  icon: LucideIcon
  children: React.ReactNode
  prefix?: string
  error?: string
}

export function ConfigField({ id, label, icon: Icon, children, prefix, error }: ConfigFieldProps) {
  return (
    <div className="space-y-2 group flex flex-col w-full">
      <Label 
        htmlFor={id} 
        className={cn(
          "text-[10px] sm:text-xs uppercase font-black tracking-widest transition-all",
          error 
            ? "text-rose-500 opacity-100" 
            : "text-muted-foreground opacity-70 group-focus-within:text-primary group-focus-within:opacity-100"
        )}
      >
        {label}
      </Label>
      <div className="relative flex flex-col w-full">
        <div className="relative flex w-full">
          {prefix && (
            <div className={cn(
              "flex items-center px-4 border border-r-0 rounded-l-xl bg-background/50 text-muted-foreground text-xs font-black uppercase tracking-widest transition-colors",
              error ? "border-rose-500/50 text-rose-500" : "border-border/50"
            )}>
              {prefix}
            </div>
          )}
          <div className="relative flex-1">
            <Icon className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none transition-all",
              error 
                ? "text-rose-500 opacity-100" 
                : "text-muted-foreground opacity-40 group-focus-within:text-primary group-focus-within:opacity-100"
            )} />
            <div className={cn(
              "relative [&>input]:transition-all [&>select]:transition-all [&>button]:transition-all",
              prefix ? "[&>input]:rounded-l-none [&>select]:rounded-l-none [&>button]:rounded-l-none" : "",
              error 
                ? "[&>input]:border-rose-500 [&>input]:focus:ring-rose-500/20 [&>input]:focus:border-rose-500 [&>button]:border-rose-500 [&>button]:focus:ring-rose-500/20" 
                : ""
            )}>
              {children}
            </div>
          </div>
        </div>
        {error && (
          <span 
            role="alert" 
            aria-live="polite" 
            className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

interface TimeZoneSelectProps {
  value: string
  onValueChange: (value: string) => void
  timezones: any[]
  disabled?: boolean
}

export function TimeZoneSelect({ value, onValueChange, timezones, disabled = false }: TimeZoneSelectProps) {
  const groups = [
    { label: "América", filter: (tz: any) => tz.value.startsWith("America/") },
    { label: "Otros", filter: (tz: any) => !tz.value.startsWith("America/") },
  ]

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id="timezone" data-testid="select-timezone" className="bg-background/50 border-border/50 rounded-xl h-11 pl-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-2xl shadow-2xl max-h-[300px]">
        {groups.map((group, idx) => (
          <div key={group.label}>
            <SelectGroup>
              <SelectLabel className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                {group.label}
              </SelectLabel>
              {timezones.filter(group.filter).map((tz: any) => (
                <SelectItem 
                  key={tz.value} 
                  value={tz.value} 
                  className="px-4 py-2 font-bold text-xs uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors"
                >
                  {tz.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {idx < groups.length - 1 && <Separator className="my-2 opacity-50" />}
          </div>
        ))}
      </SelectContent>
    </Select>
  )
}
