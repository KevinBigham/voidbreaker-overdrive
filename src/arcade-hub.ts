import type { ArgonGameInstance, ArgonGameModule } from '../games/shared-contract';
import * as game01 from '../games/01-one-more-season/src/index';
import * as game02 from '../games/02-blackout-dispatch/src/index';
import * as game03 from '../games/03-the-last-signal/src/index';
import * as game04 from '../games/04-junkyard-courier/src/index';
import * as game05 from '../games/05-beatline-salvage/src/index';
import * as game06 from '../games/06-roommate-republic/src/index';
import * as game07 from '../games/07-merge-kitchen/src/index';
import * as game08 from '../games/08-orbit-stack/src/index';
import * as game09 from '../games/09-belt-and-bolt/src/index';
import * as game10 from '../games/10-ten-floors-down/src/index';

// 1. Conditionally load Invoker Commands & Popover polyfills per declarative-dialog-popover-control
if (typeof HTMLButtonElement !== 'undefined' && !('commandForElement' in HTMLButtonElement.prototype)) {
  void import('invokers-polyfill');
}
if (typeof HTMLElement !== 'undefined' && !('popover' in HTMLElement.prototype)) {
  void import('@oddbird/popover-polyfill');
}

export const ARCADE_GAMES_REGISTRY: readonly ArgonGameModule[] = [
  game01,
  game02,
  game03,
  game04,
  game05,
  game06,
  game07,
  game08,
  game09,
  game10,
];

// 2. Fallback for browsers without native <dialog closedby="any"> support per light-dismiss-a-dialog
export function setupDialogLightDismissFallback(root: ParentNode = document): void {
  if (typeof HTMLDialogElement === 'undefined' || 'closedBy' in HTMLDialogElement.prototype) {
    return;
  }

  for (const dialog of root.querySelectorAll<HTMLDialogElement>('dialog[closedby="any"]')) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    });
  }
}

export interface ArcadeHubController {
  launchGame(gameId: string, options?: { seed?: number; debug?: boolean }): void;
  showCatalog(): void;
  getActiveGameId(): string | null;
  destroy(): void;
}

export function mountArcadeHub(rootContainer: HTMLElement = document.body): ArcadeHubController {
  let activeGameId: string | null = null;
  let activeInstance: ArgonGameInstance | null = null;
  let debugEnabled = false;

  const navList = rootContainer.querySelector<HTMLUListElement>('#hub-nav-list');
  const catalogSection = rootContainer.querySelector<HTMLElement>('#hub-catalog-section');
  const catalogGrid = rootContainer.querySelector<HTMLUListElement>('#hub-catalog-grid');
  const stageWrapper = rootContainer.querySelector<HTMLElement>('#hub-stage-wrapper');
  const stageMount = rootContainer.querySelector<HTMLElement>('#hub-stage-mount');
  const btnShowCatalog = rootContainer.querySelector<HTMLButtonElement>('#btn-show-catalog');
  const btnToggleDebug = rootContainer.querySelector<HTMLButtonElement>('#btn-toggle-debug');
  const btnApplySeed = rootContainer.querySelector<HTMLButtonElement>('#btn-apply-seed');
  const seedInput = rootContainer.querySelector<HTMLInputElement>('#hub-seed-input');
  const btnOpenStandalone = rootContainer.querySelector<HTMLAnchorElement>('#btn-open-standalone');
  const contractDialogBody = rootContainer.querySelector<HTMLElement>('#contract-dialog-body');
  const contractDialogTitle = rootContainer.querySelector<HTMLElement>('#dialog-contract-title');
  const announcer = rootContainer.querySelector<HTMLElement>('#hub-live-announcer');

  setupDialogLightDismissFallback(rootContainer);

  function announce(message: string): void {
    if (announcer) {
      announcer.textContent = message;
    }
  }

  function updateContractModal(mod: ArgonGameModule): void {
    if (contractDialogTitle) {
      contractDialogTitle.textContent = `#${String(mod.metadata.number).padStart(2, '0')} ${mod.metadata.title} — Design Contract`;
    }
    if (contractDialogBody) {
      contractDialogBody.innerHTML = `
        <p><strong>Subtitle:</strong> ${mod.metadata.subtitle}</p>
        <p><strong>Genre:</strong> ${mod.metadata.genre}</p>
        <p><strong>Primary Reference:</strong> ${mod.metadata.primaryReference} · <strong>Supporting:</strong> ${mod.metadata.supportingReference}</p>
        <p><strong>One-Sentence Core Loop:</strong> ${mod.metadata.oneSentenceLoop}</p>
        <p><strong>Short Goal:</strong> ${mod.metadata.shortGoal}</p>
        <p><strong>Long Goal:</strong> ${mod.metadata.longGoal}</p>
        <p><strong>Controls:</strong> <code>${mod.metadata.controlsSummary}</code></p>
        <p><strong>Standalone Entry:</strong> <a href="./games/${mod.metadata.id}/index.html" target="_blank" rel="noopener">Open ./games/${mod.metadata.id}/index.html in new tab</a></p>
      `;
    }
  }

  function updateNavigationState(): void {
    if (!navList) return;
    for (const btn of navList.querySelectorAll<HTMLButtonElement>('button[data-game-id]')) {
      const id = btn.getAttribute('data-game-id');
      if (id === activeGameId) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    }
    if (btnShowCatalog) {
      btnShowCatalog.setAttribute('aria-pressed', String(activeGameId === null));
    }
  }

  function cleanupActiveGame(): void {
    if (activeInstance) {
      try {
        activeInstance.destroy();
      } catch (err) {
        console.error('Error destroying game instance:', err);
      }
      activeInstance = null;
    }
    if (stageMount) {
      stageMount.innerHTML = '';
    }
  }

  function launchGame(gameId: string, options?: { seed?: number; debug?: boolean }): void {
    const mod = ARCADE_GAMES_REGISTRY.find((g) => g.metadata.id === gameId);
    if (!mod || !stageMount || !stageWrapper || !catalogSection) return;

    cleanupActiveGame();
    activeGameId = mod.metadata.id;
    catalogSection.hidden = true;
    stageWrapper.hidden = false;

    const useDebug = options?.debug ?? debugEnabled;
    activeInstance = mod.mountGame(stageMount, {
      initialSeed: options?.seed,
      debug: useDebug,
    });

    if (btnOpenStandalone) {
      btnOpenStandalone.href = `./games/${mod.metadata.id}/index.html`;
      btnOpenStandalone.hidden = false;
    }

    document.title = `${mod.metadata.title} | Argon 10-Game Studio`;
    updateContractModal(mod);
    updateNavigationState();
    announce(`Launched Game ${mod.metadata.number}: ${mod.metadata.title}`);

    try {
      window.history.replaceState(null, '', `#game=${mod.metadata.id}`);
    } catch {
      // Ignore history errors in sandboxed/test environments
    }
  }

  function showCatalog(): void {
    cleanupActiveGame();
    activeGameId = null;
    if (catalogSection) catalogSection.hidden = false;
    if (stageWrapper) stageWrapper.hidden = true;
    if (btnOpenStandalone) btnOpenStandalone.hidden = true;
    document.title = 'Argon 10-Game Studio — 10 Original Games Built on Open-Source Design Principles';
    updateContractModal(ARCADE_GAMES_REGISTRY[0]);
    updateNavigationState();
    announce('Showing Argon 10-Game Studio Catalog');
    try {
      window.history.replaceState(null, '', '#catalog');
    } catch {
      // Ignore
    }
  }

  // Render Top 10-Game Quick Switcher Pills
  if (navList) {
    navList.innerHTML = '';
    for (const mod of ARCADE_GAMES_REGISTRY) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hub-game-pill';
      btn.setAttribute('data-game-id', mod.metadata.id);
      btn.style.setProperty('--pill-accent', mod.metadata.accentColor);
      btn.innerHTML = `
        <span class="hub-pill-num">${String(mod.metadata.number).padStart(2, '0')}</span>
        <span>${mod.metadata.title}</span>
      `;
      btn.addEventListener('click', () => launchGame(mod.metadata.id));
      li.appendChild(btn);
      navList.appendChild(li);
    }
  }

  // Render 10-Game Catalog Cards
  if (catalogGrid) {
    catalogGrid.innerHTML = '';
    for (const mod of ARCADE_GAMES_REGISTRY) {
      const li = document.createElement('li');
      li.className = 'hub-card';
      li.style.setProperty('--card-accent', mod.metadata.accentColor);
      li.innerHTML = `
        <div>
          <div class="hub-card-header">
            <span class="hub-card-num">ARGON #${String(mod.metadata.number).padStart(2, '0')}</span>
            <span class="hub-card-genre">${mod.metadata.genre}</span>
          </div>
          <h3 class="hub-card-title">${mod.metadata.title}</h3>
          <p class="hub-card-subtitle">${mod.metadata.subtitle}</p>
        </div>
        <p class="hub-card-loop">${mod.metadata.oneSentenceLoop}</p>
        <div class="hub-card-meta">
          <div><strong>References:</strong> ${mod.metadata.primaryReference} · ${mod.metadata.supportingReference}</div>
          <div><strong>Short Goal:</strong> ${mod.metadata.shortGoal}</div>
          <div><strong>Controls:</strong> ${mod.metadata.controlsSummary}</div>
        </div>
        <div class="hub-card-actions">
          <button type="button" class="hub-btn hub-btn-primary" data-launch-card="${mod.metadata.id}">
            ▶ Play ${mod.metadata.title}
          </button>
          <a class="hub-btn hub-link-btn" href="./games/${mod.metadata.id}/index.html" target="_blank" rel="noopener">
            ↗ Standalone Tab
          </a>
        </div>
      `;
      const playBtn = li.querySelector<HTMLButtonElement>(`button[data-launch-card="${mod.metadata.id}"]`);
      playBtn?.addEventListener('click', () => launchGame(mod.metadata.id));
      catalogGrid.appendChild(li);
    }
  }

  btnShowCatalog?.addEventListener('click', () => showCatalog());

  btnToggleDebug?.addEventListener('click', () => {
    debugEnabled = !debugEnabled;
    btnToggleDebug.setAttribute('aria-pressed', String(debugEnabled));
    btnToggleDebug.textContent = debugEnabled ? 'Debug: ON [D]' : 'Debug: OFF [D]';
    activeInstance?.toggleDebug?.(debugEnabled);
  });

  btnApplySeed?.addEventListener('click', () => {
    const raw = Number(seedInput?.value ?? '20261105');
    const cleanSeed = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 20261105;
    if (activeInstance?.restartWithSeed) {
      activeInstance.restartWithSeed(cleanSeed);
      announce(`Restarted active game with seed ${cleanSeed}`);
    } else if (activeGameId) {
      launchGame(activeGameId, { seed: cleanSeed, debug: debugEnabled });
    }
  });

  // Check initial URL hash (#game=01-one-more-season or #catalog)
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const match = hash.match(/^#game=([a-z0-9-]+)$/i);
  if (match && ARCADE_GAMES_REGISTRY.some((g) => g.metadata.id === match[1])) {
    launchGame(match[1]);
  } else {
    showCatalog();
  }

  return {
    launchGame,
    showCatalog,
    getActiveGameId: () => activeGameId,
    destroy: () => cleanupActiveGame(),
  };
}

if (typeof document !== 'undefined' && document.getElementById('hub-catalog-grid')) {
  mountArcadeHub(document.body);
}
