async function initHome() {
  const mount = document.querySelector("[data-page-list]");
  const quickLinksMount = document.querySelector("[data-quick-links]");

  if (!mount && !quickLinksMount) {
    return;
  }

  try {
    const response = await fetch("./pages.json", { cache: "no-store" });
    const pages = await response.json();

    if (quickLinksMount) {
      quickLinksMount.innerHTML = "";
      pages.forEach(function (page, index) {
        const link = document.createElement("a");
        link.className = "action-link" + (index % 3 === 1 ? " secondary" : index % 3 === 2 ? " ghost" : "");
        link.href = "./" + page.slug + "/";
        link.textContent = "Open " + page.title;
        quickLinksMount.appendChild(link);
      });
    }

    if (!mount) {
      return;
    }

    mount.innerHTML = "";

    pages.forEach(function (page) {
      const article = document.createElement("article");
      article.className = "page-card";
      article.innerHTML =
        '<p class="eyebrow">Replica route</p>' +
        "<h2>" +
        page.title +
        "</h2>" +
        '<p class="meta-line">' +
        page.summary +
        "</p>" +
        '<div class="action-row">' +
        '<a class="action-link" href="./' +
        page.slug +
        '/">Open replica</a>' +
        '<a class="action-link secondary" href="' +
        page.docsUrl +
        '">Docs</a>' +
        '<a class="action-link ghost" href="#reference-footer">See reference</a>' +
        "</div>" +
        '<p class="meta-line">Built with relative paths for GitHub Pages-style subpath hosting.</p>';
      mount.appendChild(article);
    });
  } catch (error) {
    if (quickLinksMount) {
      quickLinksMount.innerHTML =
        '<div class="empty-state">The page manifest could not be loaded. Serve this folder over HTTP to use the generated quick links.</div>';
    }
    if (mount) {
      mount.innerHTML =
        '<div class="empty-state">The page manifest could not be loaded. Serve this folder over HTTP to use the generated navigation.</div>';
    }
  }
}

async function initParity() {
  const mount = document.querySelector("[data-parity-list]");

  if (!mount) {
    return;
  }

  const parityUrl = document.body.dataset.parityUrl;
  const countTarget = document.querySelector("[data-module-count]");

  try {
    const response = await fetch(parityUrl, { cache: "no-store" });
    const modules = await response.json();

    if (countTarget) {
      countTarget.textContent = modules.length + " modules tracked";
      countTarget.className = "meta-pill";
    }

    mount.innerHTML = "";

    modules.forEach(function (module) {
      const article = document.createElement("article");
      article.className = "module-card";

      const sourceFiles = module.sourceFiles
        .map(function (sourceFile) {
          return '<span class="chip">' + sourceFile + "</span>";
        })
        .join("");

      const notes = module.notes
        .map(function (note) {
          return "<li>" + note + "</li>";
        })
        .join("");

      const evidence = module.evidence
        .map(function (item) {
          return "<li>" + item + "</li>";
        })
        .join("");

      article.innerHTML =
        "<h3>" +
        module.moduleId +
        "</h3>" +
        '<p class="meta-line"><strong>Original behavior:</strong> ' +
        module.originalBehavior +
        "</p>" +
        '<p class="meta-line"><strong>Local status:</strong> ' +
        module.localStatus +
        "</p>" +
        '<div class="chip-list">' +
        sourceFiles +
        "</div>" +
        '<ul class="plain-list compact">' +
        notes +
        "</ul>" +
        '<ul class="plain-list compact">' +
        evidence +
        "</ul>";

      mount.appendChild(article);
    });
  } catch (error) {
    if (countTarget) {
      countTarget.textContent = "parity data unavailable";
      countTarget.className = "meta-pill";
    }

    mount.innerHTML =
      '<div class="empty-state">The parity contract could not be loaded. Serve this folder over HTTP to render the checklist.</div>';
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initHome();
  initParity();
});
