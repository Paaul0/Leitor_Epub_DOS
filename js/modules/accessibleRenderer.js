/**
 * accessibleRenderer.js
 * Módulo para renderizar o livro diretamente no DOM para acessibilidade.
 * ----- VERSÃO FINAL COM MÉTODO section.render() VERIFICADO -----
 */

import { livro } from './epubService.js';
import { atualizarTitulo } from './uiManager.js';

let container;
let currentChapterHref = null;

// Inicializa o renderizador acessível
export function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) {
        console.error("Contêiner do leitor acessível não encontrado:", containerId);
        return;
    }
    container.style.display = 'block';
    document.getElementById('leitor').style.display = 'none';
}

// Carrega e exibe um capítulo específico
export async function displayChapter(href) {
    if (!href) return;
    currentChapterHref = href;

    try {
        container.innerHTML = "<h2>Carregando capítulo...</h2>";
        const section = livro.spine.get(href);
        if (section) {
            // ==========================================================================
            //      MUDANÇA CRÍTICA: Usando section.render() que é o método correto
            // ==========================================================================
            const contentsAsString = await section.render(livro.load.bind(livro));
            // ==========================================================================

            const parser = new DOMParser();
            const contentsDocument = parser.parseFromString(contentsAsString.trim(), "application/xhtml+xml");

            const parserError = contentsDocument.querySelector("parsererror");
            if (parserError) {
                console.error("Erro do Parser:", parserError.textContent);
                throw new Error("O conteúdo do capítulo não é um XHTML válido.");
            }

            if (!contentsDocument.body || contentsDocument.body.innerHTML.trim() === "") {
                const currentIndex = livro.spine.spineItems.findIndex(item => item.href === href);
                if (currentIndex === 0) {
                    console.warn("Primeiro item (capa) não tem conteúdo de texto visível, pulando para o próximo...");
                    next();
                    return;
                }
            }

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

            container.innerHTML = contentsDocument.body.innerHTML;
            container.scrollTop = 0;

            const chapterInfo = livro.navigation.get(href);
            if (chapterInfo && chapterInfo.label) {
                atualizarTitulo(chapterInfo.label.trim());
            } else {
                atualizarTitulo(livro.packaging.metadata.title);
            }
        }
    } catch (error) {
        console.error("Erro detalhado ao carregar capítulo no modo acessível:", error);
        container.innerHTML = `<h2>Ocorreu um erro ao carregar este capítulo.</h2><p>Por favor, verifique o console (F12) para detalhes técnicos.</p>`;
    }
}

// Navega para o próximo capítulo
export function next() {
    const currentIndex = livro.spine.spineItems.findIndex(item => item.href === currentChapterHref);
    if (currentIndex > -1 && currentIndex < livro.spine.spineItems.length - 1) {
        const nextChapter = livro.spine.spineItems[currentIndex + 1];
        displayChapter(nextChapter.href);
    }
}

// Navega para o capítulo anterior
export function prev() {
    const currentIndex = livro.spine.spineItems.findIndex(item => item.href === currentChapterHref);
    if (currentIndex > 0) {
        const prevChapter = livro.spine.spineItems[currentIndex - 1];
        displayChapter(prevChapter.href);
    }
}

// Retorna o href do capítulo atual
export function getCurrentChapterHref() {
    return currentChapterHref;
}