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

        // Inicializa os módulos de funcionalidades que dependem da rendição
        Search.initSearch();
        Annotations.initAnnotations();
        TTS.initTextToSpeech();
    });

    rendicao.on("relocated", (location) => {
        UIManager.atualizarProgresso(location);
    });

    // A chamada para reaplicarAnotacoes foi removida daqui,
    // pois agora é gerenciada pelo evento 'relocated' dentro de annotations.js.

    console.log("Sistema modular completo carregado!");
});