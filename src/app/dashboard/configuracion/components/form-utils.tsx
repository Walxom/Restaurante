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
  label: string
  icon: LucideIcon
  children: React.ReactNode
  prefix?: string
}

export function ConfigField({ label, icon: Icon, children, prefix }: ConfigFieldProps) {
  return (
    <div className="space-y-2 group">
      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest opacity-70 group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
        {label}
      </Label>
      <div className="relative flex">
        {prefix && (
          <div className="flex items-center px-4 border border-r-0 border-border/50 rounded-l-xl bg-background/50 text-muted-foreground text-xs font-black uppercase tracking-widest">
            {prefix}
          </div>
        )}
        <div className="relative flex-1">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40 z-10 pointer-events-none group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <div className={cn(
            "relative",
            prefix ? "[&>input]:rounded-l-none [&>select]:rounded-l-none" : ""
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface TimeZoneSelectProps {
  value: string
  onValueChange: (value: string) => void
  timezones: any[]
}

export function TimeZoneSelect({ value, onValueChange, timezones }: TimeZoneSelectProps) {
  const groups = [
    { label: "América", filter: (tz: any) => tz.value.startsWith("America/") },
    { label: "Otros", filter: (tz: any) => !tz.value.startsWith("America/") },
  ]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-11 pl-11 text-sm font-bold focus:ring-primary/20 hover:bg-background/80 transition-all">
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
