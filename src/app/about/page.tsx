"use client";

import { Coins, ExternalLink } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GithubStatusCard } from "@/components/dashboard/GithubStatusCard";

const DOCS_URL = "https://felipebogaertsm.github.io/machwave/";
const AUTHOR_NAME = "Felipe Bogaerts de Mattos";
const AUTHOR_URL = "https://www.felipebm.com/";
const LICENSE_NAME = "GNU General Public License v3.0";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.en.html";

function AboutPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">about</h1>
          <p className="text-sm text-muted-foreground">
            Machwave is an open-source platform for solid rocket motor
            simulation.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Author</CardTitle>
            <CardDescription>Created and maintained by</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{AUTHOR_NAME}</dd>
              <dt className="text-muted-foreground">Website</dt>
              <dd>
                <ExternalAnchor href={AUTHOR_URL}>{AUTHOR_URL}</ExternalAnchor>
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card id="credits" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Credits &amp; limits
            </CardTitle>
            <CardDescription>
              I&rsquo;d love this all to be free! Unfortunately, cloud computing
              costs money. For this reason, a token-based system is in place to
              keep things sustainable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Each simulation consumes{" "}
              <span className="text-foreground">machwave tokens</span>, settled
              after the run completes. Failed runs are refunded automatically,
              so you only pay for compute that actually ran.
            </p>
            <ul className="space-y-2">
              <CreditsBullet
                term="Monthly grant"
                detail="10,000 tokens per account. Resets on the 1st of every month (UTC). Use it or lose it — the balance does not roll over."
              />
              <CreditsBullet
                term="Storage caps"
                detail="Up to 10 motors and 10 simulations per account. Delete one to make room."
              />
              <CreditsBullet
                term="Submission gate"
                detail="Each run is pre-charged from a heuristic estimate. If your remaining balance is less than the estimate, submission is blocked."
              />
              <CreditsBullet
                term="Reconciliation"
                detail="The worker writes back the actual cost when the run finishes. Differences vs. the estimate are reflected in the per-simulation token cost."
              />
              <CreditsBullet
                term="Admins"
                detail="Bypass all caps and balances. Their token usage is still tracked, but never gates submission."
              />
            </ul>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Repositories
          </h2>
          <div className="space-y-2">
            <GithubStatusCard owner="felipebogaertsm" name="machwave" />
            <GithubStatusCard owner="felipebogaertsm" name="machwave-api" />
            <GithubStatusCard owner="felipebogaertsm" name="machwave-web" />
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentation</CardTitle>
            <CardDescription>
              Reference, guides, and the underlying physics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExternalAnchor href={DOCS_URL}>{DOCS_URL}</ExternalAnchor>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">License</CardTitle>
            <CardDescription>
              Machwave is free software released under the {LICENSE_NAME}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You may redistribute and modify this software under the terms of
              the GPLv3. The software is provided &ldquo;as is&rdquo;, without
              warranty of any kind.
            </p>
            <ExternalAnchor href={LICENSE_URL}>
              Read the full license
            </ExternalAnchor>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function ExternalAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function CreditsBullet({ term, detail }: { term: string; detail: string }) {
  return (
    <li className="grid grid-cols-[max-content_1fr] gap-x-3">
      <span className="font-medium text-foreground">{term}</span>
      <span>{detail}</span>
    </li>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <AboutPage />
    </ProtectedRoute>
  );
}
