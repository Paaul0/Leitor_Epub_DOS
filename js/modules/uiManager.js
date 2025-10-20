/**
 * uiManager.js
 * Módulo para controlar todos os elementos e eventos da interface do usuário (DOM).
 * ***** VERSÃO COMPLETA E CORRIGIDA *****
 */

import { livro, rendicao, irPara } from './epubService.js';
import { savedAnnotations, reaplicarAnotacoes } from './annotations.js';
import { getCurrentChapterHref } from './accessibleRenderer.js';

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

const UI_THEMES = {
    claro: { bg: '#FFFFFF', text: '#000000', border: '#ddd' },
    sepia: { bg: '#fbf0d9', text: '#5b4636', border: '#e9e0cb' },
    noturno: { bg: '#383B43', text: '#E0E0E0', border: '#4a4e59' }
};

// ==========================================================================
// Lógica de Temas e UI
// ==========================================================================

function applyUiTheme(themeName) {
    const theme = UI_THEMES[themeName];
    if (!theme) return;
    const readerElement = document.querySelector('.leitor');
    if (readerElement) readerElement.style.backgroundColor = theme.bg;

    const tituloElement = document.querySelector('.titulo');
    if(tituloElement) tituloElement.style.backgroundColor = theme.bg;

    const tituloP = document.querySelector('.titulo p');
    if(tituloP) tituloP.style.color = theme.text;

    const progressoElement = document.querySelector('.progresso');
    if (progressoElement) {
        progressoElement.style.backgroundColor = theme.bg;
        progressoElement.style.borderTopColor = theme.border;
    }
    if (progressoInfo) progressoInfo.style.color = theme.text;
}

function applyContentTheme(contents) {
    if (!contents) return;
    const oldStyle = contents.document.getElementById('theme-style');
    if (oldStyle) oldStyle.remove();

    const style = contents.document.createElement('style');
    style.id = 'theme-style';
    let css = '';

    if (currentTheme === 'sepia') {
        css = `body { background-color: #fbf0d9 !important; color: #5b4636 !important; } p, a, h1, h2, h3, h4, h5, h6, span { color: #5b4636 !important; } a { color: #8a3c00 !important; }`;
    } else if (currentTheme === 'noturno') {
        css = `body { background-color: #383B43 !important; color: #E0E0E0 !important; } p, a, h1, h2, h3, h4, h5, h6, span { color: #E0E0E0 !important; } a { color: #8ab4f8 !important; }`;
    }

    if (css) {
        style.innerHTML = css;
        contents.document.head.appendChild(style);
    }
}

// ==========================================================================
// Funções de Acessibilidade, UI, etc.
// ==========================================================================

function anunciar(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
        announcer.textContent = message;
    }
}

export function setupGlobalFocusManagement() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;

        // ==========================================================================
        //      LÓGICA CORRIGIDA: AGORA FUNCIONA PARA QUALQUER MODAL
        // ==========================================================================

        // 1. Procura por QUALQUER modal que esteja ativo na tela.
        const accessibilityModal = document.getElementById('acessibilidade-modal');
        const settingsModal = document.getElementById('menu-modal');
        let activeModal = null;

        if (accessibilityModal && accessibilityModal.classList.contains('visible')) {
            activeModal = accessibilityModal;
        } else if (settingsModal && settingsModal.classList.contains('visible')) {
            activeModal = settingsModal;
        }

        // 2. Se nenhum modal estiver ativo, o script não faz nada e deixa o Tab funcionar normalmente.
        if (!activeModal) {
            return;
        }
        // ==========================================================================

        // 3. A partir daqui, o resto do código funciona da mesma forma, mas usando o "activeModal" que encontramos.
        const searchContext = activeModal;
        const query = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(searchContext.querySelectorAll(query));

        // Filtra para garantir que apenas elementos realmente visíveis sejam focados
        const visibleFocusableElements = focusableElements.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
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

export function atualizarTitulo(titulo) {
    if(tituloEl) tituloEl.textContent = titulo;
    document.title = titulo;
}

export function atualizarProgresso(location) {
    if (livro && location && location.start && livro.locations && livro.locations.length() > 0) {
        const percentage = Math.floor(livro.locations.percentageFromCfi(location.start.cfi) * 100);
        if(progressoInfo) progressoInfo.textContent = `Progresso: ${percentage}%`;
    }
}

export function atualizarInfoLivro(metadata) {
    const { title, creator, pubdate } = metadata;
    let infoHtml = `<p class="book-title">${title || 'Título desconhecido'}</p>`;
    if (creator) infoHtml += `<p class="book-author">Por: ${creator}</p>`;
    if (pubdate) infoHtml += `<p class="book-publisher">Publicado em: ${new Date(pubdate).getFullYear()}</p>`;
    if(infoLivEl) infoLivEl.innerHTML = infoHtml;
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
            const isAccessibleMode = document.getElementById('leitor-acessivel').style.display === 'block';
            if (isAccessibleMode) {
                import('./accessibleRenderer.js').then(renderer => {
                    renderer.displayChapter(item.href);
                });
            } else {
                irPara(item.href);
            }
            if (emModal) {
                menuModal.classList.remove('visible');
            }
            if (!emModal && window.innerWidth < 768) {
                document.body.classList.add('sidebar-collapsed');
            }
        });
    });
    container.innerHTML = '';
    container.appendChild(sumarioHtml);
}

function renderNotesPanel() {
    if(!panelNotas) return;
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

export function setAccessibilityMode(isAccessible) {
    const featuresToDisable = [
        document.getElementById('fixed-context-menu'),
        document.querySelector('.layout-control'),
    ];

    if (isAccessible) {
        featuresToDisable.forEach(el => el?.classList.add('feature-disabled'));
        if (progressoInfo) progressoInfo.style.display = 'none';
    } else {
        featuresToDisable.forEach(el => el?.classList.remove('feature-disabled'));
        if (progressoInfo) progressoInfo.style.display = 'block';
    }
}

// ==========================================================================
// Inicializador Principal de Eventos da UI
// ==========================================================================

export function initUIManager() {
    btnToggleSidebar?.addEventListener('click', () => {
        body.classList.add('sidebar-collapsed');
        setTimeout(() => rendicao?.resize(), 400);
    });
    btnShowSidebar?.addEventListener('click', () => {
        body.classList.remove('sidebar-collapsed');
        setTimeout(() => rendicao?.resize(), 400);
    });

    btnMenu?.addEventListener('click', () => {
        const isAccessibleMode = document.getElementById('leitor-acessivel').style.display === 'block';
        let chapterHref;
        if (isAccessibleMode) {
            chapterHref = getCurrentChapterHref();
        } else {
            const currentLocation = rendicao.currentLocation();
            if (currentLocation) {
                chapterHref = currentLocation.start.href;
            }
        }
        const chapter = chapterHref ? livro.navigation.get(chapterHref) : null;
        if(menuChapterTitle) menuChapterTitle.textContent = chapter ? chapter.label.trim() : 'Início';
        if(panelSumarioModal) gerarSumario(panelSumarioModal, true);
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

    closeMenuModalBtn?.addEventListener('click', closeMenuModal);
    menuModal?.addEventListener('click', (e) => { if (e.target === menuModal) closeMenuModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuModal.classList.contains('visible')) closeMenuModal(); });

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

    const updateFontSize = () => {
        if(fontSizeSlider) fontSizeSlider.value = currentFontSize;
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

    decreaseFontBtn?.addEventListener('click', () => handleFontButtonClick(false));
    increaseFontBtn?.addEventListener('click', () => handleFontButtonClick(true));
    fixedDecreaseFontBtn?.addEventListener('click', () => handleFontButtonClick(false));
    fixedIncreaseFontBtn?.addEventListener('click', () => handleFontButtonClick(true));

    fontSizeSlider?.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value); updateFontSize(); });
    fontSelect?.addEventListener('change', (e) => rendicao.themes.font(e.target.value === "Original" ? "Times New Roman" : e.target.value));

    themeRadios.forEach(radio => radio.addEventListener('click', () => {
        currentTheme = radio.value;
        applyUiTheme(currentTheme);
        rendicao.getContents().forEach(c => applyContentTheme(c));
    }));

    layoutRadios.forEach(radio => radio.addEventListener('click', () => rendicao.spread(radio.value)));

    closeLightboxBtn?.addEventListener('click', closeLightbox);
    imageLightbox?.addEventListener('click', (e) => { if (e.target === imageLightbox) closeLightbox(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && imageLightbox.style.display === 'flex') closeLightbox(); });

    if(sumarioContainer) gerarSumario(sumarioContainer, false);
    setupGlobalFocusManagement();
}

// ==========================================================================
// Hooks para o conteúdo do livro
// ==========================================================================
export function setupContentHooks() {
    rendicao.hooks.content.register((contents) => {
        applyUiTheme(currentTheme);
        applyContentTheme(contents);

        const style = contents.document.createElement('style');
        style.innerHTML = `p { margin-bottom: 1.5em; } img, svg { max-width: 100% !important; max-height: 95vh !important; height: auto !important; width: auto; object-fit: contain; display: block; margin: 0 auto; } ::selection { background-color: #D3D3D3; }`;
        contents.document.head.appendChild(style);

        contents.window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') rendicao.prev();
            if (event.key === 'ArrowRight') rendicao.next();
        });
    });
}

/**
 * CORREÇÃO: Esta função espera o capítulo ser 100% renderizado para então
 * adicionar os listeners nas imagens.
 */
export function setupRenderedHooks() {
    rendicao.on("rendered", async (section, view) => {
        const contents = view.contents;
        if (!contents || !contents.document) return;

        // 1. LÓGICA DE CORREÇÃO FORÇADA
        const images = contents.document.querySelectorAll('img');
        for (const img of images) {
            // Se o src NÃO for um blob, nós mesmos o consertamos.
            if (img.getAttribute('src') && !img.src.startsWith('blob:')) {
                const requestedSrc = img.getAttribute('src');
                // Tenta encontrar o recurso no livro
                const resource = livro.resources.get(requestedSrc);
                if (resource) {
                    const url = await resource.url();
                    img.src = url;
                }
            }
        }

        // 2. AGORA, com a garantia de que as imagens estão corretas, configuramos o lightbox.
        const allImages = contents.document.querySelectorAll('img, svg');
        allImages.forEach(img => {
            img.style.cursor = 'pointer';
            if (!img.dataset.lightboxAttached) {
                img.dataset.lightboxAttached = "true";
                img.addEventListener('click', () => {
                    openLightbox(img);
                });
            }
        });
    });
}