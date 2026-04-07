import { AsciiWordmark } from "./ascii-wordmark";
import styles from "./showcase-shell.module.css";
import type { ShowcaseProject } from "./project-data";

type ProjectSectionProps = {
  project: ShowcaseProject;
};

export function ProjectSection({ project }: ProjectSectionProps) {
  return (
    <section
      id={project.id}
      className={styles.projectSection}
      data-tone={project.tone}
      aria-labelledby={`${project.id}-title`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIndex}>
          {project.index}
          {" // "}
          {project.id}
        </div>
        <h2 id={`${project.id}-title`} className={styles.screenReaderOnly}>
          {project.name}
        </h2>
        <div className={styles.sectionTitleStack} aria-hidden="true">
          <AsciiWordmark
            text={project.name}
            tone={project.tone}
            className={`${styles.sectionWordmark} ${styles.sectionWordmarkGhost}`}
          />
          <AsciiWordmark
            text={project.name}
            tone={project.tone}
            className={styles.sectionWordmark}
          />
        </div>
      </div>
    </section>
  );
}
