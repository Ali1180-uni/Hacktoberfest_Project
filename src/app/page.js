"use client";

import { useEffect, useRef, useState } from "react";
import Analyzer from "../components/Analyzer";

const areas = ["Face", "Scalp", "Neck", "Arm", "Hand", "Torso", "Leg", "Foot", "Other"];

function GuideDialog({ onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="guide-dialog" onCancel={onClose}>
      <button className="dialog-close" aria-label="Close guide" onClick={onClose}>×</button>
      <p className="eyebrow">WELCOME TO SKINSENSE</p>
      <h2>How SkinSense works</h2>
      <div className="guide-steps">
        {[
          ["01", "Take a clear photo", "Good light, in focus, no filters. Avoid showing your face or identifying details."],
          ["02", "Add a little context", "Choose the body area so the research-oriented analysis has useful context."],
          ["03", "Read your report", "Review visible observations, research context, care information, and limitations."],
        ].map(([number, title, text]) => <div className="guide-step" key={number}><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}
      </div>
      <p className="guide-note"><strong>Research and education only, not a diagnosis.</strong> Your photo is sent to Google&apos;s AI service for analysis and is not saved by SkinSense.</p>
      <button className="button button-primary" onClick={onClose}>Start</button>
    </dialog>
  );
}

function Report({ report, onReset }) {
  const urgency = report.urgency === "self_care" ? "Self-care may be reasonable" : "Consider speaking with a professional";
  return <section className="report" aria-live="polite">
    <div className={`urgency urgency-${report.urgency}`}><span aria-hidden="true">!</span><div><strong>{urgency}</strong><p>{report.urgency === "self_care" ? "Keep an eye on changes and stop anything that irritates the area." : "The model flagged a reason to seek timely, in-person advice."}</p></div></div>
    <div className="report-section"><p className="eyebrow">RESEARCH-ORIENTED ANALYSIS</p><h2>What we noticed</h2><p className="report-summary">{report.summary}</p></div>
    <ReportList title="What the image shows" items={report.observations.map((x) => <><strong>{x.feature}</strong> <span>{x.location} — {x.caveat}</span></>)} />
    <ReportList title="What this could mean" items={report.possibleExplanations.map((x) => <><strong>{x.label}</strong> <span>{x.rationale} {x.alternatives.join(" ")}</span></>)} />
    <ReportList title="Care steps" items={report.careSteps.map((x) => <><strong>{x.step}</strong> <span>{x.why}</span></>)} />
    <ReportList title="General OTC information" items={report.otcInfo.map((x) => <><strong>{x.ingredientOrCategory}</strong> <span>{x.purpose} {x.cautions.join(" ")}</span></>)} />
    <div className="report-section"><h3>When to see a professional</h3><p>Seek urgent help for trouble breathing, swelling of the lips, face or throat, severe pain, or rapidly spreading redness. Arrange a routine visit for a persistent, changing, bleeding, or non-healing spot.</p></div>
    <div className="report-section limitations"><h3>Important limitations</h3>{report.limitations.map((x) => <p key={x}>{x}</p>)}</div>
    <div className="report-actions"><button className="button button-primary" onClick={onReset}>Analyze another photo</button><button className="button button-secondary" onClick={() => window.print()}>Print / save as PDF</button></div>
  </section>;
}

function ReportList({ title, items }) {
  return <div className="report-section"><h3>{title}</h3><ul className="report-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>;
}

export default function Home() {
  const [guide, setGuide] = useState(false);
  const [status, setStatus] = useState("idle");
  const [report, setReport] = useState(null);

  const closeGuide = () => { setGuide(false); document.querySelector("dialog")?.close(); sessionStorage.setItem("skinsense:guide-seen", "1"); };
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!sessionStorage.getItem("skinsense:guide-seen")) setGuide(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const reset = () => { setReport(null); setStatus("idle"); };
  return <main>
    {guide && <GuideDialog onClose={closeGuide} />}
    <header className="site-header"><a className="wordmark" href="#">Skin<span>Sense</span></a><nav><button onClick={() => setGuide(true)}>How it works</button><a href="#sources">Sources</a><span className="tag">Research tool</span></nav></header>
    <section className="hero"><div className="eyebrow">A CALMER WAY TO START</div><h1>Understand what your skin may be telling you.</h1><p>SkinSense provides research-oriented visual observations and care education. It cannot diagnose a condition or replace a clinician.</p><a href="#analyze" className="button button-primary">Upload a photo <span aria-hidden="true">→</span></a></section>
    <section className="analyzer-wrap" id="analyze"><div className="section-heading"><p className="eyebrow">01 / CHECK YOUR SKIN</p><h2>Start with a photo</h2><p>Share a clear image of one visible skin concern. We&apos;ll combine it with the context you provide.</p></div>
      <Analyzer onResult={(result) => { setReport(result); setStatus("result"); }} onReset={reset} />
    </section>
    {status === "result" && report && <div className="report-wrap"><Report report={report} onReset={reset} /></div>}
    <section className="basics"><p className="eyebrow">02 / THE BASICS</p><h2>Small habits, helpful foundations</h2><div className="basics-grid"><article><span>01</span><h3>Clean gently</h3><p>Use lukewarm water and a mild cleanser. Skip harsh scrubs.</p></article><article><span>02</span><h3>Moisturize</h3><p>A simple, fragrance-free moisturizer can support your skin barrier.</p></article><article><span>03</span><h3>Protect from sun</h3><p>Choose broad-spectrum SPF 30+ and reapply as directed.</p></article></div></section>
    <footer id="sources"><div><a className="wordmark" href="#">Skin<span>Sense</span></a><p>Educational information for a better-informed next step.</p></div><div className="footer-links"><strong>Sources &amp; limits</strong><a href="https://www.aad.org/public/everyday-care/skin-care-basics" target="_blank" rel="noreferrer">American Academy of Dermatology</a><a href="https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api" target="_blank" rel="noreferrer">Google AI / Gemma</a></div><p className="copyright">Your image is sent to Google&apos;s AI service and is not stored by SkinSense. This tool cannot diagnose skin conditions.</p></footer>
  </main>;
}
