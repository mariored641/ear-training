import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EarIcon,
  DrumKitIcon,
  QuillIcon,
  PentatonicBoxIcon,
  BoomboxIcon,
  MicrophoneIcon,
  ProgressionIcon,
} from '../icons/AppIcons';
import './HomePage.css';

const SATELLITES = [
  { Icon: EarIcon,            label: 'שמיעה מוזיקלית', route: '/category/ear-training' },
  { Icon: DrumKitIcon,        label: 'קצב',           route: '/exercise/4' },
  { Icon: QuillIcon,          label: 'הכתבה',         route: '/category/dictation' },
  { Icon: PentatonicBoxIcon,  label: 'פוזיציות',      route: '/positions' },
  { Icon: BoomboxIcon,        label: 'באקינג טראקס',  route: '/backing-tracks' },
  { Icon: ProgressionIcon,    label: 'לופר',           route: '/looper' },
  { Icon: MicrophoneIcon,     label: 'פידבק',         route: '/feedback' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const constellationRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const drawLines = () => {
      const container = constellationRef.current;
      const svg = svgRef.current;
      if (!container || !svg) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      svg.innerHTML = '';
      const cRect = container.getBoundingClientRect();
      const cx = w / 2;
      const cy = h / 2;
      container.querySelectorAll('.satellite .orb').forEach((orb) => {
        const r = orb.getBoundingClientRect();
        const x = r.left + r.width / 2 - cRect.left;
        const y = r.top + r.height / 2 - cRect.top;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cx);
        line.setAttribute('y1', cy);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        svg.appendChild(line);
      });
    };
    const raf = requestAnimationFrame(drawLines);
    const timer = setTimeout(drawLines, 80);
    window.addEventListener('resize', drawLines);
    let ro;
    if (constellationRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(drawLines);
      ro.observe(constellationRef.current);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', drawLines);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.classList.add('home-page-active');
    return () => {
      document.body.classList.remove('home-page-active');
    };
  }, []);

  const n = SATELLITES.length;

  return (
    <div className="home-page-constellation" dir="rtl">
      <div className="aurora">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      <div className="stars"></div>

      <div className="stage">
        <div className="constellation" ref={constellationRef}>
          <svg className="lines" ref={svgRef}></svg>
          <div className="center-hub">
            <div className="center-logo">
              <img src="/logo.png" alt="אלתור בהישג יד" />
            </div>
          </div>
          {SATELLITES.map((sat, i) => {
            const angle = ((i * 360) / n).toFixed(2);
            const slot = (i % 7) + 1;
            return (
              <div
                key={sat.label}
                className={`satellite s-${slot}`}
                style={{ '--angle': `${angle}deg` }}
              >
                <div className="label">{sat.label}</div>
                <div className="orb" onClick={() => navigate(sat.route)}>
                  <sat.Icon />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
