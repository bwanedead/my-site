"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsciiWordmark } from "./ascii-wordmark";
import styles from "./showcase-shell.module.css";
import type { ShowcaseProject } from "./project-data";

type ProjectNavigatorProps = {
  projects: ShowcaseProject[];
};

export function ProjectNavigator({ projects }: ProjectNavigatorProps) {
  const [activeId, setActiveId] = useState(projects[0]?.id ?? "");

  useEffect(() => {
    const sections = projects
      .map((project) => document.getElementById(project.id))
      .filter((section): section is HTMLElement => section instanceof HTMLElement);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-35% 0px -45% 0px",
        threshold: [0.2, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [projects]);

  return (
    <>
      <div className={styles.mobileNavigator}>
        <div className={styles.mobileNavigatorInner}>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`#${project.id}`}
              className={[
                styles.mobileNavItem,
                styles[`navTone${capitalizeTone(project.tone)}`],
                activeId === project.id ? styles.mobileNavItemActive : "",
              ].join(" ")}
            >
              <span>{project.index}</span>
              <span>{project.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <aside className={styles.desktopRail} aria-label="Project navigation">
        <div className={styles.railFrame}>
          <div className={styles.railMeta}>
            <div className={styles.railMetaLine}>signal frame</div>
            <div className={styles.railMetaLine}>paradox rail</div>
          </div>
          <nav className={styles.navList}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`#${project.id}`}
                className={[
                  styles.navItem,
                  styles[`navTone${capitalizeTone(project.tone)}`],
                  activeId === project.id ? styles.navItemActive : "",
                ].join(" ")}
              >
                <span className={styles.navIndex}>{project.index}</span>
                <span className={styles.screenReaderOnly}>{project.name}</span>
                <div className={styles.navGlyphStack} aria-hidden="true">
                  <AsciiWordmark
                    text={project.name}
                    tone={project.tone}
                    className={styles.navWordmark}
                  />
                  <AsciiWordmark
                    text={project.name}
                    tone={project.tone}
                    className={`${styles.navWordmark} ${styles.navGhost}`}
                  />
                  <AsciiWordmark
                    text={project.name}
                    tone={project.tone}
                    className={`${styles.navWordmark} ${styles.navGhostAlt}`}
                  />
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

function capitalizeTone(value: ShowcaseProject["tone"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
