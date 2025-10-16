/**
 * leitor.js
 * Ponto de entrada principal para a página do leitor de e-pubs.
 */

import * as EpubService from './modules/epubService.js';
import * as UIManager from './modules/uiManager.js';
import * as Search from './modules/search.js';
import * as Annotations from './modules/annotations.js';
import * as TTS from './modules/textToSpeech.js';
import * as AccessibleRenderer from './modules/accessibleRenderer.js';

document.addEventListener('DOMContentLoaded', function () {
    const parametros = new URLSearchParams(window.location.search);
    const caminhoDoLivro = parametros.get('livro');

    if (!caminhoDoLivro) {
        document.getElementById('leitor').innerHTML = "<h3>Nenhum livro selecionado.</h3>";
        return;
    }

    const modal = document.getElementById('acessibilidade-modal');
    const btnModoNormal = document.getElementById('btn-modo-normal');
    const btnModoAcessivel = document.getElementById('btn-modo-acessivel');

// REMOVIDA A VERIFICAÇÃO DO LOCALSTORAGE. AGORA O MODAL SEMPRE APARECE.
    modal.classList.add('visible');

    btnModoNormal.addEventListener('click', () => {
        // localStorage.setItem('modoLeitor', 'normal'); // Linha comentada/removida
        modal.classList.remove('visible');
        iniciarLeitor('normal', caminhoDoLivro);
    });

    btnModoAcessivel.addEventListener('click', () => {
        // localStorage.setItem('modoLeitor', 'acessivel'); // Linha comentada/removida
        modal.classList.remove('visible');
        iniciarLeitor('acessivel', caminhoDoLivro);
    });
});


function iniciarLeitor(modo, caminhoDoLivro) {
    const epub = EpubService.initEpub(caminhoDoLivro, 'leitor');
    if (!epub) return;

    const { livro } = epub;

    livro.ready.then(() => {
        UIManager.atualizarInfoLivro(livro.packaging.metadata);
        UIManager.initUIManager(); // Sempre inicializa a UI base

        if (modo === 'acessivel') {
            iniciarModoAcessivel(livro);
        } else {
            iniciarModoPadrao(epub);
        }

        TTS.initTextToSpeech();
        console.log(`Sistema carregado em modo: ${modo}`);
    });
}

function iniciarModoPadrao(epub) {
    const { livro, rendicao } = epub;

    UIManager.setAccessibilityMode(false);
    UIManager.atualizarTitulo(livro.packaging.metadata.title);
    UIManager.setupContentHooks();

    Search.initSearch();
    Annotations.initAnnotations();

    let isFirstLoad = true;
    rendicao.on("relocated", (location) => {
        UIManager.atualizarProgresso(location);
        if (isFirstLoad) {
            UIManager.setupIframeContentFocus();
            isFirstLoad = false;
        }
    });

    const searchButton = document.getElementById('btn-search');
    if (searchButton) {
        searchButton.focus();
    }
}

function iniciarModoAcessivel(livro) {
    UIManager.setAccessibilityMode(true);
    AccessibleRenderer.init('leitor-acessivel');

    // Define o primeiro capítulo como o inicial
    const firstChapterHref = livro.spine.spineItems[0].href;
    AccessibleRenderer.displayChapter(firstChapterHref);

    // Reconfigura os botões de navegação
    document.getElementById("anterior").onclick = () => AccessibleRenderer.prev();
    document.getElementById("proximo").onclick = () => AccessibleRenderer.next();

    // Foca no container de leitura
    const leitorContainer = document.getElementById('leitor-acessivel');
    if(leitorContainer) {
        leitorContainer.setAttribute('tabindex', '-1');
        leitorContainer.focus();
    }
}