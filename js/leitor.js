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
    // Ativa o gerenciamento de foco global (focus trap) imediatamente na carga.
    setupGlobalFocusManagement();

    const btnAnterior = document.getElementById("anterior");
    const btnProximo = document.getElementById("proximo");
    let rendicaoRef;

    // Seleciona os elementos principais para controle de visibilidade com aria-hidden.
    const mainPageElements = document.querySelectorAll('header, aside, main, footer, #fixed-context-menu, #btn-show-sidebar');

    // Funções de navegação para o modo padrão (controlam o iframe).
    function handlePrevClickPadrao() { rendicaoRef?.prev(); }
    function handleNextClickPadrao() { rendicaoRef?.next(); }

    // Listener Global para Setas Esquerda/Direita (Virar Página/Seção).
    // Captura o evento no nível do documento para funcionar independentemente do foco atual.
    document.addEventListener('keydown', (event) => {
        // Ignora teclas pressionadas dentro de campos de formulário para permitir digitação.
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
            return;
        }

        const isModoPadrao = document.body.classList.contains('modo-padrao');
        const isModoAcessivel = document.body.classList.contains('modo-acessivel');

        if (isModoPadrao) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault(); // Previne rolagem horizontal indesejada da página.
                rendicaoRef?.prev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                rendicaoRef?.next();
            }
        }
        else if (isModoAcessivel) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                AccessibleRenderer.prev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                AccessibleRenderer.next();
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

    // Esconde o conteúdo principal de leitores de tela enquanto o modal inicial está ativo. Boa prática ARIA.
    mainPageElements.forEach(el => el.setAttribute('aria-hidden', 'true'));

    modal.classList.add('visible');
    // Usa setTimeout para garantir que o modal esteja renderizado antes de mover o foco.
    setTimeout(() => {
        modal.querySelector('.modal-content')?.focus();
    }, 100);

    // Event listeners para os botões do modal inicial.
    btnModoNormal.addEventListener('click', () => {
        modal.classList.remove('visible');
        // Revela o conteúdo principal para leitores de tela após fechar o modal.
        mainPageElements.forEach(el => el.removeAttribute('aria-hidden'));
        iniciarLeitor('normal', caminhoDoLivro);
    });

    btnModoAcessivel.addEventListener('click', () => {
        modal.classList.remove('visible');
        mainPageElements.forEach(el => el.removeAttribute('aria-hidden'));
        iniciarLeitor('acessivel', caminhoDoLivro);
    });

    // Função principal de inicialização do leitor.
    function iniciarLeitor(modo, caminhoDoLivro) {
        const epub = EpubService.initEpub(caminhoDoLivro, 'leitor');
        if (!epub) return;
        const { livro, rendicao } = epub;
        rendicaoRef = rendicao; // Guarda a referência para uso global (ex: navegação por setas).

        // Usa async/await para garantir que o preloader termine antes de continuar.
        livro.ready.then(async () => {
            // Bloco Preloader: Força o carregamento de recursos para evitar "engasgos" na primeira exibição (ex: capa).
            const preloaderContainer = document.createElement('div');
            preloaderContainer.style.display = 'none';
            document.body.appendChild(preloaderContainer);
            const preloaderRendition = livro.renderTo(preloaderContainer, { width: 1, height: 1 });
            await preloaderRendition.display(); // Espera a renderização inicial.
            await livro.resources.ready;      // Espera todos os recursos (imagens, css) serem carregados.
            preloaderRendition.destroy();
            document.body.removeChild(preloaderContainer);

            // Inicializa os módulos de UI e funcionalidades após o preloader.
            UIManager.atualizarInfoLivro(livro.packaging.metadata);
            UIManager.initUIManager(); // Configura listeners da UI geral (exceto focus trap global).
            TTS.initTextToSpeech();

            // Configura o modo de leitura escolhido.
            if (modo === 'acessivel') {
                iniciarModoAcessivel(livro);
            } else {
                iniciarModoPadrao(epub);
            }
        }).catch(err => { console.error("ERRO CRÍTICO AO CARREGAR O LIVRO:", err); });
    }

    // Configurações específicas do Modo Padrão (com iframe).
    function iniciarModoPadrao(epub) {
        document.body.classList.remove('modo-acessivel');
        document.body.classList.add('modo-padrao');
        document.getElementById('leitor').style.display = 'block';
        document.getElementById('leitor-acessivel').style.display = 'none'; // Garante que o leitor acessível esteja oculto.

        // Remove listeners do modo acessível e adiciona os do modo padrão aos botões de navegação.
        btnAnterior?.removeEventListener("click", AccessibleRenderer.prev);
        btnProximo?.removeEventListener("click", AccessibleRenderer.next);
        btnAnterior?.addEventListener("click", handlePrevClickPadrao);
        btnProximo?.addEventListener("click", handleNextClickPadrao);

        UIManager.setAccessibilityMode(false); // Habilita/desabilita controles da UI conforme o modo.
        UIManager.atualizarTitulo(epub.livro.packaging.metadata.title);

        // Hooks para manipular o conteúdo dentro do iframe.
        UIManager.setupContentHooks();   // Aplica estilos básicos e temas.
        UIManager.setupRenderedHooks();  // Configura interações (ex: lightbox) após a renderização completa.

        // Inicializa funcionalidades específicas do modo padrão.
        Search.initSearch();
        Annotations.initAnnotations();

        let isFirstLoad = true;
        // Evento disparado pelo Epub.js a cada mudança de página/localização.
        rendicaoRef.on("relocated", (location) => {
            UIManager.atualizarProgresso(location); // Atualiza a porcentagem de leitura.
            // Configura o foco inicial dentro do iframe na primeira carga.
            if (isFirstLoad) {
                UIManager.setupIframeContentFocus();
                isFirstLoad = false;
            }
        });
    }

    // Configurações específicas do Modo Acessível (renderização direta no DOM).
    function iniciarModoAcessivel(livro) {
        document.body.classList.remove('modo-padrao');
        document.body.classList.add('modo-acessivel');
        document.getElementById('leitor').style.display = 'none'; // Garante que o leitor padrão esteja oculto.
        document.getElementById('leitor-acessivel').style.display = 'block';

        // Remove listeners do modo padrão e adiciona os do modo acessível aos botões de navegação.
        btnAnterior?.removeEventListener("click", handlePrevClickPadrao);
        btnProximo?.removeEventListener("click", handleNextClickPadrao);
        btnAnterior?.addEventListener("click", AccessibleRenderer.prev);
        btnProximo?.addEventListener("click", AccessibleRenderer.next);

        UIManager.setAccessibilityMode(true); // Habilita/desabilita controles da UI conforme o modo.
        AccessibleRenderer.init('leitor-acessivel'); // Inicializa o container para renderização acessível.
        Search.initSearch(); // Ativa a busca (que tem lógica interna para cada modo).

        const firstChapterHref = livro.spine.spineItems[0].href;

        // Obtém o título do primeiro capítulo para o anúncio inicial.
        let firstChapterLabel = livro.packaging.metadata.title;
        const firstChapterInfo = livro.navigation.get(firstChapterHref);
        if (firstChapterInfo && firstChapterInfo.label) {
            firstChapterLabel = firstChapterInfo.label.trim();
        }

        // Exibe o primeiro capítulo.
        AccessibleRenderer.displayChapter(firstChapterHref);

        // Move o foco para o conteúdo e anuncia instruções após a renderização inicial.
        const accessibleContainer = document.getElementById('leitor-acessivel');
        if (accessibleContainer) {
            // Usa setTimeout para garantir que o displayChapter concluiu e o container está pronto.
            setTimeout(() => {
                accessibleContainer.focus();
            }, 150);
        }
    }
});