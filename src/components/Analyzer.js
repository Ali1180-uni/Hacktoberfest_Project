"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

const areas = ["Face", "Scalp", "Neck", "Arm", "Hand", "Torso", "Leg", "Foot", "Other"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 5 * 1024 * 1024;

export default function Analyzer({ onResult, onReset }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [area, setArea] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const chooseFile = (event) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (!allowedTypes.includes(next.type) || next.size > maxBytes) {
      const message = "Use a JPEG, PNG, or WebP image smaller than 5 MB.";
      setError(message);
      toast.error("Image not accepted", { description: message });
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError("");
    setStatus("ready");
    toast.success("Photo ready", { description: "Review the area and consent, then start the analysis." });
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setConsent(false);
    setArea("");
    setError("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
    onReset?.();
  };

  const analyze = async (event) => {
    event.preventDefault();
    if (!file || !consent || status === "analyzing") return;

    setStatus("analyzing");
    setError("");
    const formData = new FormData();
    formData.append("image", file);
    formData.append("area", area);
    const startedAt = Date.now();

    try {
      const serialized = new Response(formData);
      const payload = await serialized.arrayBuffer();
      const contentType = serialized.headers.get("content-type");
      console.debug("[SkinSense] analyze request start", new Date(startedAt).toISOString());
      console.debug("[SkinSense] analyze payload size", payload.byteLength, "bytes");

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: contentType ? { "Content-Type": contentType } : undefined,
        body: payload,
      });
      const endedAt = Date.now();
      console.debug("[SkinSense] analyze request end", new Date(endedAt).toISOString(), "latencyMs", endedAt - startedAt);
      console.debug("[SkinSense] analyze HTTP status", response.status);

      const rawBody = await response.text();
      let body;
      try {
        body = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        throw new Error("The analysis service returned an unreadable response. Please try again.");
      }
      if (!response.ok) {
        throw new Error(body?.message || `Analysis failed with HTTP ${response.status}.`);
      }
      if (!body || typeof body !== "object") {
        throw new Error("The analysis service returned an empty report. Please try again.");
      }
      console.debug("[SkinSense] analyze parsed response", body);
      setStatus("result");
      onResult(body);
      toast.success("Analysis complete", { description: "Your research-oriented report is ready below." });
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : "The analysis request failed. Check your connection and try again.";
      console.debug("[SkinSense] analyze request error", requestError);
      setError(message);
      setStatus("error");
      toast.error("Analysis could not be completed", { description: message, duration: 7000 });
    }
  };

  if (status === "analyzing") {
    return (
      <div className="analyzer-panel analyzer-loading" role="status" aria-live="polite">
        {/* The requirement intentionally uses a public SVG as an animation asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="loading-svg" src="/loading.svg" alt="" />
        <strong>Preparing your research report</strong>
        <p>Checking the image and waiting for the analysis service.</p>
      </div>
    );
  }

  return (
    <form className="analyzer-panel analyzer" onSubmit={analyze}>
      {status === "error" && (
        <div className="analyzer-error" role="alert">
          <strong>We couldn&apos;t create the report</strong>
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={() => { setError(""); setStatus(file ? "ready" : "idle"); }}>Retry</button>
        </div>
      )}
      {!file ? (
        <button type="button" className="upload-zone" onClick={() => inputRef.current?.click()}>
          <span className="upload-mark">＋</span><strong>Choose a photo</strong>
          <span>or drag and drop it here</span><small>JPEG, PNG or WebP, up to 5 MB</small>
        </button>
      ) : (
        <div className="preview-wrap">
          <Image src={preview} unoptimized width={130} height={130} alt="Selected skin photo preview" />
          <div><strong>Photo ready</strong><p>{file.name}</p>
            <button type="button" className="text-button" onClick={() => inputRef.current?.click()}>Replace</button>
            <button type="button" className="text-button danger" onClick={reset}>Remove</button>
          </div>
        </div>
      )}
      <input ref={inputRef} className="sr-only" type="file" accept={allowedTypes.join(",")} onChange={chooseFile} />
      <label className="field-label" htmlFor="area">What area is this?
        <select id="area" value={area} onChange={(event) => setArea(event.target.value)}>
          <option value="">Select an area</option>{areas.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}
        </select>
      </label>
      <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand this photo is sent to Google&apos;s AI service to create my report. SkinSense does not save it.</span></label>
      {status !== "error" && error && <p className="analyzer-error-text" role="alert">{error}</p>}
      <button className="analyze-button retry-button" disabled={!file || !consent}>Analyze photo <span aria-hidden="true">→</span></button>
    </form>
  );
}
