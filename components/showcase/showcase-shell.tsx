import { AsciiSignalStage } from "@/components/ascii/ascii-signal-stage";
import styles from "./showcase-shell.module.css";
import { ProjectNavigator } from "./project-navigator";
import { showcaseProjects } from "./project-data";
import { ProjectSection } from "./project-section";

export function ShowcaseShell() {
  return (
    <div className={styles.shell}>
      <AsciiSignalStage />
      <div className={styles.content}>
        <ProjectNavigator projects={showcaseProjects} />
        <div className={styles.sections}>
          {showcaseProjects.map((project) => (
            <ProjectSection key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
