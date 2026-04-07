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
        <h2 id={`${project.id}-title`} className={styles.sectionTitle}>
          {project.name}
        </h2>
      </div>
    </section>
  );
}
