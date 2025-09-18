/**
 * annotations.js
 * Módulo para gerenciar anotações e grifos na sessão atual.
 * VERSÃO 12.0 - Lógica final sem remoção e com verificação estrita para evitar sobreposição de opacidade.
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
export let savedAnnotations = []; // As anotações existem apenas enquanto a página estiver aberta.
let lastCfiRange = null;
let lastSelectedText = "";

// ==========================================================================
// Funções Principais de Manipulação de Anotações
// ==========================================================================

/**
 * Adiciona uma nova anotação, prevenindo duplicatas exatas.
 * @param {'highlight' | 'annotation'} type - O tipo de anotação.
 * @param {string} [note] - O texto da nota, se houver.
 */
function addAnnotation(type, note = '') {
    if (!lastCfiRange || !lastSelectedText) return;

    // VERIFICAÇÃO ANTI-EMPILHAMENTO: Converte o CFI para string para uma comparação fiável.
    const cfiString = lastCfiRange.toString();
    const isAlreadyAnnotated = savedAnnotations.some(ann => ann.cfi.toString() === cfiString);

    // Se a anotação já existe, ignora a nova e apenas limpa a seleção.
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

    // 1. Adiciona a nova anotação aos dados da sessão.
    savedAnnotations.push(newAnnotation);

    // 2. Desenha APENAS a nova anotação na tela.
    drawAnnotation(newAnnotation);

    // 3. Limpa a seleção de texto do usuário.
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

    // O handler de clique foi removido. Clicar no grifo não faz mais nada.
    rendicao.annotations[method](ann.cfi, {}, () => {}, "epubjs-annotation", style);
}

/**
 * Limpa a tela e redesenha TODAS as anotações da sessão.
 * Chamado ao virar a página.
 */
export function reaplicarAnotacoes() {
    // Limpa e redesenha todas as anotações
    savedAnnotations.forEach(ann => {
        // Determina o tipo de anotação correto para a remoção
        const removalType = ann.type === 'highlight' ? 'highlight' : 'underline';
        rendicao.annotations.remove(ann.cfi, removalType);
    });

    // Recria cada anotação a partir dos dados da sessão
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
        window.open(`https://www.dicio.com.br/${encodeURIComponent(word)}`, '_blank');
        clearSelection();
    });

    btnAudioFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        readAloud(lastSelectedText);
        clearSelection();
    });
}