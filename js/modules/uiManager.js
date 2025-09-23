/**
 * uiManager.js
 * Módulo para controlar todos os elementos e eventos da interface do usuário (DOM).
 * VERSÃO CORRIGIDA: Inclui lógica "inteligente" para o modo noturno.
 */

import { livro, rendicao, irPara } from './epubService.js';
import { savedAnnotations, reaplicarAnotacoes } from './annotations.js';

// ==========================================================================
// Seleção de Elementos (DOM)
// ==========================================================================
const tituloEl = document.querySelector('.titulo p');
const progressoInfo = document.getElementById('progresso-info');
const infoLivEl = document.querySelector('.info_liv');
const sumarioContainer = document.getElementById('sumario-container');
const body = document.body;

// Sidebar
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnShowSidebar = document.getElementById('btn-show-sidebar');

// Menu Modal
const menuModal = document.getElementById('menu-modal');
const btnMenu = document.getElementById('btn-menu');
const closeMenuModalBtn = document.getElementById('close-menu-modal-btn');
const menuChapterTitle = document.getElementById('menu-chapter-title');
const panelSumarioModal = document.getElementById('panel-sumario');
const panelNotas = document.getElementById('panel-notas');
const tabButtons = document.querySelectorAll('.menu-tab-btn');
const tabPanels = document.querySelectorAll('.menu-panel');

// Painel de Exibição (dentro do Modal)
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSelect = document.getElementById('font-select');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const layoutRadios = document.querySelectorAll('input[name="layout"]');

// Lightbox
const imageLightbox = document.getElementById('image-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.querySelector('.close-lightbox');

// ==========================================================================
// Estado e Configurações da UI
// ==========================================================================
let currentTheme = 'claro';
let currentFontSize = 100;

const THEMES = {
    claro: {
        ui: { bg: '#FFFFFF', text: '#000000', border: '#ddd' },
        content: { 'body': { 'background': '#FFFFFF', 'color': '#000000 !important' } }
    },
    sepia: {
        ui: { bg: '#fbf0d9', text: '#5b4636', border: '#e9e0cb' },
        content: { 'body': { 'background': '#fbf0d9', 'color': '#5b4636 !important' } }
    },
    noturno: {
        ui: { bg: '#383B43', text: '#E0E0E0', border: '#4a4e59' },
        content: { 'body': { 'background': '#383B43', 'color': '#E0E0E0 !important' } }
    }
};


// ==========================================================================
// Funções de Renderização e Atualização da UI
// ==========================================================================

export function atualizarTitulo(titulo) {
    tituloEl.textContent = titulo;
    document.title = titulo;
}

export function atualizarProgresso(location) {
    if (livro && location.start && livro.locations && livro.locations.length() > 0) {
        const percentage = Math.floor(livro.locations.percentageFromCfi(location.start.cfi) * 100);
        progressoInfo.textContent = `Progresso: ${percentage}%`;
    }
}

export function atualizarInfoLivro(metadata) {
    const { title, creator, pubdate } = metadata;
    let infoHtml = `<p class="book-title">${title || 'Título desconhecido'}</p>`;
    if (creator) infoHtml += `<p class="book-author">Por: ${creator}</p>`;
    if (pubdate) infoHtml += `<p class="book-publisher">Publicado em: ${new Date(pubdate).getFullYear()}</p>`;
    infoLivEl.innerHTML = infoHtml;
}

function gerarSumario(container, emModal = false) {
    const toc = livro.navigation.toc;
    const sumarioHtml = document.createElement('ul');
    toc.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = item.label.trim();
        a.href = item.href;
        li.appendChild(a);
        sumarioHtml.appendChild(li);
        a.addEventListener("click", (e) => {
            e.preventDefault();
            irPara(item.href);
            if (emModal) {
                menuModal.classList.remove('visible');
            }
        });
    });
    container.innerHTML = '';
    container.appendChild(sumarioHtml);
}

function renderNotesPanel() {
    panelNotas.innerHTML = '';

    // Filtra para pegar apenas as anotações que têm um comentário escrito.
    const notesWithComments = savedAnnotations.filter(ann => ann.type === 'annotation' && ann.note);

    // Renderiza as anotações na tela, como antes.
    if (notesWithComments.length > 0) {
        notesWithComments.forEach(annotation => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <blockquote class="note-text">"${annotation.text}"</blockquote>
                <p class="note-comment">${annotation.note}</p>
            `;
            noteItem.addEventListener('click', () => {
                irPara(annotation.cfi);
                menuModal.classList.remove('visible');
            });
            panelNotas.appendChild(noteItem);
        });
    } else {
        panelNotas.innerHTML = '<p style="text-align: center; color: #888;">Você ainda não fez anotações.</p>';
    }

    // --- INÍCIO DA NOVA FUNCIONALIDADE ---

    // 1. Cria o botão de exportação
    const exportButton = document.createElement('button');
    exportButton.id = 'btn-export-notes';
    exportButton.textContent = 'Exportar para .txt';
    // Reutiliza uma classe de botão existente para manter o estilo
    exportButton.className = 'kindle-button';
    exportButton.style.marginTop = '20px';
    panelNotas.appendChild(exportButton);

    // Desativa o botão se não houver notas para exportar
    if (notesWithComments.length === 0) {
        exportButton.disabled = true;
    }

    // 2. Adiciona a lógica para o clique no botão
    exportButton.addEventListener('click', () => {
        // Pega o título do livro para o nome do arquivo e conteúdo
        const bookTitle = livro.packaging.metadata.title || 'livro';
        const sanitizedTitle = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `notas_${sanitizedTitle}.txt`;

        // 3. Formata o conteúdo do arquivo de texto
        let fileContent = `Anotações do Livro: ${bookTitle}\n\n`;
        fileContent += "========================================\n\n";

        notesWithComments.forEach((ann, index) => {
            fileContent += `ANOTAÇÃO #${index + 1}\n\n`;
            fileContent += `Trecho Grifado:\n"${ann.text}"\n\n`;
            fileContent += `Seu Comentário:\n${ann.note}\n\n`;
            fileContent += "----------------------------------------\n\n";
        });

        // 4. Cria o arquivo e inicia o download
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Adiciona o link ao corpo da página
        a.click(); // Simula o clique para iniciar o download
        document.body.removeChild(a); // Remove o link após o clique
        URL.revokeObjectURL(url); // Libera a memória
    });
}

/**
 * Aplica o tema na interface principal da aplicação (fora do conteúdo do livro).
 * @param {string} themeName - O nome do tema ('claro', 'sepia', 'noturno').
 */
function applyUiTheme(themeName) {
    const theme = THEMES[themeName].ui;

    document.querySelector('.leitor').style.backgroundColor = theme.bg;

    document.querySelector('.titulo').style.backgroundColor = theme.bg;
    document.querySelector('.titulo p').style.color = theme.text;
    document.querySelector('.progresso').style.backgroundColor = theme.bg;
    document.querySelector('.progresso').style.borderTopColor = theme.border;
    progressoInfo.style.color = theme.text;
}

/**
 * @param {object} contents
 */
function applySmartNightMode(contents) {
    const isColorLight = (colorStr) => {
        if (!colorStr || colorStr === 'transparent' || colorStr.startsWith('rgba(0, 0, 0, 0)')) {
            return false;
        }
        try {
            const [r, g, b] = colorStr.match(/\d+/g).map(Number);
            // Fórmula de luminância para determinar o brilho
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            return luminance > 186; // Limiar para considerar uma cor como "clara"
        } catch (e) {
            return false;
        }
    };

    const elementsToCheck = contents.document.body.querySelectorAll('p, span, div, li, a, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote');
    elementsToCheck.forEach(el => {
        const style = contents.window.getComputedStyle(el);
        const bgColor = style.backgroundColor;

        if (isColorLight(bgColor)) {
            el.style.setProperty('color', '#111111', 'important');
        }
    });
}

/**
 * Assume o controle total da navegação por Tab de forma inteligente.
 * Se o modal estiver aberto, prende o foco dentro dele.
 * Se o modal estiver fechado, gerencia o foco na página principal.
 */
function setupGlobalFocusManagement() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') {
            return; // Se não for a tecla Tab, não faz nada.
        }

        const modal = document.getElementById('menu-modal');
        const isModalVisible = modal.classList.contains('visible');

        // Define o "contexto" da nossa busca: o modal ou a página inteira.
        const searchContext = isModalVisible ? modal : document.body;

        // 1. Define o que é um elemento focável.
        const query = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, iframe, [tabindex]:not([tabindex="-1"])';

        // 2. Cria uma lista com todos os elementos focáveis DENTRO DO CONTEXTO ATUAL.
        const focusableElements = Array.from(searchContext.querySelectorAll(query));

        // 3. Filtra a lista para incluir apenas os que estão VISÍVEIS na tela.
        const visibleFocusableElements = focusableElements.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        });

        if (visibleFocusableElements.length === 0) {
            event.preventDefault(); // Impede o Tab de ir para a URL se não houver nada focável.
            return;
        }

        // 4. Identifica a posição do elemento atualmente focado.
        const currentIndex = visibleFocusableElements.indexOf(document.activeElement);
        const isTabbingBackward = event.shiftKey;

        // 5. Calcula qual será o próximo elemento a receber foco, criando um loop.
        let nextIndex = 0;
        if (isTabbingBackward) {
            // Se estivermos no primeiro elemento, vai para o último.
            nextIndex = (currentIndex > 0) ? currentIndex - 1 : visibleFocusableElements.length - 1;
        } else {
            // Se estivermos no último elemento, vai para o primeiro.
            nextIndex = (currentIndex < visibleFocusableElements.length - 1) ? currentIndex + 1 : 0;
        }

        // 6. Impede o navegador de agir e move o foco manualmente.
        event.preventDefault();
        visibleFocusableElements[nextIndex].focus();
    });
}

// No arquivo: uiManager.js

// -- INÍCIO DO NOVO BLOCO DE CÓDIGO --

// Variáveis de controle para o nosso modal
const mainPageElements = document.querySelectorAll('header, aside, main, footer, #fixed-context-menu, #btn-show-sidebar');
let modalKeydownListener = null; // Guarda a função do listener para podermos removê-la depois
let escapeKeyListener = null;    // Guarda a função do listener da tecla Escape

/**
 * Fecha o modal se a tecla Escape for pressionada.
 * @param {KeyboardEvent} event
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        closeMenuModal();
    }
}

/**
 * Abre e gerencia o modal de menu, aplicando todas as regras de acessibilidade.
 */
function openMenuModal() {
    mainPageElements.forEach(el => el.setAttribute('aria-hidden', 'true'));
    btnMenu.setAttribute('aria-expanded', 'true');

    menuModal.classList.add('visible');

    const focusableElementsQuery = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(menuModal.querySelectorAll(focusableElementsQuery));
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    setTimeout(() => {
        firstFocusableElement.focus();
    }, 100);

    modalKeydownListener = (event) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                event.preventDefault();
                lastFocusableElement.focus();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                event.preventDefault();
                firstFocusableElement.focus();
            }
        }
    };

    menuModal.addEventListener('keydown', modalKeydownListener);
    document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Fecha o modal de menu e restaura o estado da página.
 */
function closeMenuModal() {
    menuModal.removeEventListener('keydown', modalKeydownListener);
    document.removeEventListener('keydown', handleEscapeKey);

    mainPageElements.forEach(el => el.removeAttribute('aria-hidden'));
    btnMenu.setAttribute('aria-expanded', 'false');

    menuModal.classList.remove('visible');

    btnMenu.focus();
}

// ==========================================================================
// Inicializador Principal de Eventos da UI
// ==========================================================================

export function initUIManager() {
    // ---- Navegação Principal ----
    document.getElementById("anterior").addEventListener("click", () => rendicao.prev());
    document.getElementById("proximo").addEventListener("click", () => rendicao.next());

    // ---- Sidebar ----
    btnToggleSidebar?.addEventListener('click', () => {
        body.classList.add('sidebar-collapsed');
        setTimeout(() => rendicao?.resize(), 400);
    });
    btnShowSidebar?.addEventListener('click', () => {
        body.classList.remove('sidebar-collapsed');
        setTimeout(() => rendicao?.resize(), 400);
    });

    // ---- Menu Modal ----
    btnMenu.addEventListener('click', () => {
        const currentLocation = rendicao.currentLocation();
        const chapter = livro.navigation.get(currentLocation?.start?.href);
        menuChapterTitle.textContent = chapter ? chapter.label.trim() : 'Início';
        gerarSumario(panelSumarioModal, true);
        renderNotesPanel();

        openMenuModal();
    });
    closeMenuModalBtn.addEventListener('click', closeMenuModal);
    menuModal.addEventListener('click', (e) => {
        // Fecha apenas se o clique for no fundo escuro, não no conteúdo
        if (e.target === menuModal) {
            closeMenuModal();
        }
    });

    // ---- Abas do Menu Modal ----
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Desativa todas as abas e painéis
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });

            // Ativa o botão e o painel clicado
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            const targetPanel = document.getElementById(button.dataset.target);
            targetPanel.classList.add('active');

            // --- A MÁGICA DA CORREÇÃO ACONTECE AQUI ---
            // Em vez de focar no painel, procuramos o primeiro item focável DENTRO dele.
            const firstFocusable = targetPanel.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');

            // Se encontrarmos um item, movemos o foco para ele.
            if (firstFocusable) {
                firstFocusable.focus();
            }
        });
    });

    // ---- Painel de Exibição ----
    Object.keys(THEMES).forEach(name => {
        rendicao.themes.register(name, THEMES[name].content);
    });

    const updateFontSize = () => {
        fontSizeSlider.value = currentFontSize;
        rendicao.themes.fontSize(`${currentFontSize}%`);
        setTimeout(reaplicarAnotacoes, 100);
    };
    decreaseFontBtn.addEventListener('click', () => { if (currentFontSize > 80) { currentFontSize -= 10; updateFontSize(); } });
    increaseFontBtn.addEventListener('click', () => { if (currentFontSize < 200) { currentFontSize += 10; updateFontSize(); } });
    fontSizeSlider.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value); updateFontSize(); });
    fontSelect.addEventListener('change', (e) => rendicao.themes.font(e.target.value === "Original" ? "Times New Roman" : e.target.value));

    // Lógica de troca de tema
    themeRadios.forEach(radio => radio.addEventListener('click', () => {
        currentTheme = radio.value;
        applyUiTheme(currentTheme);
        rendicao.themes.select(currentTheme); 
    }));

    layoutRadios.forEach(radio => radio.addEventListener('click', () => rendicao.spread(radio.value)));

    // ---- Lightbox ----
    closeLightboxBtn?.addEventListener('click', () => imageLightbox.style.display = 'none');
    imageLightbox?.addEventListener('click', (e) => {
        if (e.target === imageLightbox) imageLightbox.style.display = 'none';
    });

    gerarSumario(sumarioContainer, false);
    setupGlobalFocusManagement();
}

// ==========================================================================
// Hooks para o conteúdo do livro (executado para cada capítulo)
// ==========================================================================

export function setupContentHooks() {
    rendicao.hooks.content.register((contents) => {

        const style = contents.document.createElement('style');
        style.innerHTML = `
            /* Espaçamento entre parágrafos (Restaurado) */
            p {
                margin-bottom: 1.5em;
            }

            /* Estilos para imagens e SVGs responsivos (Restaurado) */
            img, svg {
                max-width: 100% !important;
                max-height: 95vh !important;
                height: auto !important;
                width: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
            }

            /* Cor da seleção de texto (Restaurado) */
            ::selection {
                background-color: #D3D3D3;
            }
        `;
        contents.document.head.appendChild(style);


        // --- LÓGICA DE TEMAS E FUNCIONALIDADES ---
        rendicao.themes.select(currentTheme);
        applyUiTheme(currentTheme);

        if (currentTheme === 'noturno') {
            applySmartNightMode(contents);
        }

        const images = contents.document.querySelectorAll('img, svg');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                imageLightbox.style.display = 'flex';
            });
        });

        contents.window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') rendicao.prev();
            if (event.key === 'ArrowRight') rendicao.next();
        });
    });
}