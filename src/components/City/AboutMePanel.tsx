import { useState } from 'react';

/** Ash Ketchum sprite - trainer style for About Me. Fallback to Pikachu if image fails. */
const ASH_SPRITE_URL = 'https://www.pngarts.com/files/3/Ash-Ketchum-PNG-Image-with-Transparent-Background.png';
const FALLBACK_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';

/** LinkedIn-derived profile (https://www.linkedin.com/in/mihirokte/) */
const ABOUT_PROFILE = {
  name: 'Mihir Okte',
  tagline: 'SWE @ Amazon | Maths @ IIT Delhi 2023',
  location: 'New Delhi, India',
  linkedInUrl: 'https://www.linkedin.com/in/mihirokte/',
  about: `End-to-end product developer — from planning, design, development, deployment and QA. I build utilities for stakeholders and ensure partnership with them. Presently SDE @ Amazon (Cross-Border), enabling seamless global ordering through large-scale systems. Previously at YOptima building internal and customer-facing products (React, Node, Flask, Postgres, GCP).`,
  dayToDay: `My workflow is centered around Cursor and Claude — I live in the AI-augmented loop. At Amazon I'm in internal tools like Kiro and Wasabi all day, and I've become an expert at AI orchestration: wiring models, tools, and systems so that code and product move fast.`,
  experience: [
    { role: 'Software Engineer', company: 'Amazon', period: 'Aug 2024 – Present', location: 'Bengaluru' },
    { role: 'Software Engineer', company: 'YOptima', period: 'Jul 2023 – Aug 2024', location: 'Bengaluru' },
    { role: 'Summer Research Intern', company: 'Tokyo Institute of Technology', period: 'Jun – Sep 2021' },
  ],
  education: 'B.Tech, Mathematics and Computing — IIT Delhi (2019–2023)',
  highlights: [
    'Design Club @ IIT Delhi — 800+ students, 38+ events, 2-tier team of 50+',
    'Sportech\'22 Overall Coordinator, Tryst\'22 Coordinator',
    'KVPY Scholar (AIR 233), NTSE Scholar, National Science Examination Certificate of Merit',
  ],
  skills: 'AI orchestration • Cursor • Claude • React • Node • Flask • GCP • Kiro • Wasabi • Postgres • Product design',
  github: 'https://github.com/Mihirokte',
};

interface AboutMePanelProps {
  onClose: () => void;
}

export function AboutMePanel({ onClose }: AboutMePanelProps) {
  const [spriteError, setSpriteError] = useState(false);

  return (
    <div className="about-me-panel">
      <div className="about-me-panel__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="about-me-panel__card">
        <button
          type="button"
          className="about-me-panel__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="about-me-panel__hero">
          <div className="about-me-panel__sprite-wrap">
            <img
              src={spriteError ? FALLBACK_SPRITE_URL : ASH_SPRITE_URL}
              alt="Ash Ketchum"
              className="about-me-panel__sprite"
              onError={() => setSpriteError(true)}
            />
          </div>
          <div className="about-me-panel__identity">
            <h1 className="about-me-panel__name">{ABOUT_PROFILE.name}</h1>
            <p className="about-me-panel__tagline">{ABOUT_PROFILE.tagline}</p>
            <p className="about-me-panel__location">{ABOUT_PROFILE.location}</p>
            <a
              href={ABOUT_PROFILE.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="about-me-panel__link"
            >
              View LinkedIn →
            </a>
          </div>
        </div>

        <div className="about-me-panel__body">
          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">About</h2>
            <p className="about-me-panel__text">{ABOUT_PROFILE.about}</p>
          </section>

          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">Day to day</h2>
            <p className="about-me-panel__text">{ABOUT_PROFILE.dayToDay}</p>
          </section>

          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">Experience</h2>
            <ul className="about-me-panel__list">
              {ABOUT_PROFILE.experience.map((exp, i) => (
                <li key={i} className="about-me-panel__list-item">
                  <strong>{exp.role}</strong> @ {exp.company}
                  <span className="about-me-panel__meta"> · {exp.period}</span>
                  {exp.location && <span className="about-me-panel__meta"> · {exp.location}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">Education</h2>
            <p className="about-me-panel__text">{ABOUT_PROFILE.education}</p>
          </section>

          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">Highlights</h2>
            <ul className="about-me-panel__list about-me-panel__list--bullets">
              {ABOUT_PROFILE.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>

          <section className="about-me-panel__section">
            <h2 className="about-me-panel__section-title">Skills</h2>
            <p className="about-me-panel__skills">{ABOUT_PROFILE.skills}</p>
          </section>

          <div className="about-me-panel__links">
            <a href={ABOUT_PROFILE.linkedInUrl} target="_blank" rel="noopener noreferrer" className="about-me-panel__btn">
              LinkedIn
            </a>
            <a href={ABOUT_PROFILE.github} target="_blank" rel="noopener noreferrer" className="about-me-panel__btn">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
