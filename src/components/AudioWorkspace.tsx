import { useEffect, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, Clock, FileAudio, Loader2, MapPin, Mic, Plane, RotateCcw, ShieldCheck, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocatorMap, { ICICS } from "./LocatorMap";
import { STAGE_LABELS, type AnalysisReport, type Stage } from "@/lib/acoustics/pipeline";

const ACCURACY = [
  { value: 5, label: "Exact (±5 s)" },
  { value: 30, label: "Within 30 seconds" },
  { value: 120, label: "Within 2 minutes" },
  { value: 300, label: "Within 5 minutes" },
];

const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 19);
};
const fmtCoord = (lat: number, lon: number) => `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
const fmtClock = (unix: number) => new Date(unix * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

type Audio = { name: string; url: string; blob: Blob };

export default function AudioWorkspace({ demoRequest }: { demoRequest: number }) {
  const [audio, setAudio] = useState<Audio | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<"ready" | "running" | "demo" | "result">("ready");
  const [runStage, setRunStage] = useState<{ s: Stage; p?: number }>({ s: "decode" });
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [startAt, setStartAt] = useState("");
  const [timeSource, setTimeSource] = useState<"file" | "recording" | "">("");
  const [accuracy, setAccuracy] = useState(300);
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recordStart = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (audio?.url) URL.revokeObjectURL(audio.url); }, [audio]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current) recorder.current.onstop = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setElapsed(value => value + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);
  useEffect(() => {
    if (!demoRequest) return;
    setStage("running"); setRunStage({ s: "search", p: 0.6 });
    timer.current = setTimeout(() => setStage("demo"), 1800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [demoRequest]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name)) {
      setError("Please choose an audio recording or voice memo."); return;
    }
    setError(""); setStage("ready"); setReport(null);
    const url = URL.createObjectURL(file);
    setAudio({ name: file.name, url, blob: file });
    // a voice memo's "last modified" time is usually when recording stopped
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      const dur = isFinite(probe.duration) ? probe.duration : 0;
      setStartAt(toLocalInput(file.lastModified - dur * 1000)); setTimeSource("file"); setAccuracy(300);
    };
    probe.onerror = () => { setStartAt(toLocalInput(file.lastModified)); setTimeSource("file"); };
  };
  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Upload a voice memo instead."); return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      stream.current = media;
      const next = new MediaRecorder(media);
      recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        const blob = new Blob(chunks, { type: next.mimeType });
        setAudio({ name: "Microphone recording", url: URL.createObjectURL(blob), blob });
        setStartAt(toLocalInput(recordStart.current)); setTimeSource("recording"); setAccuracy(5);
        setStage("ready"); setReport(null); setRecording(false);
        media.getTracks().forEach(track => track.stop());
      };
      next.start(); recordStart.current = Date.now(); setElapsed(0); setRecording(true);
    } catch { setError("Microphone access is unavailable. Allow access or upload an audio file."); }
  };
  const analyze = async () => {
    if (!audio) return;
    setError("");
    setStage("demo");
  };

  const reset = () => { setStage("ready"); setReport(null); };
  const top = report?.result?.candidates[0];

  return <section id="workspace" className="workspace scroll-mt-8">
    <div className="workspace-heading"><span><AudioLines size={18} /> AUDIO WORKSPACE</span><span className="demo-label">EXPERIMENTAL · METRO VANCOUVER</span></div>
    <div className="audio-tool">
      <div className="tool-topline"><h2>{stage === "result" || stage === "demo" ? "Location estimate" : "Every sound has a starting point."}</h2><span className="local-label"><ShieldCheck size={14} /> Audio stays on this device</span></div>

      {stage === "demo" ? <div className="result-layout">
        <LocatorMap />
        <div className="result-details"><span className="demo-label">SIMULATED RESULT</span><h3>{ICICS.name}</h3><p className="coordinates"><MapPin size={14} /> 49.2613° N, 123.2489° W</p><p>{ICICS.address}</p><div className="result-divider" /><p>This is a sample to show what a result looks like. It wasn't worked out from a recording.</p><Button variant="outline" onClick={reset}><RotateCcw /> New recording</Button></div>
      </div>

      : stage === "running" ? <div className="analysis-state" role="status"><Loader2 className="animate-spin" size={30} /><h3>{STAGE_LABELS[runStage.s]}…</h3><p>{runStage.s === "search" && runStage.p !== undefined ? `${Math.round(runStage.p * 100)}%` : "This can take up to a minute"}</p><div className="analysis-progress"><span /></div></div>

      : <>
        <div className="input-options">
          <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !recording) loadFile(file); }}>
            <input ref={input} type="file" accept="audio/*,.m4a,.flac" className="sr-only" aria-label="Upload audio recording" disabled={recording} onChange={event => { const file = event.target.files?.[0]; if (file) loadFile(file); event.target.value = ""; }} />
            {audio ? <><FileAudio size={26} /><span className="file-name">{audio.name}</span><audio controls src={audio.url} aria-label="Audio preview" /><Button variant="ghost" size="icon" className="remove-audio" aria-label="Remove audio" onClick={() => { setAudio(null); setStartAt(""); setTimeSource(""); }} disabled={recording}><X /></Button></> : <><div className="upload-icon"><Upload size={21} /></div><Button variant="ghost" onClick={() => input.current?.click()} disabled={recording} className="upload-command">Choose an audio file <ArrowRight size={14} /></Button><p>or drop your voice memo here</p><span className="file-types">MP3, WAV, M4A, OGG, FLAC</span></>}
          </div>
          <span className="or-label">or</span>
          <div className={`record-zone ${recording ? "is-recording" : ""}`}><div className="record-icon"><Mic size={23} /></div><h3>{recording ? `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}` : "Capture the moment"}</h3><p>{recording ? "Recording your surroundings" : "Start with a live audio recording"}</p><Button variant="outline" className="record-button" onClick={recording ? () => recorder.current?.stop() : startRecording}>{recording ? <Square size={13} /> : <Mic size={13} />}{recording ? "Stop recording" : "Record audio"}</Button></div>
        </div>
        {audio && <div className="time-fields">
          <label><span><Clock size={12} /> Recording started</span><input type="datetime-local" step={1} value={startAt} onChange={e => { setStartAt(e.target.value); setTimeSource(""); }} /></label>
          <label><span>How sure are you of that time?</span><select value={accuracy} onChange={e => setAccuracy(Number(e.target.value))}>{ACCURACY.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
          <p>{timeSource === "file" ? "Filled in from the file's details. Please check it, since copying a file can change this time." : timeSource === "recording" ? "Taken from this device's clock when you started recording." : "Times are in your local time zone."}</p>
        </div>}
        {error && <p role="alert" className="text-destructive mt-4 text-sm">{error}</p>}
        <div className="tool-bottom"><p><Check size={14} /> Your recording stays on this device.</p><Button onClick={analyze} disabled={!audio || recording}>Preview location <ArrowRight /></Button></div>
      </>}
    </div>
    <p className="preview-disclaimer">Location results are simulated. Live aircraft matching is not connected; audio alone cannot reliably pinpoint a caller.</p>
  </section>;
}
