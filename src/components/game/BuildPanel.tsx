import {
  statIds,
  statLabels,
  statShortLabels,
  type RunBundle,
} from "@/lib/chain/state";
import {
  getDominantEffectiveStat,
  getEffectiveStat,
} from "@/lib/game/stats";
import {
  classText,
  isSkillUnlocked,
  skillText,
  skillsForClass,
} from "@/lib/rpgContent/classes";

function statIconFor(stat: (typeof statIds)[number]): string {
  switch (stat) {
    case "strength":
      return "/assets/game/ui/str-icon.png";
    case "intellect":
      return "/assets/game/ui/intellect-icon.png";
    case "agility":
      return "/assets/game/ui/agi-icon.png";
    case "spirit":
      return "/assets/game/ui/spirit-icon.png";
  }
}

function statClass(stat: (typeof statIds)[number]): string {
  return `stat-${stat}`;
}

export function BuildPanel({ bundle }: { bundle: RunBundle }) {
  const classInfo = classText[bundle.character.classId];
  const dominantStat = getDominantEffectiveStat(bundle);
  const learnedSkills = skillsForClass(bundle.character.classId).filter((skillId) =>
    isSkillUnlocked(bundle.character.unlockedSkillsBits, skillId),
  );

  return (
    <section aria-label="Your build" className="stone-panel build-panel">
      <h2>Build</h2>
      <div className="build-class">
        <b>{classInfo.label}</b>
        <p>{classInfo.description}</p>
      </div>

      <div className="build-section">
        <h3>Skills</h3>
        {learnedSkills.length === 0 ? (
          <p>No skills learned yet.</p>
        ) : (
          <ul className="build-skill-list">
            {learnedSkills.map((skillId) => {
              const skill = skillText[skillId];
              return (
                <li className={`stat-tone ${statClass(skill.stat)}`} key={skillId}>
                  <img
                    alt=""
                    className="stat-icon stat-icon-small"
                    height="28"
                    src={statIconFor(skill.stat)}
                    width="28"
                  />
                  <span>{skill.label}</span>
                  <span className="build-skill-stat">{statShortLabels[skill.stat]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="build-section">
        <h3>Effective stats</h3>
        <ul className="build-stat-list">
          {statIds.map((stat) => {
            const effective = getEffectiveStat(bundle, stat);
            const strain = bundle.character.strain[stat];
            return (
              <li
                className={[
                  "stat-tone",
                  statClass(stat),
                  stat === dominantStat ? "build-stat-primary" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={stat}
              >
                <span>{statLabels[stat]}</span>
                <b>{effective}</b>
                {strain > 0 ? <span className="build-strain">strain {strain}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
