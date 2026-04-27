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

interface ConfigFieldProps {
  label: string
  icon: LucideIcon
  children: React.ReactNode
  prefix?: string
}

export function ConfigField({ label, icon: Icon, children, prefix }: ConfigFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase font-bold text-gray-500 tracking-wider">{label}</Label>
      <div className="relative flex">
        {prefix && (
          <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-gray-500 text-sm font-medium">
            {prefix}
          </div>
        )}
        <div className="relative flex-1">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
          {children}
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
      <SelectTrigger className="bg-white pl-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {groups.map((group, idx) => (
          <div key={group.label}>
            <SelectGroup>
              <SelectLabel>{group.label}</SelectLabel>
              {timezones.filter(group.filter).map((tz: any) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectGroup>
            {idx < groups.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </SelectContent>
    </Select>
  )
}
