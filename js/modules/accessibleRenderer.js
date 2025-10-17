/**
 * js/accessibleRenderer.js
 * Módulo para renderizar o livro diretamente no DOM para acessibilidade.
 * ----- VERSÃO FINAL COM NAVEGAÇÃO INTERNA VIA SETAS (ROVING TABINDEX) -----
 */

import { livro } from './epubService.js';
import { atualizarTitulo } from './uiManager.js';

let container;
let currentChapterHref = null;

// ==========================================================================
//      NOVA LÓGICA: Navegação via Setas (Roving Tabindex)
// ==========================================================================

/**
 * Pega todos os elementos do capítulo que devem ser focáveis com as setas.
 * @param {HTMLElement} chapterContainer - O elemento que contém o HTML do capítulo.
 * @returns {HTMLElement[]} - Uma lista de elementos navegáveis.
 */
function getNavigableElements(chapterContainer) {
    const selector = 'h1, h2, h3, h4, h5, h6, p, li, a[href], img';
    const elements = Array.from(chapterContainer.querySelectorAll(selector));
    // Filtra para garantir que apenas elementos visíveis sejam incluídos
    return elements.filter(el => el.offsetParent !== null);
}

/**
 * Lida com os eventos de teclado (seta para cima/baixo) para mover o foco.
 * @param {KeyboardEvent} event
 */
function handleRovingFocus(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
    }

    event.preventDefault(); // Impede a rolagem da página, nós controlamos isso

    const elements = getNavigableElements(container);
    if (elements.length === 0) return;

    const currentElement = document.activeElement;
    let currentIndex = elements.indexOf(currentElement);

    // Se nenhum elemento estiver focado, começa do primeiro
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex;
    if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % elements.length; // Pula para o próximo, volta ao início se chegar no fim
    } else { // ArrowUp
        nextIndex = (currentIndex - 1 + elements.length) % elements.length; // Pula para o anterior, vai para o fim se estiver no início
    }

    const nextElement = elements[nextIndex];

    // A mágica do "Roving Tabindex": apenas o próximo elemento é focável via Tab.
    if(currentElement) currentElement.setAttribute('tabindex', '-1');
    nextElement.setAttribute('tabindex', '0');
    nextElement.focus();
}

/**
 * Configura o container do capítulo para a navegação via setas.
 */
function setupRovingTabindex() {
    // Adiciona o listener de teclado no container
    container.removeEventListener('keydown', handleRovingFocus); // Remove o antigo para evitar duplicatas
    container.addEventListener('keydown', handleRovingFocus);

    const elements = getNavigableElements(container);
    if (elements.length > 0) {
        // Torna o container focável para que o usuário possa "entrar" nele com Tab
        container.setAttribute('tabindex', '0');

        // Prepara todos os elementos para serem focáveis via script, mas não via Tab
        elements.forEach((el, index) => {
            // Apenas o primeiro elemento é colocado na ordem do Tab, o resto fica "escondido"
            el.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
    }
}


// ==========================================================================
//      Funções Originais do Módulo (com pequenas alterações)
// ==========================================================================

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
                    // Adiciona um texto alternativo caso não exista, essencial para acessibilidade
                    if (!img.getAttribute('alt')) {
                        img.setAttribute('alt', 'Imagem do livro');
                    }
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

export async function displayChapter(href) {
    if (!href) return;
    currentChapterHref = href;

    try {
        const section = livro.spine.get(href);
        if (section) {
            const contentsAsString = await section.render(livro.load.bind(livro));
            const parser = new DOMParser();
            const contentsDocument = parser.parseFromString(contentsAsString.trim(), "application/xhtml+xml");

            const parserError = contentsDocument.querySelector("parsererror");
            if (parserError) { throw new Error("O conteúdo do capítulo não é um XHTML válido."); }

            if (!contentsDocument.body || contentsDocument.body.innerHTML.trim() === "") {
                const currentIndex = livro.spine.spineItems.findIndex(item => item.href === href);
                if (currentIndex === 0) {
                    next();
                    return;
                }
            }

            container.innerHTML = contentsDocument.body.innerHTML;
            container.scrollTop = 0;

            await fixImagePaths(container);

            // AGORA CHAMAMOS A FUNÇÃO QUE CONFIGURA A NAVEGAÇÃO POR SETAS
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