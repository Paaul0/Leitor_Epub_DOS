/**
 * js/accessibleRenderer.js
 * Módulo para renderizar o livro diretamente no DOM para acessibilidade.
 * ----- VERSÃO COM CORREÇÃO DEFINITIVA E SEGURA PARA GRIFAR O TEXTO -----
 */

import { livro } from './epubService.js';
import { atualizarTitulo, anunciar } from './uiManager.js';

let container;
let currentChapterHref = null;

// ==========================================================================
//      NOVA FUNÇÃO SEGURA PARA GRIFAR O TEXTO (NÃO QUEBRA O HTML)
// ==========================================================================
/**
 * Percorre os nós do DOM e envolve o termo de busca em uma tag <mark> de forma segura.
 * @param {Node} node - O nó do DOM para começar a busca (o container do capítulo).
 * @param {string} term - O termo a ser grifado.
 */
function highlightTermInNode(node, term) {
    if (!term || !node) return;

    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    let textNode;
    const nodesToReplace = [];

    while (textNode = walker.nextNode()) {
        if (regex.test(textNode.nodeValue)) {
            nodesToReplace.push(textNode);
        }
    }

    nodesToReplace.forEach(textNode => {
        const fragment = document.createDocumentFragment();
        const parts = textNode.nodeValue.split(regex);

        parts.forEach(part => {
            if (part) {
                if (part.toLowerCase() === term.toLowerCase()) {
                    const mark = document.createElement('mark');
                    mark.className = 'search-highlight-accessible';
                    // ADICIONADO: Torna o <mark> focável via script
                    mark.setAttribute('tabindex', '-1');
                    mark.textContent = part;
                    fragment.appendChild(mark);
                } else {
                    fragment.appendChild(document.createTextNode(part));
                }
            }
        });
        textNode.parentNode.replaceChild(fragment, textNode);
    });
}


// ==========================================================================
//      FUNÇÕES ANTIGAS DO MÓDULO (COM PEQUENAS ALTERAÇÕES)
// ==========================================================================

function getNavigableElements(chapterContainer) {
    const selector = 'h1, h2, h3, h4, h5, h6, p, li, a[href], img';
    const elements = Array.from(chapterContainer.querySelectorAll(selector));
    return elements.filter(el => el.offsetParent !== null);
}

function handleRovingFocus(event) {
    // Verifica se o foco está dentro do container ou em um de seus filhos
    if (!container.contains(document.activeElement)) {
        return;
    }

    // Lógica para Setas Cima/Baixo (Navegação Interna) - SEM ALTERAÇÃO AQUI
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const elements = getNavigableElements(container);
        if (elements.length === 0) return;
        const currentElement = document.activeElement;
        let currentIndex = elements.indexOf(currentElement);
        if (currentIndex === -1) currentIndex = 0;
        let nextIndex;
        if (event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % elements.length;
        } else { // ArrowUp
            nextIndex = (currentIndex - 1 + elements.length) % elements.length;
        }
        const nextElement = elements[nextIndex];
        if (currentElement) currentElement.setAttribute('tabindex', '-1');
        nextElement.setAttribute('tabindex', '0');
        nextElement.focus();
        return;
    }
}

function setupRovingTabindex() {
    container.removeEventListener('keydown', handleRovingFocus);
    container.addEventListener('keydown', handleRovingFocus);
    const elements = getNavigableElements(container);
    if (elements.length > 0) {
        container.setAttribute('role', 'listbox');
        container.setAttribute('tabindex', '0');
        elements.forEach((el, index) => {
            el.setAttribute('role', 'option');
            el.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
    }
}

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
    container.setAttribute('aria-describedby', 'leitor-acessivel-desc');

    container.setAttribute('aria-label', 'Conteúdo do Livro');
}

export async function displayChapter(href, termToHighlight = null) {
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

            // ==========================================================================
            //      ORDEM CORRIGIDA
            // ==========================================================================
            await fixImagePaths(container);

            // 1. PRIMEIRO, configuramos os papéis de acessibilidade e a navegação.
            // Agora todos os parágrafos e títulos têm o atributo role="option".
            setupRovingTabindex();

            // 2. SEGUNDO, aplicamos o grifado e o foco.
            if (termToHighlight) {
                highlightTermInNode(container, termToHighlight);
                const firstHighlight = container.querySelector('.search-highlight-accessible');
                if (firstHighlight) {
                    // Agora o .closest() encontrará o role="option" porque o passo 1 já rodou.
                    const focusTarget = firstHighlight.closest('[role="option"]');

                    if (focusTarget) {
                        focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        focusTarget.focus();
                    } else {
                        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstHighlight.focus();
                    }
                }
            }
            // ==========================================================================


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
            let chapterLabel = livro.packaging.metadata.title;
            if (chapterInfo && chapterInfo.label) {
                chapterLabel = chapterInfo.label.trim();
            }

            atualizarTitulo(chapterLabel);
            anunciar(chapterLabel);
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