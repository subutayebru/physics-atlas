import type { Skill } from '../data/types';
import ContentList from './ContentList';

export default function SkillsPanel({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;
  return (
    <details className="skills-panel">
      <summary className="skills-summary">Skills to practice along the way</summary>
      <p className="skills-hint">
        Not steps to finish — habits to build next to whichever topic you are on.
      </p>
      <ul className="skills-list">
        {skills.map((s) => (
          <li key={s.id} className="skill-item">
            <h3 className="skill-title">{s.title}</h3>
            <p className="skill-desc">{s.description}</p>
            {s.content && s.content.length > 0 && <ContentList items={s.content} />}
          </li>
        ))}
      </ul>
    </details>
  );
}
