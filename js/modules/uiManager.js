/**
 * uiManager.js
 * Módulo para controlar todos os elementos e eventos da interface do usuário (DOM).
 */

import { livro, rendicao, irPara } from './epubService.js';
import { savedAnnotations } from './annotations.js';

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

// Estado da UI
let currentTheme = 'claro';
let currentFontSize = 100;


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
    // A data pode vir em formatos diferentes, uma verificação simples ajuda
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
    container.innerHTML = ''; // Limpa o conteúdo anterior
    container.appendChild(sumarioHtml);
}

function renderNotesPanel() {
    panelNotas.innerHTML = '';
    const hasNotes = savedAnnotations.length > 0;

    if (hasNotes) {
        savedAnnotations.forEach(annotation => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <blockquote class="note-text">"${annotation.text}"</blockquote>
                ${annotation.note ? `<p class="note-comment">${annotation.note}</p>` : ''}
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
}


function applyTheme() {
    const themes = {
        claro: { bg: '#FFFFFF', text: '#000000', border: '#ddd' },
        sepia: { bg: '#fbf0d9', text: '#5b4636', border: '#e9e0cb' },
        noturno: { bg: '#383B43', text: '#E0E0E0', border: '#4a4e59' }
    };
    const theme = themes[currentTheme];
    
    // Aplica tema na interface geral (fora do livro)
    document.querySelector('.titulo').style.backgroundColor = theme.bg;
    document.querySelector('.titulo p').style.color = theme.text;
    document.querySelector('.progresso').style.backgroundColor = theme.bg;
    document.querySelector('.progresso').style.borderTopColor = theme.border;
    progressoInfo.style.color = theme.text;
    
    // Aplica tema no conteúdo do livro
    rendicao.themes.override('background', theme.bg);
    rendicao.themes.override('color', theme.text);
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
        
        gerarSumario(panelSumarioModal, true); // Gera sumário para o modal
        renderNotesPanel();
        menuModal.classList.add('visible');
    });
    closeMenuModalBtn.addEventListener('click', () => menuModal.classList.remove('visible'));
    menuModal.addEventListener('click', (e) => {
        if (e.target === menuModal) menuModal.classList.remove('visible');
    });

    // ---- Abas do Menu Modal ----
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });

    // ---- Painel de Exibição ----
    const updateFontSize = () => {
        fontSizeSlider.value = currentFontSize;
        rendicao.themes.fontSize(`${currentFontSize}%`);
    };
    decreaseFontBtn.addEventListener('click', () => { if (currentFontSize > 80) { currentFontSize -= 10; updateFontSize(); } });
    increaseFontBtn.addEventListener('click', () => { if (currentFontSize < 200) { currentFontSize += 10; updateFontSize(); } });
    fontSizeSlider.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value); updateFontSize(); });
    fontSelect.addEventListener('change', (e) => rendicao.themes.font(e.target.value === "Original" ? "Times New Roman" : e.target.value));
    
    themeRadios.forEach(radio => radio.addEventListener('click', () => {
        currentTheme = radio.value;
        applyTheme();
    }));

    layoutRadios.forEach(radio => radio.addEventListener('click', () => rendicao.spread(radio.value)));

    // ---- Lightbox ----
    closeLightboxBtn?.addEventListener('click', () => imageLightbox.style.display = 'none');
    imageLightbox?.addEventListener('click', (e) => {
        if (e.target === imageLightbox) imageLightbox.style.display = 'none';
    });

    // Gera o sumário da sidebar principal
    gerarSumario(sumarioContainer, false);
}


// ==========================================================================
// Hooks para o conteúdo do livro (executado para cada capítulo)
// ==========================================================================

export function setupContentHooks() {
    rendicao.hooks.content.register((contents) => {
        // Aplica o tema atual ao novo conteúdo carregado
        applyTheme();

        // Adiciona funcionalidade de lightbox a todas as imagens dentro do livro
        const images = contents.document.querySelectorAll('img');
        images.forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                imageLightbox.style.display = 'flex';
            });
        });

        // Permite navegação com as setas do teclado quando o foco está no livro
        contents.window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') rendicao.prev();
            if (event.key === 'ArrowRight') rendicao.next();
        });
    });
}