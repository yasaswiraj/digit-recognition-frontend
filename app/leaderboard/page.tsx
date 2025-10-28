"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

type Entry = { rank: number; ubname: string; niceness: number; tests: number };
type StatItem = { accuracy?: number; predictions?: number; voted_by?: string };

const SAMPLE: Entry[] = [
  { rank: 1, ubname: "yasaswir", niceness: 9, tests: 120 },
  { rank: 2, ubname: "aria", niceness: 8, tests: 95 },
  { rank: 3, ubname: "dev123", niceness: 7, tests: 88 },
  { rank: 4, ubname: "mlu", niceness: 7, tests: 72 },
  { rank: 5, ubname: "tester", niceness: 6, tests: 60 },
];

const STATS_URL = process.env.NEXT_PUBLIC_STATS_URL ?? "https://ub-fsw-server.onrender.com/api/digit-classifier/stats";

export default function LeaderboardPage() {
  const [stats, setStats] = useState<StatItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const resp = await fetch(STATS_URL, { headers: Object.keys(headers).length ? headers : undefined });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || resp.statusText);
        }
        const data = await resp.json();
        if (mounted) setStats(data as StatItem[]);
      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen p-8 sm:p-20 flex flex-col items-center gap-8 font-[family-name:var(--font-geist-sans)]">
      <header className="w-full max-w-3xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <p className="text-sm text-gray-600">Top contributors and their stats</p>
        </div>
        <Link href="/" className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200">
          Back
        </Link>
      </header>

      <main className="w-full max-w-3xl flex flex-col gap-6">
        <section className="p-4 border rounded bg-white">
          <h2 className="text-lg font-medium">Stats</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Loading stats…</div>
          ) : error ? (
            <div className="text-sm text-red-600">Error loading stats: {error}</div>
          ) : stats && stats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              {stats.map((s, i) => (
                <div key={i} className="p-3 border rounded">
                  <div className="text-xs text-gray-500">Voted by</div>
                  <div className="font-medium">{s.voted_by ?? "-"}</div>
                  <div className="text-xs text-gray-500 mt-1">Predictions</div>
                  <div>{s.predictions ?? "-"}</div>
                  <div className="text-xs text-gray-500 mt-1">Accuracy</div>
                  <div>{typeof s.accuracy === "number" ? (s.accuracy * 100).toFixed(1) + "%" : "-"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-2">No stats available — showing sample leaderboard below.</div>
          )}
        </section>

        <section>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Rank</th>
                  <th className="text-left p-3">Username</th>
                  <th className="text-left p-3">Niceness</th>
                  <th className="text-left p-3">Tests</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // build leaderboard from stats when available, otherwise use SAMPLE
                  if (stats && stats.length > 0) {
                    // map stats -> entries
                    const entries: Entry[] = stats.map((s) => ({
                      rank: 0,
                      ubname: s.voted_by ?? "-",
                      niceness: Math.round((s.accuracy ?? 0) * 10),
                      tests: s.predictions ?? 0,
                    }));
                    // sort by tests desc
                    entries.sort((a, b) => b.tests - a.tests);
                    // assign ranks
                    return entries.map((e, idx) => (
                      <tr key={e.ubname + idx} className="border-t">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3 font-medium">{e.ubname}</td>
                        <td className="p-3">{e.niceness}</td>
                        <td className="p-3">{e.tests}</td>
                      </tr>
                    ));
                  }

                  return SAMPLE.map((e) => (
                    <tr key={e.rank} className="border-t">
                      <td className="p-3">{e.rank}</td>
                      <td className="p-3 font-medium">{e.ubname}</td>
                      <td className="p-3">{e.niceness}</td>
                      <td className="p-3">{e.tests}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
