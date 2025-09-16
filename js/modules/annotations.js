/**
 * annotations.js
 * Módulo para gerenciar anotações, grifos e interações com o texto selecionado.
 */

import { rendicao } from './epubService.js';
import { readAloud } from './textToSpeech.js'; // Importa a função de ler trecho

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
// Estado do Módulo (Exportado para que outros módulos possam ler)
// ==========================================================================
export let savedAnnotations = [];
let lastCfiRange = null;
let lastSelectedText = "";

// ==========================================================================
// Funções Exportadas
// ==========================================================================

export function reaplicarAnotacoes() {
    // Remove anotações antigas para não duplicar
    rendicao.annotations.remove(null, "highlight");
    rendicao.annotations.remove(null, "underline");

    savedAnnotations.forEach(ann => {
        if (ann.type === 'highlight') {
            rendicao.annotations.highlight(ann.cfi, {}, () => {}, "highlight", { "fill": "yellow" });
        } else if (ann.type === 'annotation') {
            rendicao.annotations.underline(ann.cfi, { note: ann.note }, () => {}, "underline", { "stroke": "blue" });
        }
    });
}

export function initAnnotations() {
    // ---- Eventos de Seleção de Texto ----
    rendicao.on("selected", (cfiRange, contents) => {
        lastCfiRange = cfiRange;
        lastSelectedText = contents.window.getSelection().toString().trim();
        if (lastSelectedText.length > 0) {
            fixedContextMenu.classList.add('active');
        } else {
            deactivateFixedMenu();
        }
    });

    rendicao.on("deselected", deactivateFixedMenu);

    // Adiciona listener para fechar o menu ao clicar no livro
    rendicao.hooks.content.register((contents) => {
        contents.window.addEventListener('mousedown', () => {
             // Pequeno delay para garantir que a verificação de seleção ocorra depois do clique
            setTimeout(() => {
                const selection = contents.window.getSelection();
                if (!selection || selection.toString().trim().length === 0) {
                    deactivateFixedMenu();
                }
            }, 10);
        });
    });

    // ---- Eventos dos Botões do Menu Fixo ----
    btnToggleFixedMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        fixedContextMenu.classList.toggle('collapsed');
        const isCollapsed = fixedContextMenu.classList.contains('collapsed');
        btnToggleFixedMenu.title = isCollapsed ? 'Expandir menu' : 'Recolher menu';
    });
    
    btnHighlightFixed.addEventListener('click', () => {
        if (!lastCfiRange) return;
        const grifoExistente = savedAnnotations.some(ann => ann.cfi === lastCfiRange);
        if (!grifoExistente) {
            savedAnnotations.push({ cfi: lastCfiRange, text: lastSelectedText, note: null, type: 'highlight' });
            reaplicarAnotacoes(); // Reaplica para desenhar o novo grifo
        }
        clearSelection();
    });

    btnCopyFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        navigator.clipboard.writeText(lastSelectedText);
        clearSelection();
    });

    btnAnnotateFixed.addEventListener('click', () => {
        if (!lastCfiRange) return;
        const note = prompt("Digite sua anotação:", "");
        if (note && note.trim() !== "") {
            savedAnnotations.push({ cfi: lastCfiRange, text: lastSelectedText, note: note.trim(), type: 'annotation' });
            reaplicarAnotacoes();
        }
        clearSelection();
    });

    btnDictionaryFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        const word = lastSelectedText.split(' ')[0]; // Pega a primeira palavra
        const dictionaryUrl = `https://www.dicio.com.br/${encodeURIComponent(word)}`;
        window.open(dictionaryUrl, '_blank');
        clearSelection();
    });

    btnAudioFixed.addEventListener('click', () => {
        if (!lastSelectedText) return;
        readAloud(lastSelectedText); // Chama a função do módulo de áudio
        clearSelection();
    });
}

// ==========================================================================
// Funções Internas
// ==========================================================================

function deactivateFixedMenu() {
    lastCfiRange = null;
    lastSelectedText = "";
    fixedContextMenu.classList.remove('active');
}

function clearSelection() {
    // Limpa a seleção visual do texto no livro
    rendicao.getContents()[0]?.window.getSelection().removeAllRanges();
    deactivateFixedMenu();
}