"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Flame,
  Rocket,
  Sparkles,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DOCS_URL = "https://felipebogaertsm.github.io/machwave/";

function GettingStartedSolidPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Getting started
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Simulate a solid rocket motor
          </h1>
          <p className="text-sm text-muted-foreground">
            Three quick steps from a blank page to a thrust curve. Let&rsquo;s
            light it.
          </p>
        </div>

        <Step
          index={1}
          icon={Flame}
          title="Create a solid motor"
          description="BATES-grain geometry, propellant, casing, nozzle — all in one wizard."
        >
          <p>
            Head to{" "}
            <Link
              href="/motors/new/solid"
              className="text-primary underline-offset-4 hover:underline"
            >
              New Motor &rarr; Solid Propellant
            </Link>
            . Defaults are sensible, so you can submit quickly and tune later.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Pick a propellant from the catalog (or define your own).</li>
            <li>Set grain count, dimensions, and inhibited faces.</li>
            <li>Size the casing and nozzle throat / exit.</li>
          </ul>
        </Step>

        <Step
          index={2}
          icon={Activity}
          title="Run a simulation"
          description="Open the motor, click Run, confirm the token estimate."
        >
          <p>
            From the motor detail page, hit{" "}
            <span className="font-medium text-foreground">Run simulation</span>.
            You&rsquo;ll see a token estimate before submitting — only the
            actual run cost is charged, and failures are refunded.
          </p>
          <p>
            Status updates stream in live: <em>queued</em> &rarr;{" "}
            <em>running</em> &rarr; <em>done</em>.
          </p>
        </Step>

        <Step
          index={3}
          icon={Rocket}
          title="Explore the results"
          description="Thrust, chamber pressure, mass flow, performance summary."
        >
          <p>
            Open any completed run from{" "}
            <Link
              href="/simulations"
              className="text-primary underline-offset-4 hover:underline"
            >
              Simulations
            </Link>{" "}
            to see plots and a performance summary (Isp, total impulse, burn
            time, peak pressure). Tweak the motor and re-run as many times as
            you like.
          </p>
        </Step>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Want the physics?
            </CardTitle>
            <CardDescription>
              The docs cover the underlying models, assumptions, and
              integration scheme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Read the documentation &rarr;
            </a>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/motors/new/solid">
              <Flame className="mr-2 h-4 w-4" />
              Build my first motor
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function Step({
  index,
  icon: Icon,
  title,
  description,
  children,
}: {
  index: number;
  icon: typeof Flame;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-sm font-semibold">{index}</span>
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <GettingStartedSolidPage />
    </ProtectedRoute>
  );
}
