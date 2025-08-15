import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  DayPicker,
  type ChevronProps,
  // optional but recommended base styles:
  // (uncomment the next line if you want DayPicker's base CSS)
  // } from "react-day-picker";
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // v9 className keys (see docs)
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",

        // In v9: the *cell* is `day` and the clickable element is `day_button`
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),

        // Selection + flags (v9 names)
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "text-muted-foreground opacity-50 data-[selected]:bg-accent/50 data-[selected]:text-muted-foreground data-[selected]:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "data-[selected]:bg-accent data-[selected]:text-accent-foreground",
        hidden: "invisible",

        ...classNames,
      }}
      components={{
        // v9 uses a single Chevron component with an orientation prop
        Chevron: ({ orientation, className, size, disabled }: ChevronProps) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
              ? ChevronRight
              : orientation === "up"
              ? ChevronUp
              : ChevronDown;

          return (
            <Icon
              className={cn("h-4 w-4", disabled && "opacity-50", className)}
              size={size}
              aria-hidden
            />
          );
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
