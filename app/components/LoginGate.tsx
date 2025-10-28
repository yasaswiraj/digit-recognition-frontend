"use client";

import React, { useEffect, useState } from "react";
import HandwritingCanvas from "./HandwritingCanvas";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://ub-fsw-server.onrender.com/api/auth/login";

export default function LoginGate({ apiUrl }: { apiUrl: string }) {
  const [ubname, setUbname] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // only ubname required
  const canLogin = ubname.trim() !== "";

  // ensure device_id exists and load saved state (ubname, token)
  useEffect(() => {
    try {
      let device = localStorage.getItem("device_id");
  if (!device) {
        // generate UUID for this device
        device = (globalThis.crypto && (globalThis.crypto as any).randomUUID)
          ? (globalThis.crypto as any).randomUUID()
          : `dev-${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem("device_id", String(device));
      }
      const savedUb = localStorage.getItem("ubname");
      const token = localStorage.getItem("auth_token");
      if (savedUb) setUbname(savedUb);
      if (token && savedUb) setLoggedIn(true);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canLogin) return;
    setLoading(true);
    setError(null);
    try {
      const generated = (globalThis.crypto && (globalThis.crypto as any).randomUUID)
        ? (globalThis.crypto as any).randomUUID()
        : `dev-${Math.random().toString(36).slice(2, 10)}`;
      const device_id: string = localStorage.getItem("device_id") ?? generated;

      const payload = {
        user_id: ubname,
        username: ubname,
        device_id,
      };

      const resp = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }

      const data = await resp.json();
      const token = data.token;
      if (token) {
        localStorage.setItem("auth_token", token);
      }
      localStorage.setItem("ubname", ubname);
      localStorage.setItem("device_id", device_id);
      setLoggedIn(true);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setLoggedIn(false);
    setUbname("");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("ubname");
    // keep device_id so device remains linked
  }

  return (
    <div className="w-full max-w-md">
      {!loggedIn ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-3 p-4 border rounded bg-white">
          <div>
            <label htmlFor="ubname" className="block text-sm font-medium text-gray-700">
              Username (ubname)
            </label>
            <input
              id="ubname"
              type="text"
              value={ubname}
              onChange={(e) => setUbname(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded"
              placeholder="enter your username"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Example: yasaswir</p>
          </div>

          {error ? <div className="text-sm text-red-600">Error: {error}</div> : null}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={!canLogin || loading}
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="text-sm text-gray-500">Please enter a username (e.g., yasaswir) to continue.</div>
          </div>
        </form>
      ) : (
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Signed in as</div>
              <div className="font-medium">{ubname}</div>
            </div>
            <button onClick={handleLogout} className="px-3 py-2 rounded bg-red-600 text-white">
              Logout
            </button>
          </div>

          <HandwritingCanvas apiUrl={apiUrl} />
        </div>
      )}
    </div>
  );
}
