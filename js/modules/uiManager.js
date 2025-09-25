/**
 * uiManager.js
 * Módulo para controlar todos os elementos e eventos da interface do usuário (DOM).
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
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnShowSidebar = document.getElementById('btn-show-sidebar');
const menuModal = document.getElementById('menu-modal');
const btnMenu = document.getElementById('btn-menu');
const closeMenuModalBtn = document.getElementById('close-menu-modal-btn');
const menuChapterTitle = document.getElementById('menu-chapter-title');
const panelSumarioModal = document.getElementById('panel-sumario');
const panelNotas = document.getElementById('panel-notas');
const tabButtons = document.querySelectorAll('.menu-tab-btn');
const tabPanels = document.querySelectorAll('.menu-panel');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');
const fixedDecreaseFontBtn = document.getElementById('fixed-decrease-font-btn');
const fixedIncreaseFontBtn = document.getElementById('fixed-increase-font-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSelect = document.getElementById('font-select');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const layoutRadios = document.querySelectorAll('input[name="layout"]');
const imageLightbox = document.getElementById('image-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.querySelector('.close-lightbox');
const mainPageElements = document.querySelectorAll('header, aside, main, footer, #fixed-context-menu, #btn-show-sidebar');


// ==========================================================================
// Estado e Configurações da UI
// ==========================================================================
let currentTheme = 'claro';
let currentFontSize = 100;
const THEMES = {
    claro: { ui: { bg: '#FFFFFF', text: '#000000', border: '#ddd' }, content: { 'body': { 'background': '#FFFFFF', 'color': '#000000 !important' } } },
    sepia: { ui: { bg: '#fbf0d9', text: '#5b4636', border: '#e9e0cb' }, content: { 'body': { 'background': '#fbf0d9', 'color': '#5b4636 !important' } } },
    noturno: { ui: { bg: '#383B43', text: '#E0E0E0', border: '#4a4e59' }, content: { 'body': { 'background': '#383B43', 'color': '#E0E0E0 !important' } } }
};

// ==========================================================================
// Funções de Acessibilidade
// ==========================================================================

function anunciar(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
        announcer.textContent = message;
    }
}

/**
 * Assume o controle total da navegação por Tab de forma inteligente.
 * Contém uma regra de exceção para garantir que o iframe do livro seja incluído.
 */
function setupGlobalFocusManagement() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;

        const modal = document.getElementById('menu-modal');
        const isModalVisible = modal.classList.contains('visible');
        const searchContext = isModalVisible ? modal : document.body;

        const query = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, iframe, [tabindex]:not([tabindex="-1"])';

        const focusableElements = Array.from(searchContext.querySelectorAll(query));

        const visibleFocusableElements = focusableElements.filter(el => {
            const style = getComputedStyle(el);
            if (el.tagName === 'IFRAME') {
                return style.visibility !== 'hidden' && style.display !== 'none';
            }
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        });

        if (visibleFocusableElements.length === 0) {
            event.preventDefault();
            return;
        }

        const currentIndex = visibleFocusableElements.indexOf(document.activeElement);
        const isTabbingBackward = event.shiftKey;
        let nextIndex = 0;

        if (isTabbingBackward) {
            nextIndex = (currentIndex > 0) ? currentIndex - 1 : visibleFocusableElements.length - 1;
        } else {
            nextIndex = (currentIndex < visibleFocusableElements.length - 1) ? currentIndex + 1 : 0;
        }

        event.preventDefault();
        visibleFocusableElements[nextIndex].focus();
    });
}

// ==========================================================================
// Funções do Lightbox Acessível
// ==========================================================================
function openLightbox(imageElement) {
    mainPageElements.forEach(el => el.setAttribute('aria-hidden', 'true'));
    lightboxImg.src = imageElement.src;
    imageLightbox.style.display = 'flex';
    setTimeout(() => {
        closeLightboxBtn.focus();
    }, 100);
}

function closeLightbox() {
    mainPageElements.forEach(el => el.removeAttribute('aria-hidden'));
    imageLightbox.style.display = 'none';
    const bookIframe = document.querySelector('#leitor iframe');
    if (bookIframe) {
        bookIframe.focus();
    }
}

// ==========================================================================
// Funções de Renderização e UI
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
    const notesWithComments = savedAnnotations.filter(ann => ann.type === 'annotation' && ann.note);

    if (notesWithComments.length > 0) {
        notesWithComments.forEach(annotation => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `<blockquote class="note-text">"${annotation.text}"</blockquote><p class="note-comment">${annotation.note}</p>`;
            noteItem.addEventListener('click', () => {
                irPara(annotation.cfi);
                menuModal.classList.remove('visible');
            });
            panelNotas.appendChild(noteItem);
        });
    } else {
        panelNotas.innerHTML = '<p style="text-align: center; color: #888;">Você ainda não fez anotações.</p>';
    }

    const exportButton = document.createElement('button');
    exportButton.id = 'btn-export-notes';
    exportButton.textContent = 'Exportar para .txt';
    exportButton.className = 'kindle-button';
    exportButton.style.marginTop = '20px';
    panelNotas.appendChild(exportButton);
    if (notesWithComments.length === 0) {
        exportButton.disabled = true;
    }
    exportButton.addEventListener('click', () => {
        const bookTitle = livro.packaging.metadata.title || 'livro';
        const sanitizedTitle = bookTitle.replace(/[^a-z09]/gi, '_').toLowerCase();
        const filename = `notas_${sanitizedTitle}.txt`;
        let fileContent = `Anotações do Livro: ${bookTitle}\n\n========================================\n\n`;
        notesWithComments.forEach((ann, index) => {
            fileContent += `ANOTAÇÃO #${index + 1}\n\nTrecho Grifado:\n"${ann.text}"\n\nSeu Comentário:\n${ann.note}\n\n----------------------------------------\n\n`;
        });
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function applyUiTheme(themeName) {
    const theme = THEMES[themeName].ui;
    document.querySelector('.leitor').style.backgroundColor = theme.bg;
    document.querySelector('.titulo').style.backgroundColor = theme.bg;
    document.querySelector('.titulo p').style.color = theme.text;
    document.querySelector('.progresso').style.backgroundColor = theme.bg;
    document.querySelector('.progresso').style.borderTopColor = theme.border;
    progressoInfo.style.color = theme.text;
}

function applySmartNightMode(contents) {
    const isColorLight = (colorStr) => {
        if (!colorStr || colorStr === 'transparent' || colorStr.startsWith('rgba(0, 0, 0, 0)')) return false;
        try {
            const [r, g, b] = colorStr.match(/\d+/g).map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            return luminance > 186;
        } catch (e) { return false; }
    };
    const elementsToCheck = contents.document.body.querySelectorAll('p, span, div, li, a, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote');
    elementsToCheck.forEach(el => {
        const style = contents.window.getComputedStyle(el);
        if (isColorLight(style.backgroundColor)) {
            el.style.setProperty('color', '#111111', 'important');
        }
    });
}

/**
 * Move o foco para dentro do conteúdo do livro automaticamente
 * assim que o iframe recebe foco.
 */
export function setupIframeContentFocus() {
    const bookIframe = document.querySelector('#leitor iframe');
    if (!bookIframe) return;

    bookIframe.addEventListener('focus', () => {
        const bookBody = bookIframe.contentDocument.getElementById('book-content-body');
        if (bookBody) {
            bookBody.focus();
            anunciar("Área de leitura. Use as setas para navegar no texto.");
        }
    });
}

// ==========================================================================
// Inicializador Principal de Eventos da UI
// ==========================================================================

export function initUIManager() {
    document.getElementById("anterior").addEventListener("click", () => rendicao.prev());
    document.getElementById("proximo").addEventListener("click", () => rendicao.next());

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

        mainPageElements.forEach(el => el.setAttribute('aria-hidden', 'true'));
        btnMenu.setAttribute('aria-expanded', 'true');
        menuModal.classList.add('visible');
        setTimeout(() => {
            closeMenuModalBtn.focus();
        }, 100);
    });

    const closeMenuModal = () => {
        mainPageElements.forEach(el => el.removeAttribute('aria-hidden'));
        btnMenu.setAttribute('aria-expanded', 'false');
        menuModal.classList.remove('visible');
        btnMenu.focus();
    };

    closeMenuModalBtn.addEventListener('click', closeMenuModal);
    menuModal.addEventListener('click', (e) => { if (e.target === menuModal) closeMenuModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuModal.classList.contains('visible')) closeMenuModal(); });

    // ---- Abas do Menu Modal ----
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-selected', 'false'); });
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            const targetPanel = document.getElementById(button.dataset.target);
            targetPanel.classList.add('active');
            const firstFocusable = targetPanel.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) firstFocusable.focus();
        });
    });

    // ---- Painel de Exibição ----
    Object.keys(THEMES).forEach(name => rendicao.themes.register(name, THEMES[name].content));

    const updateFontSize = () => {
        fontSizeSlider.value = currentFontSize;
        rendicao.themes.fontSize(`${currentFontSize}%`);
        setTimeout(reaplicarAnotacoes, 100);
        anunciar(`Tamanho da fonte ${currentFontSize}%`);
    };

    const handleFontButtonClick = (isIncreasing) => {
        if (isIncreasing) {
            if (currentFontSize < 200) currentFontSize += 10;
        } else {
            if (currentFontSize > 80) currentFontSize -= 10;
        }
        updateFontSize();
    };

    decreaseFontBtn.addEventListener('click', () => handleFontButtonClick(false));
    increaseFontBtn.addEventListener('click', () => handleFontButtonClick(true));
    fixedDecreaseFontBtn.addEventListener('click', () => handleFontButtonClick(false));
    fixedIncreaseFontBtn.addEventListener('click', () => handleFontButtonClick(true));

    const handleKeydownOnFontButtons = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.currentTarget.click();
        }
    };
    decreaseFontBtn.addEventListener('keydown', handleKeydownOnFontButtons);
    increaseFontBtn.addEventListener('keydown', handleKeydownOnFontButtons);
    fixedDecreaseFontBtn.addEventListener('keydown', handleKeydownOnFontButtons);
    fixedIncreaseFontBtn.addEventListener('keydown', handleKeydownOnFontButtons);

    fontSizeSlider.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value); updateFontSize(); });
    fontSelect.addEventListener('change', (e) => rendicao.themes.font(e.target.value === "Original" ? "Times New Roman" : e.target.value));

    themeRadios.forEach(radio => radio.addEventListener('click', () => {
        currentTheme = radio.value;
        applyUiTheme(currentTheme);
        rendicao.themes.select(currentTheme);
        anunciar(`Tema alterado para ${currentTheme}`);
    }));

    layoutRadios.forEach(radio => radio.addEventListener('click', () => rendicao.spread(radio.value)));

    // ---- Lightbox ----
    closeLightboxBtn?.addEventListener('click', closeLightbox);
    imageLightbox?.addEventListener('click', (e) => { if (e.target === imageLightbox) closeLightbox(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && imageLightbox.style.display === 'flex') closeLightbox(); });

    gerarSumario(sumarioContainer, false);
    setupGlobalFocusManagement();
}

// ==========================================================================
// Hooks para o conteúdo do livro
// ==========================================================================

export function setupContentHooks() {
    rendicao.hooks.content.register((contents) => {
        const style = contents.document.createElement('style');
        style.innerHTML = `p { margin-bottom: 1.5em; } img, svg { max-width: 100% !important; max-height: 95vh !important; height: auto !important; width: auto; object-fit: contain; display: block; margin: 0 auto; } ::selection { background-color: #D3D3D3; }`;
        contents.document.head.appendChild(style);

        rendicao.themes.select(currentTheme);
        applyUiTheme(currentTheme);
        if (currentTheme === 'noturno') {
            applySmartNightMode(contents);
        }

        const images = contents.document.querySelectorAll('img, svg');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                openLightbox(img);
            });
        });

        contents.window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') rendicao.prev();
            if (event.key === 'ArrowRight') rendicao.next();
        });
    });
}