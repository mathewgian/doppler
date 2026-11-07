import { useEffect, useRef, useState } from "react";
import { ArrowRight, AudioLines, Check, FileAudio, Loader2, Mic, RotateCcw, ShieldCheck, Square, Upload, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocatorMap, { ICICS } from "./LocatorMap";

export default function AudioWorkspace({ demoRequest }: { demoRequest: number }) {
  const [audio, setAudio] = useState<{ name: string; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<"ready" | "running" | "result">("ready");
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
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
    setStage("running");
    timer.current = setTimeout(() => setStage("result"), 1800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [demoRequest]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name)) {
      setError("Please choose an audio recording or voice memo."); return;
    }
    setError(""); setStage("ready");
    setAudio({ name: file.name, url: URL.createObjectURL(file) });
  };
  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser. Upload a voice memo instead."); return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const next = new MediaRecorder(media);
      recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        const blob = new Blob(chunks, { type: next.mimeType });
        setAudio({ name: "Microphone recording", url: URL.createObjectURL(blob) });
        setStage("ready"); setRecording(false);
        media.getTracks().forEach(track => track.stop());
      };
      next.start(); setElapsed(0); setRecording(true);
    } catch { setError("Microphone access is unavailable. Allow access or upload an audio file."); }
  };
  const analyze = () => {
    setStage("running");
    timer.current = setTimeout(() => setStage("result"), 2200);
  };

  return <section id="workspace" className="workspace scroll-mt-8">
    <div className="workspace-heading"><span><AudioLines size={18} /> AUDIO WORKSPACE</span><span className="demo-label">FRONTEND PREVIEW</span></div>
    <div className="audio-tool">
      <div className="tool-topline"><h2>{stage === "result" ? "Location estimate" : "Every sound has a starting point."}</h2><span className="local-label"><ShieldCheck size={14} /> Local & private</span></div>
      {stage === "result" ? <div className="result-layout">
        <LocatorMap />
        <div className="result-details"><span className="demo-label">SIMULATED RESULT</span><h3>{ICICS.name}</h3><p className="coordinates"><MapPin size={14} /> 49.2613° N, 123.2489° W</p><p>{ICICS.address}</p><div className="result-divider" /><p>This is a sample location, not a location inferred from your recording.</p><dl><div><dt>Doppler analysis</dt><dd>Not connected</dd></div><div><dt>Aircraft correlation</dt><dd>Not connected</dd></div><div><dt>Location confidence</dt><dd>Unavailable</dd></div></dl><Button variant="outline" onClick={() => setStage("ready")}><RotateCcw /> New recording</Button></div>
      </div> : stage === "running" ? <div className="analysis-state" role="status"><Loader2 className="animate-spin" size={30} /><h3>Preparing sample location…</h3><p>Demonstration only · no real location analysis</p><div className="analysis-progress"><span /></div></div> : <>
        <div className="input-options">
          <div className={`upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !recording) loadFile(file); }}>
            <input ref={input} type="file" accept="audio/*,.m4a,.flac" className="sr-only" aria-label="Upload audio recording" disabled={recording} onChange={event => { const file = event.target.files?.[0]; if (file) loadFile(file); event.target.value = ""; }} />
            {audio ? <><FileAudio size={26} /><span className="file-name">{audio.name}</span><audio controls src={audio.url} aria-label="Audio preview" /><Button variant="ghost" size="icon" className="remove-audio" aria-label="Remove audio" onClick={() => setAudio(null)} disabled={recording}><X /></Button></> : <><div className="upload-icon"><Upload size={21} /></div><Button variant="ghost" onClick={() => input.current?.click()} disabled={recording} className="upload-command">Choose an audio file <ArrowRight size={14} /></Button><p>or drop your voice memo here</p><span className="file-types">MP3, WAV, M4A, OGG, FLAC</span></>}
          </div>
          <span className="or-label">or</span>
          <div className={`record-zone ${recording ? "is-recording" : ""}`}><div className="record-icon"><Mic size={23} /></div><h3>{recording ? `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}` : "Capture the moment"}</h3><p>{recording ? "Recording your surroundings" : "Start with a live audio recording"}</p><Button variant="outline" className="record-button" onClick={recording ? () => recorder.current?.stop() : startRecording}>{recording ? <Square size={13} /> : <Mic size={13} />}{recording ? "Stop recording" : "Record audio"}</Button></div>
        </div>
        {error && <p role="alert" className="text-destructive mt-4 text-sm">{error}</p>}
        <div className="tool-bottom"><p><Check size={14} /> Your audio stays on this device.</p><Button onClick={analyze} disabled={!audio || recording}>Preview location <ArrowRight /></Button></div>
      </>}
    </div>
    <p className="preview-disclaimer">Experimental concept. Accurate geolocation requires reference signals and flight data; audio alone cannot reliably pinpoint a caller.</p>
  </section>;
}