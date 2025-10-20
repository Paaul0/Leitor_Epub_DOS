/**
 * js/accessibleRenderer.js
 * Módulo para renderizar o livro diretamente no DOM para acessibilidade.
 * ----- VERSÃO FINAL COM NAVEGAÇÃO E DESTAQUE DE PESQUISA -----
 */

import { livro } from './epubService.js';
import { atualizarTitulo } from './uiManager.js';

let container;
let currentChapterHref = null;

// --- Lógica de Navegação via Setas (Roving Tabindex) ---
function getNavigableElements(chapterContainer) {
    const selector = 'h1, h2, h3, h4, h5, h6, p, li, a[href], img';
    const elements = Array.from(chapterContainer.querySelectorAll(selector));
    return elements.filter(el => el.offsetParent !== null);
}

function handleRovingFocus(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const elements = getNavigableElements(container);
    if (elements.length === 0) return;
    const currentElement = document.activeElement;
    let currentIndex = elements.indexOf(currentElement);
    if (currentIndex === -1) currentIndex = 0;
    let nextIndex;
    if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % elements.length;
    } else {
        nextIndex = (currentIndex - 1 + elements.length) % elements.length;
    }
    const nextElement = elements[nextIndex];
    if (currentElement) currentElement.setAttribute('tabindex', '-1');
    nextElement.setAttribute('tabindex', '0');
    nextElement.focus();
}

function setupRovingTabindex() {
    container.removeEventListener('keydown', handleRovingFocus);
    container.addEventListener('keydown', handleRovingFocus);
    const elements = getNavigableElements(container);
    if (elements.length > 0) {
        container.setAttribute('tabindex', '0');
        elements.forEach((el, index) => {
            el.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
    }
}

// --- Funções Originais do Módulo ---
async function fixImagePaths(chapterContainer) {
    const images = chapterContainer.querySelectorAll('img');
    for (const img of images) {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('blob:')) continue;
        const fullImagePath = livro.resources.urls.find(url => url.endsWith(src));
        if (fullImagePath) {
            try {
                const blob = await livro.archive.request(fullImagePath, "blob");
                if (blob) {
                    const objectURL = URL.createObjectURL(blob);
                    img.src = objectURL;
                    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Imagem do livro');
                }
            } catch (e) { console.error(`Falha ao carregar o recurso da imagem '${fullImagePath}'.`, e); }
        }
    }
}

export function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) {
        console.error("Contêiner do leitor acessível não encontrado:", containerId);
        return;
    }
    container.style.display = 'block';
    document.getElementById('leitor').style.display = 'none';
}

/**
 * Carrega e exibe um capítulo, com a opção de grifar um termo de pesquisa.
 * @param {string} href - O href do capítulo a ser exibido.
 * @param {string|null} [searchTerm=null] - O termo de pesquisa a ser grifado.
 */
export async function displayChapter(href, searchTerm = null) {
    if (!href) return;
    currentChapterHref = href;
    try {
        const section = livro.spine.get(href);
        if (section) {
            const contentsAsString = await section.render(livro.load.bind(livro));
            const parser = new DOMParser();
            const contentsDocument = parser.parseFromString(contentsAsString.trim(), "application/xhtml+xml");
            if (contentsDocument.querySelector("parsererror")) throw new Error("O conteúdo do capítulo não é um XHTML válido.");
            if (!contentsDocument.body || contentsDocument.body.innerHTML.trim() === "") {
                const currentIndex = livro.spine.spineItems.findIndex(item => item.href === href);
                if (currentIndex === 0) { next(); return; }
            }
            container.innerHTML = contentsDocument.body.innerHTML;
            container.scrollTop = 0;

            // ===== NOVA LÓGICA DE GRIFAR PESQUISA =====
            if (searchTerm) {
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                container.innerHTML = container.innerHTML.replace(regex, `<mark class="search-highlight-accessible">$1</mark>`);
                const firstHighlight = container.querySelector('.search-highlight-accessible');
                if (firstHighlight) {
                    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            // ===========================================

            await fixImagePaths(container);
            setupRovingTabindex();

            const oldStyles = document.querySelectorAll('[data-chapter-style]');
            oldStyles.forEach(s => s.remove());
            const chapterStyleLink = contentsDocument.querySelector('link[rel="stylesheet"]');
            if (chapterStyleLink) {
                const cssHref = chapterStyleLink.getAttribute('href');
                const cssResource = livro.resources.get(cssHref);
                if (cssResource) {
                    const cssText = await cssResource.text();
                    const styleEl = document.createElement('style');
                    styleEl.setAttribute('data-chapter-style', 'true');
                    styleEl.innerHTML = cssText;
                    document.head.appendChild(styleEl);
                }
            }
            const internalStyleTags = contentsDocument.querySelectorAll('style');
            internalStyleTags.forEach(styleTag => {
                const styleEl = document.createElement('style');
                styleEl.setAttribute('data-chapter-style', 'true');
                styleEl.textContent = styleTag.textContent;
                document.head.appendChild(styleEl);
            });

            const chapterInfo = livro.navigation.get(href);
            if (chapterInfo && chapterInfo.label) {
                atualizarTitulo(chapterInfo.label.trim());
            } else {
                atualizarTitulo(livro.packaging.metadata.title);
            }
        }
    } catch (error) {
        console.error("Erro detalhado ao carregar capítulo no modo acessível:", error);
        container.innerHTML = `<h2>Ocorreu um erro ao carregar este capítulo.</h2>`;
    }
}

export function next() {
    const currentIndex = livro.spine.spineItems.findIndex(item => item.href === currentChapterHref);
    if (currentIndex > -1 && currentIndex < livro.spine.spineItems.length - 1) {
        const nextChapter = livro.spine.spineItems[currentIndex + 1];
        displayChapter(nextChapter.href);
    }
}
export function prev() {
    const currentIndex = livro.spine.spineItems.findIndex(item => item.href === currentChapterHref);
    if (currentIndex > 0) {
        const prevChapter = livro.spine.spineItems[currentIndex - 1];
        displayChapter(prevChapter.href);
    }
}
export function getCurrentChapterHref() {
    return currentChapterHref;
}