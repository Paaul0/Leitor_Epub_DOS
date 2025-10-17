/**
 * leitor.js
 * Ponto de entrada principal para a página do leitor de e-pubs.
 * --- VERSÃO FINAL COM NAVEGAÇÃO INTELIGENTE (SCROLL/MUDANÇA DE CAPÍTULO) ---
 */

import * as EpubService from './modules/epubService.js';
import * as UIManager from './modules/uiManager.js';
import * as Search from './modules/search.js';
import * as Annotations from './modules/annotations.js';
import * as TTS from './modules/textToSpeech.js';
import * as AccessibleRenderer from './modules/accessibleRenderer.js'; // Import necessário

document.addEventListener('DOMContentLoaded', function () {
    const btnAnterior = document.getElementById("anterior");
    const btnProximo = document.getElementById("proximo");
    let rendicaoRef; // Referência para o objeto rendicao

    function handlePrevClickPadrao() { rendicaoRef?.prev(); }
    function handleNextClickPadrao() { rendicaoRef?.next(); }

    // --- FUNÇÕES DE NAVEGAÇÃO INTELIGENTE ---
    function handlePrevClickAcessivel() {
        const leitorContainer = document.getElementById('leitor-acessivel');
        // Impede cliques múltiplos durante a transição
        if (!leitorContainer || leitorContainer.classList.contains('transitioning')) return;

        // Verifica se estamos no topo do capítulo
        const isAtTop = leitorContainer.scrollTop === 0;

        leitorContainer.classList.add('transitioning'); // Começa o fade-out

        setTimeout(() => {
            if (!isAtTop) {
                // Se NÃO estiver no topo, rola para cima
                const scrollAmount = leitorContainer.clientHeight * 0.9;
                leitorContainer.scrollBy({ top: -scrollAmount, behavior: 'auto' }); // Pulo instantâneo
            } else {
                // Se estiver no topo, vai para o capítulo ANTERIOR
                console.log("Início do capítulo, indo para o anterior...");
                AccessibleRenderer.prev();
            }
            leitorContainer.classList.remove('transitioning'); // Começa o fade-in
        }, 150); // Espera a animação de fade-out terminar
    }

    function handleNextClickAcessivel() {
        const leitorContainer = document.getElementById('leitor-acessivel');
        if (!leitorContainer || leitorContainer.classList.contains('transitioning')) return;

        // Verifica se estamos no final do capítulo
        const isAtBottom = (leitorContainer.scrollTop + leitorContainer.clientHeight) >= (leitorContainer.scrollHeight - 2);

        leitorContainer.classList.add('transitioning'); // Começa o fade-out

        setTimeout(() => {
            if (!isAtBottom) {
                // Se NÃO estiver no final, rola para baixo
                const scrollAmount = leitorContainer.clientHeight * 0.9;
                leitorContainer.scrollBy({ top: scrollAmount, behavior: 'auto' }); // Pulo instantâneo
            } else {
                // Se estiver no final (ou a página for curta), vai para o PRÓXIMO capítulo
                console.log("Fim do capítulo, indo para o próximo...");
                AccessibleRenderer.next();
            }
            leitorContainer.classList.remove('transitioning'); // Começa o fade-in
        }, 150); // Espera a animação de fade-out terminar
    }
    // --- FIM DAS FUNÇÕES DE NAVEGAÇÃO ---

    const parametros = new URLSearchParams(window.location.search);
    const caminhoDoLivro = parametros.get('livro');

    if (!caminhoDoLivro) {
        document.getElementById('leitor').innerHTML = "<h3>Nenhum livro selecionado.</h3>";
        return;
    }

    const modal = document.getElementById('acessibilidade-modal');
    const btnModoNormal = document.getElementById('btn-modo-normal');
    const btnModoAcessivel = document.getElementById('btn-modo-acessivel');

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
            console.log("Livro pronto. Pré-carregando recursos...");
            const preloaderContainer = document.createElement('div');
            preloaderContainer.style.display = 'none';
            document.body.appendChild(preloaderContainer);
            const preloaderRendition = livro.renderTo(preloaderContainer, { width: 1, height: 1 });
            await preloaderRendition.display();
            await livro.resources.ready;
            // preloaderRendition.destroy(); // Manter comentado para evitar erros
            document.body.removeChild(preloaderContainer);
            console.log("Pré-carregamento concluído.");

            UIManager.atualizarInfoLivro(livro.packaging.metadata);
            UIManager.initUIManager();

            if (modo === 'acessivel') {
                iniciarModoAcessivel(livro);
            } else {
                iniciarModoPadrao(epub);
            }
            TTS.initTextToSpeech();
        }).catch(err => {
            console.error("ERRO CRÍTICO AO CARREGAR O LIVRO:", err);
        });
    }

    function iniciarModoPadrao(epub) {
        document.body.classList.remove('modo-acessivel');
        document.getElementById('leitor').style.display = 'block';
        console.log("Configurando modo padrão...");

        btnAnterior?.removeEventListener("click", handlePrevClickAcessivel);
        btnProximo?.removeEventListener("click", handleNextClickAcessivel);
        btnAnterior?.addEventListener("click", handlePrevClickPadrao);
        btnProximo?.addEventListener("click", handleNextClickPadrao);

        UIManager.setAccessibilityMode(false);
        UIManager.atualizarTitulo(epub.livro.packaging.metadata.title);
        UIManager.setupContentHooks();
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
        console.log("Configurando modo acessível...");

        btnAnterior?.removeEventListener("click", handlePrevClickPadrao);
        btnProximo?.removeEventListener("click", handleNextClickPadrao);
        btnAnterior?.addEventListener("click", handlePrevClickAcessivel);
        btnProximo?.addEventListener("click", handleNextClickAcessivel);

        UIManager.setAccessibilityMode(true);
        AccessibleRenderer.init('leitor-acessivel');

        const firstChapterHref = livro.spine.spineItems[0].href;
        AccessibleRenderer.displayChapter(firstChapterHref);
    }
});