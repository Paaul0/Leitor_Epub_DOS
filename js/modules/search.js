/**
 * search.js
 * Módulo para gerenciar a funcionalidade de pesquisa no livro.
 * Lógica para MODO ACESSÍVEL foi refeita para ser mais robusta.
 */

import { livro, rendicao } from './epubService.js';
import { displayChapter } from './accessibleRenderer.js';

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

// ==========================================================================
// LÓGICA DE PESQUISA MODO ACESSÍVEL (VERSÃO ROBUSTA)
// ==========================================================================

function showResultsInModal(results, query) {
    if (!panelNotas || !menuModal || !tabNotasBtn) {
        console.error("Elementos do modal não encontrados. A busca não pode exibir os resultados.");
        return;
    }

    // Prepara o conteúdo do painel
    panelNotas.innerHTML = '';
    if (results.length === 0) {
        panelNotas.innerHTML = `<p style="text-align: center; color: #888;">Nenhum resultado para "${query}".</p>`;
    } else {
        const title = document.createElement('h3');
        title.textContent = `${results.length} resultados para "${query}"`;
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        panelNotas.appendChild(title);

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'note-item';
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const highlightedExcerpt = result.excerpt.replace(regex, `<mark>$1</mark>`);
            resultItem.innerHTML = `<blockquote class="note-text">...${highlightedExcerpt}...</blockquote>`;
            resultItem.addEventListener('click', () => {
                displayChapter(result.href, query);
                menuModal.classList.remove('visible');
            });
            panelNotas.appendChild(resultItem);
        });
    }

    // MANIPULAÇÃO DIRETA DO MODAL (MUITO MAIS CONFIÁVEL)
    // 1. Desativa todas as outras abas e painéis
    document.querySelectorAll('.menu-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.menu-panel').forEach(panel => panel.classList.remove('active'));

    // 2. Ativa a aba e o painel de notas
    tabNotasBtn.classList.add('active');
    panelNotas.classList.add('active');

    // 3. Exibe o modal
    menuModal.classList.add('visible');
}

async function doAccessibleSearch(query) {
    searchResultsInfo.textContent = "Buscando...";
    const searchResults = [];
    const regex = new RegExp(query, 'gi');

    for (const section of livro.spine.spineItems) {
        const content = await section.load(livro.load.bind(livro));
        const text = content.textContent;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const excerpt = text.substring(Math.max(0, match.index - 40), Math.min(text.length, match.index + query.length + 40));
            searchResults.push({ href: section.href, excerpt: excerpt });
        }
        section.unload();
    }
    searchResultsInfo.textContent = "";
    showResultsInModal(searchResults, query);
}


// ==========================================================================
// LÓGICA DE PESQUISA MODO NORMAL (IFRAME) - Sem alterações
// ==========================================================================
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

// ==========================================================================
// INICIALIZADOR PRINCIPAL
// ==========================================================================

export function initSearch() {
    if (!btnSearch || !searchBar || !searchInput) return;

    btnSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBar.classList.toggle('visible');
        if (searchBar.classList.contains('visible')) {
            searchInput.focus();
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