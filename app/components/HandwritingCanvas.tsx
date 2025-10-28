"use client";

import React, { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export default function HandwritingCanvas({ apiUrl }: { apiUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { label: number; confidence?: number }>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDigit, setSelectedDigit] = useState<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = 280;
    canvas.height = 280;
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 18;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPointerPos(e: PointerEvent | React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e as PointerEvent).clientX - rect.left;
    const y = (e as PointerEvent).clientY - rect.top;
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const p = getPointerPos(e);
    const s: Point[] = [p];
    setCurrentStroke(s);
    setStrokes((prev) => [...prev]);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDrawing || !currentStroke) return;
    const p = getPointerPos(e);
    setCurrentStroke((prev) => {
      if (!prev) return prev;
      const next = [...prev, p];
      drawStrokeSegment(prev[prev.length - 1], p);
      return next;
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  }

  function drawStrokeSegment(a: Point, b: Point) {
    const ctx = ctxRef.current!;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function redraw() {
    const canvas = canvasRef.current!;
    const ctx = ctxRef.current!;
    // clear to white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  function clear() {
    setStrokes([]);
    setResult(null);
    setError(null);
    const ctx = ctxRef.current!;
    const canvas = canvasRef.current!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
    setResult(null);
    setError(null);
  }

  // Export a resized 28x28 grayscale PNG blob (suitable for many digit models)
  async function exportResizedBlob(): Promise<Blob> {
    const src = canvasRef.current!;
    const tmp = document.createElement("canvas");
    tmp.width = 28;
    tmp.height = 28;
    const tctx = tmp.getContext("2d")!;
    // draw white background then scaled image
    tctx.fillStyle = "white";
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    // draw source onto tmp, scaling
    tctx.drawImage(src, 0, 0, tmp.width, tmp.height);
    return await new Promise<Blob>((res) => tmp.toBlob((b) => res(b!), "image/png"));
  }

  async function handlePredict() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const blob = await exportResizedBlob();
      const form = new FormData();
      form.append("image", blob, "digit.png");
      // include the selected ground-truth digit under the name expected by the classifier
      form.append("true_label", String(selectedDigit));

      // attach optional user metadata if available
      if (typeof window !== "undefined") {
        const ub = localStorage.getItem("ubname");
        const device = localStorage.getItem("device_id");
        if (ub) {
          // send both username and user_id (some backends expect user_id)
          form.append("username", ub);
          form.append("user_id", ub);
        }
        if (device) form.append("device_id", device);
      }

      // include auth token if present (from login)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Do NOT set Content-Type header when sending FormData; browser will set the boundary.
      const resp = await fetch(apiUrl, { method: "POST", body: form, headers: Object.keys(headers).length ? headers : undefined });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }
      const data = await resp.json();
      // backend may return different keys; prefer `predicted_label` as returned by the classifier
      const predictedRaw = data?.predicted_label ?? data?.predicted ?? data?.label ?? data?.prediction ?? data?.result;
      const labelNum = typeof predictedRaw === "number" ? predictedRaw : Number(predictedRaw);
      if (!Number.isFinite(labelNum)) {
        throw new Error("No prediction returned from classifier");
      }
      setResult({ label: labelNum, confidence: data.confidence });
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[320px] sm:w-[420px] flex flex-col items-center gap-4">
      <div className="rounded-md shadow-sm border border-gray-200 dark:border-gray-700 bg-white">
        <canvas
          ref={canvasRef}
          className="block touch-none rounded-md"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: 280, height: 280, touchAction: "none" }}
        />
      </div>

      <div className="w-full flex items-center justify-center">
        <label htmlFor="ground-truth" className="mr-2 text-sm text-gray-700">Actual digit:</label>
        <select
          id="ground-truth"
          value={selectedDigit}
          onChange={(e) => setSelectedDigit(Number(e.target.value))}
          className="px-2 py-1 border rounded"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={clear}
          className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          onClick={undo}
          className="px-3 py-2 rounded bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50"
          disabled={strokes.length === 0}
        >
          Undo
        </button>
        <button
          onClick={handlePredict}
          className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Predicting..." : "Predict"}
        </button>
      </div>

      <div className="w-full text-center">
        {result ? (
          <div className="text-lg font-bold" aria-live="polite">
            Prediction: {result.label}
            {typeof result.confidence === "number" ? (
              <span className="ml-2 text-sm font-normal">({(result.confidence * 100).toFixed(1)}%)</span>
            ) : null}
          </div>
        ) : error ? (
          <div className="text-sm text-red-600" aria-live="polite">Error: {error}</div>
        ) : (
          <div className="text-sm text-gray-600">Draw a digit (0-9) and click Predict</div>
        )}
        <div className="mt-2 text-sm text-gray-700">Ground truth: <span className="font-medium">{selectedDigit}</span></div>
      </div>
    </div>
  );
}
