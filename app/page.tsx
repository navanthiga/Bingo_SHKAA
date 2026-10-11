"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, CheckCircle2, Camera, Heart, ImagePlus, LockKeyhole, Sparkles, Trophy, X } from "lucide-react";
import { TASKS } from "@/lib/tasks";

type Participant = { id: string; name: string; code: string };
type Submission = { task_id: number; response_text: string | null; storage_path: string | null; tile_index: number };
type WinningTask = { tileIndex: number; taskId: number; title: string; responseText: string | null; evidenceUrl: string | null; submittedAt: string };
type WinningSummary = { participantName: string; winningLine: number[]; winningTasks: WinningTask[] };
const STORAGE_KEY = "shkaa-bingo-participant";
const MAX_COMPRESSED_BYTES = 500 * 1024;

/** Compresses any supported browser-decodable image to a JPEG no larger than 500 KB. */
async function compressImageTo500KB(input: File): Promise<File> {
  if (!input.type.startsWith("image/")) throw new Error("Please choose an image file.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new Error("This image could not be opened. Please try a JPG, PNG or WebP image.");
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process this image. Please try another image.");

    // Start at a phone-friendly size, then shrink further only if needed to meet the hard size cap.
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let dimensionPass = 0; dimensionPass < 10; dimensionPass++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      // JPEG has no transparency, so white is used behind transparent PNG/WebP pixels.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.22, 0.12]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_COMPRESSED_BYTES) {
          const baseName = input.name.replace(/\.[^.]+$/, "") || "evidence";
          return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
        }
      }
      scale *= 0.75;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("This image could not be reduced to 500 KB. Please choose another image.");
}

export default function Home() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [bingoSent, setBingoSent] = useState(false);
  const [winningSummary, setWinningSummary] = useState<WinningSummary | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { const p = JSON.parse(raw) as Participant; setParticipant(p); void loadProgress(p); }
      catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }, []);

  async function loadProgress(p: Participant) {
    const res = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: p.id, code: p.code }) });
    const data = await res.json();
    if (res.ok) {
      setSubmissions(data.submissions ?? []);
      setBingoSent(Boolean(data.bingoSent));
      if (data.winningSummary) setWinningSummary(data.winningSummary);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setParticipant(null);
    }
  }

  async function join(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await fetch("/api/participant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start your board.");
      const p = { id: data.participant.id, name: data.participant.name, code };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setParticipant(p); setSubmissions(data.submissions ?? []); setBingoSent(Boolean(data.bingoSent));
      if (data.winningSummary) setWinningSummary(data.winningSummary);
      else { setWinningSummary(null); void loadProgress(p); }
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const completedIds = useMemo(() => new Set(submissions.map(s => s.task_id)), [submissions]);
  const greenTiles = useMemo(() => new Set(submissions.map(s => s.tile_index)), [submissions]);
  const bingoLine = useMemo(() => {
    const lines: number[][] = [];
    for (let r=0;r<5;r++) lines.push([0,1,2,3,4].map(c => r*5+c));
    for (let c=0;c<5;c++) lines.push([0,1,2,3,4].map(r => r*5+c));
    lines.push([0,1,2,3,4].map(i=>i*5+i), [0,1,2,3,4].map(i=>i*5+(4-i)));
    return lines.find(line => line.every(i => greenTiles.has(i))) ?? null;
  }, [greenTiles]);
  const active = TASKS.find(t => t.id === activeTask);

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!participant || !active) return;
    if (active.kind === "photo" && !file) { setError("Please add a photo or screenshot first."); return; }
    if (active.kind === "text" && !responseText.trim()) { setError("Please fill in the required answer."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.append("participantId", participant.id); form.append("code", participant.code); form.append("taskId", String(active.id));
      form.append("responseText", responseText.trim());
      if (file) {
        setNotice("Compressing image to 500 KB or less…");
        const compressedFile = await compressImageTo500KB(file);
        if (compressedFile.size > MAX_COMPRESSED_BYTES) throw new Error("Image compression failed. Please choose another image.");
        form.append("file", compressedFile, compressedFile.name);
        setNotice(`Image compressed to ${(compressedFile.size / 1024).toFixed(0)} KB. Saving your challenge…`);
      }
      const res = await fetch("/api/submit-task", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setSubmissions(prev => [...prev.filter(s => s.task_id !== active.id), data.submission]);
      setNotice("Lovely! Your challenge is saved and a random tile has turned green.");
      setActiveTask(null); setResponseText(""); setFile(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Submission failed."); }
    finally { setBusy(false); }
  }

  async function submitBingo() {
    if (!participant || !bingoLine) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/submit-bingo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: participant.id, code: participant.code, line: bingoLine }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit bingo.");
      setBingoSent(true);
      setWinningSummary({ participantName: data.participantName, winningLine: data.winningLine, winningTasks: data.winningTasks });
      setNotice("BINGO submitted! Show the winning lane summary below to the organizer. The game stays open for everyone.");
    } catch (err) { setError(err instanceof Error ? err.message : "Bingo submission failed."); }
    finally { setBusy(false); }
  }

  function resetBoard() {
    if (!confirm("This removes this browser's saved participant details. Your submitted data remains on the server. Continue?")) return;
    localStorage.removeItem(STORAGE_KEY); setParticipant(null); setSubmissions([]); setBingoSent(false); setWinningSummary(null); setNotice(""); setError("");
  }

  return (
    <main className="page-shell">
      <div className="paper-texture" aria-hidden="true" />
      <header className="brand-header">
        <div className="brand-mark"><Heart size={25}/><span>SHKAA</span></div>
        <div className="brand-tagline">create freely, connect kindly.</div>
        <div className="header-stamp"><Sparkles size={15}/> TOTE & TOAST · 001</div>
      </header>

      {!participant ? (
        <section className="welcome-card">
          <div className="eyebrow"><Heart size={14}/> A little creativity, a lot of connection</div>
          <h1>Let the games<br/><em>begin.</em></h1>
          <p className="intro">Meet someone new, paint something lovely, and collect a little BINGO magic along the way.</p>
          <form onSubmit={join} className="join-form">
            <label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" maxLength={70} required /></label>
            <label>Participant code<input value={code} onChange={e=>setCode(e.target.value)} placeholder="Ask the organizer for your code" minLength={4} maxLength={32} required /></label>
            <button className="button button-primary" disabled={busy}>{busy ? "Getting your board…" : "Start my bingo board"} <ArrowUpRight size={17}/></button>
          </form>
          <p className="tiny-note"><LockKeyhole size={13}/> Your board is saved so you can come back to it.</p>
          {error && <p className="error-message">{error}</p>}
        </section>
      ) : (
        <>
          <section className="hello-row">
            <div><div className="eyebrow">YOUR LITTLE ADVENTURE</div><h1>Hi, {participant.name.split(" ")[0]} <span className="hello-flower">✿</span></h1><p>Collect moments, not just squares.</p></div>
            <button className="text-button" onClick={resetBoard}>Switch player</button>
          </section>

          <section className="progress-card">
            <div className="progress-copy"><span>YOUR COLLECTION</span><strong>{submissions.length}<small> / 25 challenges</small></strong></div>
            <div className="progress-track"><div style={{width:`${submissions.length/25*100}%`}}/></div>
            <div className="progress-bottom"><span>{25-submissions.length} little adventures left</span><span>{Math.round(submissions.length/25*100)}%</span></div>
          </section>

          <section className="section-block">
            <div className="section-heading"><div><div className="eyebrow">THE CHALLENGE MENU</div><h2>Pick a little prompt</h2></div><span className="count-pill">{submissions.length} done</span></div>
            <p className="section-description">Tap a card, do the thing, then add your proof. Easy peasy.</p>
            <div className="prompt-grid">
              {TASKS.map(task => {
                const done = completedIds.has(task.id);
                return <button key={task.id} className={`prompt-card ${done ? "prompt-done" : ""}`} onClick={()=>{ if(!done){setActiveTask(task.id);setError("");setNotice("");} }}>
                  <span className="prompt-number">{String(task.id).padStart(2,"0")}</span>
                  <span className="prompt-title">{task.title}</span>
                  <span className="prompt-footer">{done ? <><CheckCircle2 size={14}/> COMPLETED</> : task.kind === "photo" ? <><Camera size={14}/> PHOTO PROOF</> : <><Sparkles size={14}/> QUICK ANSWER</>}</span>
                </button>;
              })}
            </div>
          </section>

          <section className="section-block bingo-section">
            <div className="section-heading"><div><div className="eyebrow">THE BIG MOMENT</div><h2>Your bingo board</h2></div><span className="count-pill">{greenTiles.size} / 25 tiles</span></div>
            <p className="section-description">Every completed prompt lights up one random square. Five in a row, column or diagonal makes BINGO!</p>
            <div className="bingo-board" role="img" aria-label="Your 5 by 5 bingo board">
              {Array.from({length:25},(_,i)=>{
                const isGreen=greenTiles.has(i);
                const inLine=Boolean(bingoLine?.includes(i));
                return <div key={i} className={`bingo-tile ${isGreen?"tile-green":""} ${inLine?"tile-winning":""}`}><span>{isGreen?<Check size={22}/>:String(i+1).padStart(2,"0")}</span>{isGreen&&<small>DONE</small>}</div>;
              })}
            </div>
            {bingoLine && <div className="bingo-alert"><Trophy size={20}/><div><strong>BINGO, darling!</strong><span>Your lane is ready. Submit it and show your phone to the organizer.</span></div></div>}
            {bingoLine && !bingoSent && <button className="button button-primary full-button" disabled={busy} onClick={submitBingo}>Submit my BINGO <ArrowUpRight size={17}/></button>}
            {bingoSent && <div className="submitted-banner"><CheckCircle2 size={18}/> BINGO submitted. The game stays open for everyone!</div>}
            {bingoSent && winningSummary && <section className="winning-summary" aria-live="polite">
              <div className="summary-heading"><Trophy size={22}/><div><div className="eyebrow">SHOW THIS TO THE ORGANIZER</div><h3>Winning lane summary</h3><p>{winningSummary.participantName} · {winningSummary.winningTasks.length} tasks to verify</p></div></div>
              <div className="summary-task-list">
                {winningSummary.winningTasks.map((task,index)=><article className="summary-task" key={`${task.taskId}-${task.tileIndex}`}>
                  <div className="summary-task-number">{index+1}</div>
                  <div className="summary-task-content">
                    <strong>{task.title}</strong>
                    <span className="summary-meta">Tile {task.tileIndex+1} · Prompt {task.taskId}</span>
                    {task.responseText && <p className="summary-response">{task.responseText}</p>}
                    {task.evidenceUrl && <a className="evidence-link" href={task.evidenceUrl} target="_blank" rel="noreferrer">View uploaded evidence <ArrowUpRight size={14}/></a>}
                  </div>
                </article>)}
              </div>
              <p className="summary-footnote"><LockKeyhole size={14}/> Evidence links are private and expire after one hour. Keep this page open while verifying.</p>
            </section>}
          </section>
          {notice && <div className="notice-message"><CheckCircle2 size={18}/>{notice}</div>}
          {error && <div className="error-message">{error}</div>}
          <div className="bottom-actions"><span><Heart size={14}/> Be kind. Make something. Meet someone.</span><button className="text-button" onClick={resetBoard}>Not you?</button></div>
        </>
      )}

      <footer className="site-footer"><span>SHKAA · TOTE & TOAST</span><span>MADE FOR MAKING CONNECTIONS ♡</span></footer>

      {active && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setActiveTask(null);setFile(null);setResponseText("");setError("");}}}>
        <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
          <button className="modal-close" aria-label="Close" onClick={()=>{setActiveTask(null);setFile(null);setResponseText("");setError("");}}><X size={19}/></button>
          <div className="modal-icon">{active.kind==="photo"?<Camera size={22}/>:<Sparkles size={22}/>}</div>
          <div className="eyebrow">CHALLENGE {String(active.id).padStart(2,"0")} OF 25</div>
          <h2 id="task-modal-title">{active.title}</h2><p>{active.helper}</p>
          <form onSubmit={submitTask} className="task-form">
            {active.kind==="photo" ? <label className="upload-zone">
              <ImagePlus size={28}/><strong>{file ? file.name : "Choose a photo or screenshot"}</strong><span>JPG, PNG or WebP · Automatically compressed to 500 KB or less before upload</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] ?? null)} required/>
            </label> : <label>Your response<textarea value={responseText} onChange={e=>setResponseText(e.target.value)} placeholder="Write your answer here…" rows={4} maxLength={1000} required/></label>}
            {error && <p className="error-message">{error}</p>}
            <button className="button button-primary full-button" disabled={busy}>{busy?"Saving your moment…":"Submit challenge"} <ArrowUpRight size={17}/></button>
          </form>
          <p className="tiny-note"><LockKeyhole size={13}/> One completed submission per prompt.</p>
        </section>
      </div>}
    </main>
  );
}
