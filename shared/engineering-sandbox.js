(function () {
  function getChapterTitle(section, index) {
    const explicit = section.dataset.storyChapter;
    if (explicit) {
      return explicit;
    }

    const heading = section.querySelector("h1, h2, h3");
    if (heading && heading.textContent) {
      return heading.textContent.trim();
    }

    return `Chapter ${index + 1}`;
  }

  function buildLink(section, index) {
    if (!section.id) {
      section.id = `story-chapter-${index + 1}`;
    }

    const link = document.createElement("a");
    link.className = "story-rail__link";
    link.href = `#${section.id}`;
    link.dataset.storyTarget = section.id;
    link.textContent = getChapterTitle(section, index);
    return link;
  }

  function buildMobileLink(section, index) {
    const link = document.createElement("a");
    link.className = "story-mobile-bar__link";
    link.href = `#${section.id}`;
    link.dataset.storyTarget = section.id;
    link.textContent = getChapterTitle(section, index);
    return link;
  }

  function setActive(links, activeId) {
    links.forEach((link) => {
      const isActive = link.dataset.storyTarget === activeId;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function initStoryShell() {
    const body = document.body;
    if (!body || body.dataset.storyShell !== "engineering-sandbox") {
      return;
    }

    const sections = Array.from(document.querySelectorAll("[data-story-chapter]"));
    if (!sections.length) {
      return;
    }

    const rail = document.createElement("aside");
    rail.className = "story-rail";
    rail.setAttribute("aria-label", "Chapter navigation");
    rail.innerHTML = `
      <div class="story-callout story-rail__panel">
        <div class="story-rail__label">Jump by chapter</div>
        <nav class="story-rail__nav"></nav>
      </div>
    `;
    const railNav = rail.querySelector(".story-rail__nav");

    const mobile = document.createElement("nav");
    mobile.className = "story-mobile-bar";
    mobile.setAttribute("aria-label", "Mobile chapter navigation");
    mobile.innerHTML = `
      <div class="story-mobile-bar__eyebrow">Jump to</div>
      <div class="story-mobile-bar__nav"></div>
    `;
    const mobileNav = mobile.querySelector(".story-mobile-bar__nav");

    const railLinks = sections.map((section, index) => {
      const railLink = buildLink(section, index);
      const mobileLink = buildMobileLink(section, index);
      railNav.appendChild(railLink);
      mobileNav.appendChild(mobileLink);
      return [railLink, mobileLink];
    });

    document.body.appendChild(rail);
    document.body.appendChild(mobile);

    const allLinks = railLinks.flat();
    setActive(allLinks, sections[0].id);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) {
        return;
      }

      setActive(allLinks, visible.target.id);
    }, {
      rootMargin: "-28% 0px -52% 0px",
      threshold: [0.1, 0.35, 0.6],
    });

    sections.forEach((section) => observer.observe(section));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStoryShell, { once: true });
  } else {
    initStoryShell();
  }
})();
