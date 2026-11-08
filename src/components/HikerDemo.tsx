import { useEffect, useRef, useState } from "react";
import { ArrowRight, BatteryLow, MapPin, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import recording from "@/assets/chief-voice-message.mp3.asset.json";

const clock = (seconds: number) => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

export default function HikerDemo({ fullscreen = false, onEnded, onTryDemo }: { fullscreen?: boolean; onEnded?: () => void; onTryDemo?: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [analysisRequested, setAnalysisRequested] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    // Buffer this short recording completely before playing. Range-streaming it
    // alongside the Earth/map preload can otherwise interrupt the voice message.
    const load = async () => {
      try {
        const response = await fetch(recording.url, { signal: controller.signal });
        if (!response.ok) throw new Error("Recording unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if (!blob.type.startsWith("audio/")) throw new Error("Invalid recording");
        objectUrl = URL.createObjectURL(blob);
        setPlaybackUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) setAudioError("The recording is unavailable. Please reload and try again.");
      }
    };
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);
  useEffect(() => {
    const player = audio.current;
    if (!fullscreen || !playbackUrl || !player) return;
    let active = true;
    void player.play().catch(() => {
      if (active) setAudioError("Autoplay was blocked. Press play to listen.");
    });
    return () => { active = false; player.pause(); };
  }, [fullscreen, playbackUrl]);

  const togglePlayback = async () => {
    const player = audio.current;
    if (!player) return;
    if (!player.paused) { player.pause(); return; }
    if (player.ended) player.currentTime = 0;
    try { await player.play(); setAudioError(""); }
    catch { setAudioError("The recording could not play. Please try again."); }
  };

  return <section id={fullscreen ? "demo-audio" : "hiker-demo"} className={`hiker-demo scroll-mt-8 ${fullscreen ? "fullscreen-audio" : ""}`} aria-label="Fictional missing-hiker audio">
    {!fullscreen && <div className="hiker-demo-heading">
      <div><span className="demo-label">FICTIONAL SIMULATION</span><h2 id="hiker-demo-title">Missing hiker · Stawamus Chief</h2></div>
      <span className="hiker-setting"><MapPin size={14} /> Offsite scenario · Squamish, BC</span>
    </div>}
    {!fullscreen && <p className="hiker-story">A fictional hiker at Stawamus Chief leaves a final voice message before their phone battery runs out. The setting is supplied for the story, not detected from the audio.</p>}
    <div className="hiker-player">
      <div className="hiker-player-heading"><h3><Volume2 size={18} /> Last Known Voice Message</h3><span className="hiker-battery"><BatteryLow size={18} /> 2% Battery</span></div>
      <audio ref={audio} src={playbackUrl} preload="auto" aria-label="Fictional hiker voice recording"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); onEnded?.(); }}
        onError={() => setAudioError("The recording is unavailable. Please reload and try again.")} />
      <div className="hiker-playback">
        <Button variant="outline" size="icon" disabled={!playbackUrl} aria-label={playing ? "Pause voice message" : "Play voice message"} title={playing ? "Pause" : "Play"} onClick={togglePlayback}>{playing ? <Pause size={18} /> : <Play size={18} />}</Button>
        <Slider aria-label="Voice message progress" min={0} max={duration || 1} step={0.1} value={[Math.min(position, duration || 1)]} disabled={!duration} onValueChange={([value]) => { if (audio.current && value !== undefined) { audio.current.currentTime = value; setPosition(value); } }} />
        <span className="hiker-time" aria-label={`Elapsed ${clock(position)}, duration ${clock(duration)}`}>{clock(position)} <span>/</span> {duration ? clock(duration) : "—:—"}</span>
      </div>
      {audioError && <p className="text-destructive text-sm" role="alert">{audioError}</p>}
      <div className="hiker-analysis"><p>Fictional scenario, supplied demo audio. Not an active emergency.</p>{!fullscreen && <><Button variant="outline" onClick={onTryDemo}>Try Demo <ArrowRight size={16} /></Button><Button onClick={() => setAnalysisRequested(true)}>Analyze Recording <ArrowRight size={16} /></Button></>}</div>
      {analysisRequested && <div className="hiker-analysis-status" role="status"><strong>Analysis unavailable</strong><p>No recording-analysis API is connected. This recording has not been analyzed; no detections or location coordinates are available.</p></div>}
    </div>
  </section>;
}