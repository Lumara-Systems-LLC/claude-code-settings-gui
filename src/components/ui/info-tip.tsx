"use client"

import * as React from "react"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTipProps {
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
  iconClassName?: string
  maxWidth?: string
}

export function InfoTip({
  content,
  side = "top",
  align = "center",
  className,
  iconClassName,
  maxWidth = "280px",
}: InfoTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5",
            "text-muted-foreground hover:text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors duration-200",
            className
          )}
          aria-label="More information"
        >
          <Info className={cn("h-4 w-4", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn("text-sm leading-relaxed", `max-w-[${maxWidth}]`)}
        style={{ maxWidth }}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

interface InfoTipInlineProps extends InfoTipProps {
  label: string
  labelClassName?: string
}

export function InfoTipInline({
  label,
  labelClassName,
  ...props
}: InfoTipInlineProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={labelClassName}>{label}</span>
      <InfoTip {...props} />
    </span>
  )
}
