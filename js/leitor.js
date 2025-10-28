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
// Importa a função específica para inicialização antecipada do focus trap.
import { setupGlobalFocusManagement } from './modules/uiManager.js';


document.addEventListener('DOMContentLoaded', function () {
    // Ativa o gerenciamento de foco global (focus trap) imediatamente na carga,
    // garantindo que funcione para o modal inicial.
    setupGlobalFocusManagement();

    const btnAnterior = document.getElementById("anterior");
    const btnProximo = document.getElementById("proximo");
    let rendicaoRef; // Referência para o objeto rendicao do Epub.js.

    // Seleciona os elementos principais para controle de visibilidade com aria-hidden.
    const mainPageElements = document.querySelectorAll('header, aside, main, footer, #fixed-context-menu, #btn-show-sidebar');

    function handlePrevClickPadrao() { rendicaoRef?.prev(); }
    function handleNextClickPadrao() { rendicaoRef?.next(); }

    // Funções de navegação "inteligente" para o modo acessível (rolagem interna + mudança de capítulo).
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

    // Listener Global para Setas Esquerda/Direita (Virar Página/Seção).
    document.addEventListener('keydown', (event) => {
        // Ignora teclas pressionadas dentro de campos de formulário.
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
            return;
        }

        const isModoPadrao = document.body.classList.contains('modo-padrao');
        const isModoAcessivel = document.body.classList.contains('modo-acessivel');

        if (isModoPadrao) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault(); // Previne rolagem horizontal indesejada.
                rendicaoRef?.prev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                rendicaoRef?.next();
            }
        }
        else if (isModoAcessivel) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                handlePrevClickAcessivel(); // Chama a lógica de rolagem/capítulo.
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                handleNextClickAcessivel(); // Chama a lógica de rolagem/capítulo.
            }
        }
    });

    const parametros = new URLSearchParams(window.location.search);
    const caminhoDoLivro = parametros.get('livro');

    if (!caminhoDoLivro) {
        document.getElementById('leitor').innerHTML = "<h3>Nenhum livro selecionado.</h3>";
        return;
    }

    const modal = document.getElementById('acessibilidade-modal');
    const btnModoNormal = document.getElementById('btn-modo-normal');
    const btnModoAcessivel = document.getElementById('btn-modo-acessivel');

    // Esconde o conteúdo principal de leitores de tela enquanto o modal inicial está ativo (prática ARIA).
    mainPageElements.forEach(el => el.setAttribute('aria-hidden', 'true'));

    modal.classList.add('visible');
    // Usa setTimeout para garantir renderização do modal antes de mover o foco.
    setTimeout(() => {
        modal.querySelector('.modal-content')?.focus(); // Foca no modal para leitura de título/descrição.
    }, 100);

    btnModoNormal.addEventListener('click', () => {
        modal.classList.remove('visible');
        mainPageElements.forEach(el => el.removeAttribute('aria-hidden')); // Revela conteúdo principal.
        iniciarLeitor('normal', caminhoDoLivro);
    });

    btnModoAcessivel.addEventListener('click', () => {
        modal.classList.remove('visible');
        mainPageElements.forEach(el => el.removeAttribute('aria-hidden')); // Revela conteúdo principal.
        iniciarLeitor('acessivel', caminhoDoLivro);
    });

    function iniciarLeitor(modo, caminhoDoLivro) {
        const epub = EpubService.initEpub(caminhoDoLivro, 'leitor');
        if (!epub) return;
        const { livro, rendicao } = epub;
        rendicaoRef = rendicao;

        livro.ready.then(async () => {
            // Preloader: Força o carregamento de recursos para evitar "engasgos" na primeira exibição (ex: capa).
            const preloaderContainer = document.createElement('div');
            preloaderContainer.style.display = 'none';
            document.body.appendChild(preloaderContainer);
            const preloaderRendition = livro.renderTo(preloaderContainer, { width: 1, height: 1 });
            await preloaderRendition.display();
            await livro.resources.ready;
            preloaderRendition.destroy();
            document.body.removeChild(preloaderContainer);

            UIManager.atualizarInfoLivro(livro.packaging.metadata);
            UIManager.initUIManager();
            TTS.initTextToSpeech();

            if (modo === 'acessivel') {
                iniciarModoAcessivel(livro);
            } else {
                iniciarModoPadrao(epub);
            }
        }).catch(err => { console.error("ERRO CRÍTICO AO CARREGAR O LIVRO:", err); });
    }

    function iniciarModoPadrao(epub) {
        document.body.classList.remove('modo-acessivel');
        document.body.classList.add('modo-padrao');
        document.getElementById('leitor').style.display = 'block';
        document.getElementById('leitor-acessivel').style.display = 'none';

        btnAnterior?.removeEventListener("click", handlePrevClickAcessivel);
        btnProximo?.removeEventListener("click", handleNextClickAcessivel);
        btnAnterior?.addEventListener("click", handlePrevClickPadrao);
        btnProximo?.addEventListener("click", handleNextClickPadrao);

        UIManager.setAccessibilityMode(false);
        UIManager.atualizarTitulo(epub.livro.packaging.metadata.title);
        UIManager.setupContentHooks();
        UIManager.setupRenderedHooks(); // Configura interações após renderização completa do iframe.
        Search.initSearch();
        Annotations.initAnnotations();

        let isFirstLoad = true;
        rendicaoRef.on("relocated", (location) => {
            UIManager.atualizarProgresso(location);
            // Configura o foco inicial dentro do iframe na primeira carga para acessibilidade.
            if (isFirstLoad) {
                UIManager.setupIframeContentFocus();
                isFirstLoad = false;
            }
        });
    }

    function iniciarModoAcessivel(livro) {
        document.body.classList.remove('modo-padrao');
        document.body.classList.add('modo-acessivel');
        document.getElementById('leitor').style.display = 'none';
        document.getElementById('leitor-acessivel').style.display = 'block';

        btnAnterior?.removeEventListener("click", handlePrevClickPadrao);
        btnProximo?.removeEventListener("click", handleNextClickPadrao);
        btnAnterior?.addEventListener("click", handlePrevClickAcessivel);
        btnProximo?.addEventListener("click", handleNextClickAcessivel);

        UIManager.setAccessibilityMode(true);
        AccessibleRenderer.init('leitor-acessivel');
        Search.initSearch();

        const firstChapterHref = livro.spine.spineItems[0].href;
        AccessibleRenderer.displayChapter(firstChapterHref);

        // Move o foco para o conteúdo e anuncia instruções via aria-describedby.
        const accessibleContainer = document.getElementById('leitor-acessivel');
        if (accessibleContainer) {
            // Usa setTimeout para garantir que displayChapter concluiu e o container está pronto.
            setTimeout(() => {
                accessibleContainer.focus();
            }, 150);
        }
    }
});