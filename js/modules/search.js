/**
 * search.js
 * Módulo para gerenciar a funcionalidade de pesquisa no livro.
 */

import { livro, rendicao } from './epubService.js';

// ==========================================================================
// Seleção de Elementos (DOM)
// ========================================================================== 
const btnSearch = document.getElementById('btn-search');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchResultsInfo = document.getElementById('search-results-info');
const searchPrevBtn = document.getElementById('search-prev-btn');
const searchNextBtn = document.getElementById('search-next-btn');

// ==========================================================================
// Variáveis de Estado da Pesquisa
// ========================================================================== 
let searchResults = [];
let currentSearchIndex = 0;

// ==========================================================================
// Funções Internas do Módulo
// ==========================================================================

function doSearch(query) {
    return Promise.all(
        livro.spine.spineItems.map(item =>
            item.load(livro.load.bind(livro))
                .then(item.find.bind(item, query))
        )
    ).then(results => [].concat.apply([], results));
}

function clearSearchHighlights() {
    try {
        searchResults.forEach(result => {
            rendicao.annotations.remove(result.cfi, 'highlight');
        });
    } catch (e) {
        console.warn("Erro ao limpar grifos de busca:", e);
    }
}

// Redesenha o resultado atual sempre que a página muda (relocated).
function reapplyCurrentSearch() {
    if (searchResults.length > 0) {
        const cfi = searchResults[currentSearchIndex].cfi;
        rendicao.annotations.highlight(
            cfi,
            {},
            () => { },
            "search-highlight", { "fill": "red", "fill-opacity": "0.3" }
        );
    }
}

// Exibe um resultado específico na tela
function displaySearchResult() {
    if (!searchResults || searchResults.length === 0) return;

    // Limpa grifos anteriores antes de navegar para o novo
    clearSearchHighlights();

    const cfi = searchResults[currentSearchIndex].cfi;

    // Apenas navega até o resultado. O evento 'relocated' vai chamar
    // a função reapplyCurrentSearch() para desenhar o grifo.
    rendicao.display(cfi);

    // Atualiza texto e botões
    searchResultsInfo.textContent = `${currentSearchIndex + 1} de ${searchResults.length}`;
    searchPrevBtn.disabled = currentSearchIndex === 0;
    searchNextBtn.disabled = currentSearchIndex >= searchResults.length - 1;
}

// Limpa a busca e esconde a barra
function closeAndClearSearch() {
    searchBar.classList.remove('visible');
    searchInput.value = "";
    searchResultsInfo.textContent = "";
    searchPrevBtn.disabled = true;
    searchNextBtn.disabled = true;

    clearSearchHighlights();

    searchResults = [];
    currentSearchIndex = 0;
}

// ==========================================================================
// Função de Inicialização (Exportada)
// ==========================================================================

export function initSearch() {
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

    document.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target) && !btnSearch.contains(e.target) && searchBar.classList.contains('visible')) {
            closeAndClearSearch();
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchResultsInfo.textContent = "Buscando...";
                clearSearchHighlights();

                doSearch(query).then((results) => {
                    searchResults = results;
                    currentSearchIndex = 0;
                    if (results.length > 0) {
                        displaySearchResult();
                    } else {
                        searchResultsInfo.textContent = "Nenhum resultado";
                        searchPrevBtn.disabled = true;
                        searchNextBtn.disabled = true;
                    }
                });
            } else {
                closeAndClearSearch();
            }
        }
    });

    searchPrevBtn.addEventListener('click', () => {
        if (currentSearchIndex > 0) {
            currentSearchIndex--;
            displaySearchResult();
        }
    });

    searchNextBtn.addEventListener('click', () => {
        if (currentSearchIndex < searchResults.length - 1) {
            currentSearchIndex++;
            displaySearchResult();
        }
    });

    // Evento para redesenhar o grifo ao mudar de página
    rendicao.on("relocated", reapplyCurrentSearch);
}