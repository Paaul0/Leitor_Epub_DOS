/**
 * search.js
 * Módulo para gerenciar a funcionalidade de pesquisa no livro.
 * Versão final com todas as correções de robustez e acessibilidade.
 */

import { livro, rendicao } from './epubService.js';
import { displayChapter } from './accessibleRenderer.js';

// Função auxiliar para normalizar o texto (remover acentos e converter para minúsculas)
function normalizeText(text = '') {
    return text.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

// Seleção de Elementos (DOM)
const btnSearch = document.getElementById('btn-search');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchResultsInfo = document.getElementById('search-results-info');
const searchPrevBtn = document.getElementById('search-prev-btn');
const searchNextBtn = document.getElementById('search-next-btn');

const menuModal = document.getElementById('menu-modal');
const panelNotas = document.getElementById('panel-notas');
const tabNotasBtn = document.querySelector('.menu-tab-btn[data-target="panel-notas"]');

function showResultsInModal(results, query) {
    if (!panelNotas || !menuModal || !tabNotasBtn) {
        console.error("Elementos do modal não encontrados. A busca não pode exibir os resultados.");
        return;
    }

    panelNotas.innerHTML = '';
    if (results.length === 0) {
        panelNotas.innerHTML = `<p style="text-align: center; color: #888;">Nenhum resultado para "${query}".</p>`;
    } else {
        // ==========================================================================
        //      CORREÇÃO DO FOCO NO TÍTULO + INTERCEPTAÇÃO DO TAB
        // ==========================================================================

        // 1. Criamos o título e o tornamos focável via script
        const title = document.createElement('h3');
        const titleId = 'search-results-title';
        title.id = titleId;
        title.setAttribute('tabindex', '-1'); // Permite receber foco
        title.textContent = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para "${query}"`;
        panelNotas.appendChild(title);

        // 2. Adicionamos o "ouvinte" de teclado especial APENAS no título
        title.addEventListener('keydown', (e) => {
            // Se o usuário apertar Tab (e NÃO Shift+Tab)
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault(); // Impede o navegador de pular para o botão "Sair"

                // Encontra o primeiro resultado da lista e move o foco para ele
                const firstResult = panelNotas.querySelector('.search-result');
                if (firstResult) {
                    firstResult.focus();
                }
            }
        });
        // ==========================================================================

        // O resto da criação dos resultados continua igual
        results.forEach(result => {
            const resultItem = document.createElement('button');
            resultItem.className = 'note-item search-result';
            const regex = new RegExp(`(${result.matchedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const highlightedExcerpt = result.excerpt.replace(regex, (match) => `<mark>${match}</mark>`);
            resultItem.innerHTML = `<blockquote class="note-text" style="pointer-events: none;">...${highlightedExcerpt}...</blockquote>`;
            resultItem.addEventListener('click', () => {
                displayChapter(result.href, result.matchedWord);
                menuModal.classList.remove('visible');
            });
            panelNotas.appendChild(resultItem);
        });
    }

    // Código para exibir o modal (continua o mesmo)
    document.querySelectorAll('.menu-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.menu-panel').forEach(panel => panel.classList.remove('active'));
    tabNotasBtn.classList.add('active');
    panelNotas.classList.add('active');
    menuModal.classList.add('visible');

    // ==========================================================================
    //      3. O foco inicial vai para o TÍTULO, como você queria
    // ==========================================================================
    const titleElement = document.getElementById('search-results-title');
    if (titleElement) {
        setTimeout(() => {
            titleElement.focus();
        }, 200); // 200ms para garantir que o modal está pronto
    }
}

async function doAccessibleSearch(query) {
    searchResultsInfo.textContent = "Buscando...";
    const searchResults = [];
    const normalizedQuery = normalizeText(query);

    for (const section of livro.spine.spineItems) {
        try {
            const contentsAsString = await section.render(livro.load.bind(livro));
            const parser = new DOMParser();
            const content = parser.parseFromString(contentsAsString, "application/xhtml+xml");

            if (content && content.documentElement) {
                const docClone = content.documentElement.cloneNode(true);
                docClone.querySelectorAll('style, script').forEach(el => el.remove());
                const originalText = docClone.textContent;

                if (originalText && originalText.trim().length > 0) {
                    const normalizedText = normalizeText(originalText);
                    let lastIndex = -1;
                    while ((lastIndex = normalizedText.indexOf(normalizedQuery, lastIndex + 1)) !== -1) {
                        const matchedWord = originalText.substring(lastIndex, lastIndex + query.length);
                        const excerpt = originalText.substring(Math.max(0, lastIndex - 40), Math.min(originalText.length, lastIndex + query.length + 40));
                        searchResults.push({ href: section.href, excerpt: excerpt, matchedWord: matchedWord });
                    }
                }
            }
            section.unload();
        } catch (error) {
            console.error(`Falha ao pesquisar na seção ${section.href}, pulando para a próxima. Erro:`, error);
        }
    }

    searchResultsInfo.textContent = "";
    showResultsInModal(searchResults, query);
}


// LÓGICA DE PESQUISA MODO NORMAL (IFRAME)
let searchResultsNormal = [];
let currentSearchIndex = 0;

function doSearchNormal(query) {
    return Promise.all(
        livro.spine.spineItems.map(item =>
            item.load(livro.load.bind(livro)).then(item.find.bind(item, query))
        )
    ).then(results => [].concat.apply([], results));
}

function displaySearchResultNormal() {
    if (!searchResultsNormal || searchResultsNormal.length === 0) return;
    clearSearchHighlights();
    const cfi = searchResultsNormal[currentSearchIndex].cfi;
    rendicao.display(cfi);
    searchResultsInfo.textContent = `${currentSearchIndex + 1} de ${searchResultsNormal.length}`;
    searchPrevBtn.disabled = currentSearchIndex === 0;
    searchNextBtn.disabled = currentSearchIndex >= searchResultsNormal.length - 1;
}

function clearSearchHighlights() {
    try {
        searchResultsNormal.forEach(result => rendicao.annotations.remove(result.cfi, 'highlight'));
    } catch (e) {}
}

function reapplyCurrentSearch() {
    if (searchResultsNormal.length > 0 && !document.body.classList.contains('modo-acessivel')) {
        const cfi = searchResultsNormal[currentSearchIndex].cfi;
        rendicao.annotations.highlight(cfi, {}, () => {}, "search-highlight", { "fill": "red", "fill-opacity": "0.3" });
    }
}

function closeAndClearSearch() {
    if (!searchBar) return;
    searchBar.classList.remove('visible');
    searchInput.value = "";
    searchResultsInfo.textContent = "";
    searchPrevBtn.disabled = true;
    searchNextBtn.disabled = true;
    clearSearchHighlights();
    searchResultsNormal = [];
    currentSearchIndex = 0;
}

export function initSearch() {
    if (!btnSearch || !searchBar || !searchInput) return;

    btnSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBar.classList.toggle('visible');
        if (searchBar.classList.contains('visible')) {
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        } else {
            closeAndClearSearch();
        }
    });

    closeSearchBtn.addEventListener('click', closeAndClearSearch);

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;
            const isAccessibleMode = document.body.classList.contains('modo-acessivel');
            if (isAccessibleMode) {
                doAccessibleSearch(query);
            } else {
                searchResultsInfo.textContent = "Buscando...";
                clearSearchHighlights();
                doSearchNormal(query).then((results) => {
                    searchResultsNormal = results;
                    currentSearchIndex = 0;
                    if (results.length > 0) {
                        displaySearchResultNormal();
                    } else {
                        searchResultsInfo.textContent = "Nenhum resultado";
                        searchPrevBtn.disabled = true;
                        searchNextBtn.disabled = true;
                    }
                });
            }
        }
    });

    searchPrevBtn.addEventListener('click', () => {
        if (currentSearchIndex > 0) {
            currentSearchIndex--;
            displaySearchResultNormal();
        }
    });

    searchNextBtn.addEventListener('click', () => {
        if (currentSearchIndex < searchResultsNormal.length - 1) {
            currentSearchIndex++;
            displaySearchResultNormal();
        }
    });

    rendicao.on("relocated", reapplyCurrentSearch);
}