/**
 * annotations.js
 * Módulo para gerenciar anotações e grifos na sessão atual.
 * Lógica final sem remoção e com verificação estrita para evitar sobreposição de opacidade.
 */

import { rendicao } from './epubService.js';
import { readAloud } from './textToSpeech.js';

// ==========================================================================
// Seleção de Elementos (DOM)
// ==========================================================================
const fixedContextMenu = document.getElementById('fixed-context-menu');
const btnToggleFixedMenu = document.getElementById('btn-toggle-fixed-menu');
const btnHighlightFixed = document.getElementById('fixed-highlight-btn');
const btnCopyFixed = document.getElementById('fixed-copy-btn');
const btnAnnotateFixed = document.getElementById('fixed-anotar-btn');
const btnDictionaryFixed = document.getElementById('fixed-dicio-btn');
const btnAudioFixed = document.getElementById('fixed-audio-btn');

// ==========================================================================
// Estado do Módulo (Apenas em Memória)
// ==========================================================================
export let savedAnnotations = [];
let lastCfiRange = null;
let lastSelectedText = "";

// ==========================================================================
// Funções Principais de Manipulação de Anotações
// ==========================================================================

/**
 * @param {'highlight' | 'annotation'} type
 * @param {string} [note]
 */

function addAnnotation(type, note = '') {
    if (!lastCfiRange || !lastSelectedText) return;

    // VERIFICAÇÃO ANTI-EMPILHAMENTO: Converte o CFI para string para uma comparação fiável.
    const cfiString = lastCfiRange.toString();
    const isAlreadyAnnotated = savedAnnotations.some(ann => ann.cfi.toString() === cfiString);

    if (isAlreadyAnnotated) {
        clearSelection();
        return;
    }

    const newAnnotation = {
        cfi: lastCfiRange,
        text: lastSelectedText,
        type: type,
        note: note
    };

    savedAnnotations.push(newAnnotation);

    drawAnnotation(newAnnotation);

    clearSelection();
}

/**
 * Desenha uma única anotação na tela, sem a funcionalidade de clique para remover.
 * @param {object} ann - O objeto da anotação.
 */

function drawAnnotation(ann) {
    const style = ann.type === 'highlight'
        ? { "fill": "yellow", "fill-opacity": "0.3" }
        : { "stroke": "blue", "stroke-width": "2px", "stroke-dasharray": "5, 3" };
    const method = ann.type === 'highlight' ? 'highlight' : 'underline';

    rendicao.annotations[method](ann.cfi, {}, () => {}, "epubjs-annotation", style);
}

/**
 * Limpa a tela e redesenha TODAS as anotações da sessão.
 * Chamado ao virar a página.
 */
export function reaplicarAnotacoes() {
    savedAnnotations.forEach(ann => {
        const removalType = ann.type === 'highlight' ? 'highlight' : 'underline';
        rendicao.annotations.remove(ann.cfi, removalType);
    });

    savedAnnotations.forEach(ann => {
        drawAnnotation(ann);
    });
}

// ==========================================================================
// Funções da Interface (Menu e Seleção)
// ==========================================================================

function deactivateFixedMenu() {
    lastCfiRange = null;
    lastSelectedText = "";
    if (fixedContextMenu) {
      fixedContextMenu.classList.remove('active');
    }
}

function clearSelection() {
    try {
        rendicao.getContents().forEach(content => {
            if (content && content.window) {
                content.window.getSelection().removeAllRanges();
            }
        });
    } catch (e) {
        console.error("Erro ao limpar seleção:", e);
    }
    deactivateFixedMenu();
}

// ==========================================================================
// Inicialização do Módulo
// ==========================================================================

export function initAnnotations() {
    rendicao.on("selected", (cfiRange, contents) => {
        lastCfiRange = cfiRange;
        lastSelectedText = contents.window.getSelection().toString().trim();
        if (lastSelectedText.length > 0 && fixedContextMenu) {
            fixedContextMenu.classList.add('active');
        } else {
            deactivateFixedMenu();
        }
    });

    rendicao.on("deselected", deactivateFixedMenu);

    // Evento para redesenhar as anotações ao mudar de página.
    rendicao.on("relocated", reaplicarAnotacoes);

    // --- Listeners dos Botões ---
    if (!fixedContextMenu) return;

    btnToggleFixedMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        fixedContextMenu.classList.toggle('collapsed');
        btnToggleFixedMenu.title = fixedContextMenu.classList.contains('collapsed') ? 'Expandir menu' : 'Recolher menu';
    });

    btnHighlightFixed.addEventListener('click', () => addAnnotation('highlight'));

    btnCopyFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        navigator.clipboard.writeText(lastSelectedText);
        clearSelection();
    });

    btnAnnotateFixed.addEventListener('click', () => {
        const note = prompt("Digite sua anotação:", "");
        if (note && note.trim() !== "") {
            addAnnotation('annotation', note.trim());
        } else {
            clearSelection();
        }
    });

    btnDictionaryFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;

        const word = lastSelectedText.split(' ')[0];

        const normalizedWord = word
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        window.open(`https://www.dicio.com.br/${normalizedWord}`, '_blank');

        clearSelection();
    });

    btnAudioFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        readAloud(lastSelectedText);
        clearSelection();
    });
}