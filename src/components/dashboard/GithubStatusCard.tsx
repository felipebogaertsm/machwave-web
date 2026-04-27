"use client";

import { useEffect, useState } from "react";
import { Star, GitFork, Tag, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type RepoData = {
  stars: number;
  forks: number;
  pushedAt: string;
  latestTag: string | null;
};

type GithubStatusCardProps = {
  owner: string;
  name: string;
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function GithubStatusCard({ owner, name }: GithubStatusCardProps) {
  const repoUrl = `https://github.com/${owner}/${name}`;
  const apiUrl = `https://api.github.com/repos/${owner}/${name}`;
  const releaseUrl = `${apiUrl}/releases/latest`;

  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(apiUrl).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(releaseUrl).then((r) =>
        r.ok ? r.json() : r.status === 404 ? null : Promise.reject(r.status),
      ),
    ])
      .then(([repo, release]) => {
        if (cancelled) return;
        setData({
          stars: repo.stargazers_count ?? 0,
          forks: repo.forks_count ?? 0,
          pushedAt: repo.pushed_at,
          latestTag: release?.tag_name ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, releaseUrl]);

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card className="transition-colors hover:border-primary/50 hover:bg-muted/40 cursor-pointer">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground">
              <GithubMark className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {owner}/{name}
              </p>
              <p className="text-xs text-muted-foreground">GitHub repository</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {error ? (
              <span>Stats unavailable</span>
            ) : loading || !data ? (
              <>
                <Stat icon={<Tag className="h-3.5 w-3.5" />}>
                  <Skeleton className="w-12" />
                </Stat>
                <Stat icon={<Star className="h-3.5 w-3.5" />}>
                  <Skeleton className="w-6" />
                </Stat>
                <Stat icon={<GitFork className="h-3.5 w-3.5" />}>
                  <Skeleton className="w-6" />
                </Stat>
                <Stat icon={<Clock className="h-3.5 w-3.5" />}>
                  <Skeleton className="w-12" />
                </Stat>
              </>
            ) : (
              <>
                <Stat icon={<Tag className="h-3.5 w-3.5" />}>
                  <span className="font-mono text-foreground">
                    {data.latestTag ?? "—"}
                  </span>
                </Stat>
                <Stat icon={<Star className="h-3.5 w-3.5" />}>
                  <span className="text-foreground">{data.stars}</span>
                </Stat>
                <Stat icon={<GitFork className="h-3.5 w-3.5" />}>
                  <span className="text-foreground">{data.forks}</span>
                </Stat>
                <Stat icon={<Clock className="h-3.5 w-3.5" />}>
                  <span className="text-foreground">
                    {formatRelative(data.pushedAt)}
                  </span>
                </Stat>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function Stat({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

function GithubMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2 .37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 rounded bg-muted animate-pulse ${className}`}
    />
  );
}
