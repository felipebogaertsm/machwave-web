"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOTOR_TYPES } from "./motor-types";

type Props = {
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  side?: ComponentProps<typeof DropdownMenuContent>["side"];
  trigger?: React.ReactNode;
};

export function NewMotorButton({ align = "end", side, trigger }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Motor
            <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-56">
        {MOTOR_TYPES.map((option) =>
          option.comingSoon ? (
            <DropdownMenuItem
              key={option.id}
              disabled
              className="flex-col items-start gap-1"
            >
              <span>{option.label}</span>
              <Badge variant="warning" className="text-[10px]">
                Coming soon
              </Badge>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={option.id} asChild>
              <Link href={option.href}>{option.label}</Link>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
