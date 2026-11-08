import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared pill navigation. On the home page the callbacks drive the hero; elsewhere they navigate home first. */
export default function SiteHeader({ onHome, onDemo, onStart }: { onHome?: () => void; onDemo?: () => void; onStart?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setMenuOpen(false);
  const home = () => { close(); window.scrollTo({ top: 0 }); onHome?.(); };
  const start = () => { close(); if (onStart) onStart(); else navigate("/#workspace"); };
  const links = <><Link to="/#technology" onClick={() => { close(); document.getElementById("technology")?.scrollIntoView({ behavior: "smooth" }); }}>Technology</Link><Link to="/#workspace" onClick={() => { close(); if (onStart) onStart(); }}>Workspace</Link></>;
  return <header className="site-header">
    <Link to="/" className="brand" onClick={home} aria-label="Doppler home"><Globe2 size={22} /> Doppler</Link>
    <nav className="desktop-nav">{links}</nav>
    <Button onClick={start} className="nav-cta">Get started <ArrowRight /></Button>
    <Button size="icon" variant="ghost" className="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
    {menuOpen && <nav className="mobile-nav">{links}</nav>}
  </header>;
}
