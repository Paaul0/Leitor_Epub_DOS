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
const leitorEl = document.getElementById('leitor');

// ==========================================================================
// Variáveis de Estado da Pesquisa
// ==========================================================================
let searchResults = [];
let currentSearchIndex = 0;

// ==========================================================================
// Funções Internas do Módulo
// ==========================================================================

// Realiza a busca no livro inteiro
function doSearch(query) {
    // Usando o método do spine para pesquisar em todas as seções
    return Promise.all(
        livro.spine.spineItems.map(item =>
            item.load(livro.load.bind(livro))
                .then(item.find.bind(item, query))
        )
    ).then(results => [].concat.apply([], results)); // Achata o array de resultados
};

// Exibe um resultado específico na tela
function displaySearchResult() {
    if (!searchResults || searchResults.length === 0) return;

    const cfi = searchResults[currentSearchIndex].cfi;
    rendicao.display(cfi).then(() => {
        // Cria um "flash" visual para destacar a área do resultado
        const flashOverlay = document.createElement('div');
        Object.assign(flashOverlay.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            zIndex: '1000',
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease-out',
            opacity: '1'
        });
        leitorEl.appendChild(flashOverlay);

        setTimeout(() => {
            flashOverlay.style.opacity = '0';
            setTimeout(() => flashOverlay.remove(), 500);
        }, 400);
    });

    // Atualiza o texto "1 de X" e habilita/desabilita os botões
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

    // Fecha a busca se clicar fora
    document.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target) && !btnSearch.contains(e.target) && searchBar.classList.contains('visible')) {
            closeAndClearSearch();
        }
    });

    // Executa a busca ao pressionar Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchResultsInfo.textContent = "Buscando...";
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

    // Navegação entre os resultados
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
}