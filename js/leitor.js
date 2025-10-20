/**
 * leitor.js
 * Ponto de entrada principal para a página do leitor de e-pubs.
 * --- VERSÃO FINAL COM CORREÇÃO DO FOCUS TRAP INICIAL ---
 */

import * as EpubService from './modules/epubService.js';
import * as UIManager from './modules/uiManager.js';
import * as Search from './modules/search.js';
import * as Annotations from './modules/annotations.js';
import * as TTS from './modules/textToSpeech.js';
import * as AccessibleRenderer from './modules/accessibleRenderer.js';
// Importa a função específica que queremos chamar mais cedo
import { setupGlobalFocusManagement } from './modules/uiManager.js';


document.addEventListener('DOMContentLoaded', function () {
    // ==========================================================================
    //      CORREÇÃO: ATIVA A "ARMADILHA DE FOCO" IMEDIATAMENTE
    // ==========================================================================
    setupGlobalFocusManagement();
    // ==========================================================================

    const btnAnterior = document.getElementById("anterior");
    const btnProximo = document.getElementById("proximo");
    let rendicaoRef;

    function handlePrevClickPadrao() { rendicaoRef?.prev(); }
    function handleNextClickPadrao() { rendicaoRef?.next(); }

    function handlePrevClickAcessivel() {
        const leitorContainer = document.getElementById('leitor-acessivel');
        if (!leitorContainer || leitorContainer.classList.contains('transitioning')) return;
        const isAtTop = leitorContainer.scrollTop === 0;
        leitorContainer.classList.add('transitioning');
        setTimeout(() => {
            if (!isAtTop) {
                const scrollAmount = leitorContainer.clientHeight * 0.9;
                leitorContainer.scrollBy({ top: -scrollAmount, behavior: 'auto' });
            } else {
                AccessibleRenderer.prev();
            }
            leitorContainer.classList.remove('transitioning');
        }, 150);
    }

    function handleNextClickAcessivel() {
        const leitorContainer = document.getElementById('leitor-acessivel');
        if (!leitorContainer || leitorContainer.classList.contains('transitioning')) return;
        const isAtBottom = (leitorContainer.scrollTop + leitorContainer.clientHeight) >= (leitorContainer.scrollHeight - 2);
        leitorContainer.classList.add('transitioning');
        setTimeout(() => {
            if (!isAtBottom) {
                const scrollAmount = leitorContainer.clientHeight * 0.9;
                leitorContainer.scrollBy({ top: scrollAmount, behavior: 'auto' });
            } else {
                AccessibleRenderer.next();
            }
            leitorContainer.classList.remove('transitioning');
        }, 150);
    }

    const parametros = new URLSearchParams(window.location.search);
    const caminhoDoLivro = parametros.get('livro');

    if (!caminhoDoLivro) {
        document.getElementById('leitor').innerHTML = "<h3>Nenhum livro selecionado.</h3>";
        return;
    }

    const modal = document.getElementById('acessibilidade-modal');
    const btnModoNormal = document.getElementById('btn-modo-normal');
    const btnModoAcessivel = document.getElementById('btn-modo-acessivel');

    // Agora o focus trap já está ativo quando o modal se torna visível
    modal.classList.add('visible');

    btnModoNormal.addEventListener('click', () => {
        modal.classList.remove('visible');
        iniciarLeitor('normal', caminhoDoLivro);
    });

    btnModoAcessivel.addEventListener('click', () => {
        modal.classList.remove('visible');
        iniciarLeitor('acessivel', caminhoDoLivro);
    });

    function iniciarLeitor(modo, caminhoDoLivro) {
        console.log(`Iniciando leitor em modo: ${modo}`);
        const epub = EpubService.initEpub(caminhoDoLivro, 'leitor');
        if (!epub) return;

        const { livro, rendicao } = epub;
        rendicaoRef = rendicao;

        livro.ready.then(async () => {
            const preloaderContainer = document.createElement('div');
            preloaderContainer.style.display = 'none';
            document.body.appendChild(preloaderContainer);
            const preloaderRendition = livro.renderTo(preloaderContainer, { width: 1, height: 1 });
            await preloaderRendition.display();
            await livro.resources.ready;
            preloaderRendition.destroy();
            document.body.removeChild(preloaderContainer);

            // O initUIManager agora não ativa mais o focus trap, apenas o resto da UI
            UIManager.atualizarInfoLivro(livro.packaging.metadata);
            UIManager.initUIManager();
            TTS.initTextToSpeech();

            if (modo === 'acessivel') {
                iniciarModoAcessivel(livro);
            } else {
                iniciarModoPadrao(epub);
            }
        }).catch(err => {
            console.error("ERRO CRÍTICO AO CARREGAR O LIVRO:", err);
        });
    }

    function iniciarModoPadrao(epub) {
        document.body.classList.remove('modo-acessivel');
        document.getElementById('leitor').style.display = 'block';
        btnAnterior?.removeEventListener("click", handlePrevClickAcessivel);
        btnProximo?.removeEventListener("click", handleNextClickAcessivel);
        btnAnterior?.addEventListener("click", handlePrevClickPadrao);
        btnProximo?.addEventListener("click", handleNextClickPadrao);

        UIManager.setAccessibilityMode(false);
        UIManager.atualizarTitulo(epub.livro.packaging.metadata.title);

        UIManager.setupContentHooks();
        UIManager.setupRenderedHooks();
        Search.initSearch();
        Annotations.initAnnotations();

        let isFirstLoad = true;
        rendicaoRef.on("relocated", (location) => {
            UIManager.atualizarProgresso(location);
            if (isFirstLoad) {
                UIManager.setupIframeContentFocus();
                isFirstLoad = false;
            }
        });
    }

    function iniciarModoAcessivel(livro) {
        document.body.classList.add('modo-acessivel');
        btnAnterior?.removeEventListener("click", handlePrevClickPadrao);
        btnProximo?.removeEventListener("click", handleNextClickPadrao);
        btnAnterior?.addEventListener("click", handlePrevClickAcessivel);
        btnProximo?.addEventListener("click", handleNextClickAcessivel);

        UIManager.setAccessibilityMode(true);
        AccessibleRenderer.init('leitor-acessivel');
        Search.initSearch();

        const firstChapterHref = livro.spine.spineItems[0].href;
        AccessibleRenderer.displayChapter(firstChapterHref);
    }
});