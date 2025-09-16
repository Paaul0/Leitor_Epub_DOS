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
        UIManager.atualizarInfoLivro(livro.packaging.metadata);
        
        // Inicializa a UI e os hooks de conteúdo
        UIManager.initUIManager();
        UIManager.setupContentHooks();
    });

    rendicao.on("relocated", (location) => {
        UIManager.atualizarProgresso(location);
    });

    rendicao.on("displayed", () => {
        // Sempre que uma nova página é exibida, reaplica os grifos
        Annotations.reaplicarAnotacoes();
    });

    // Inicializa os módulos de funcionalidades
    Search.initSearch();
    Annotations.initAnnotations();
    TTS.initTextToSpeech();

    console.log("Sistema modular completo carregado!");
});