/**
 * leitor.js
 * Ponto de entrada principal para a página do leitor de e-pubs.
 */

import * as EpubService from './modules/epubService.js';
import * as UIManager from './modules/uiManager.js';
import * as Search from './modules/search.js';
import * as Annotations from './modules/annotations.js';
import * as TTS from './modules/textToSpeech.js';

document.addEventListener('DOMContentLoaded', function () {
    const parametros = new URLSearchParams(window.location.search);
    const caminhoDoLivro = parametros.get('livro');

    const epub = EpubService.initEpub(caminhoDoLivro, 'leitor');
    if (!epub) return;

    const { livro, rendicao } = epub;

    // Eventos principais do livro
    livro.ready.then(() => {
        // Funções que dependem dos metadados do livro
        UIManager.atualizarTitulo(livro.packaging.metadata.title);
        // A LINHA ABAIXO FOI CORRIGIDA DE 'liv-o' PARA 'livro'
        UIManager.atualizarInfoLivro(livro.packaging.metadata);

        // Inicializa os módulos de funcionalidades que dependem da rendição
        UIManager.initUIManager();
        UIManager.setupContentHooks();

        Search.initSearch();
        Annotations.initAnnotations();
        TTS.initTextToSpeech();

        // Define o foco inicial no botão de pesquisar
        const searchButton = document.getElementById('btn-search');
        if (searchButton) {
            searchButton.focus();
        }
    });

    let isFirstLoad = true;

    rendicao.on("relocated", (location) => {
        UIManager.atualizarProgresso(location);

        if (isFirstLoad) {
            UIManager.setupIframeContentFocus();
            isFirstLoad = false;
        }
    });

    console.log("Sistema modular completo carregado!");
});