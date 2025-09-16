/**
 * textToSpeech.js
 * Módulo para gerenciar a leitura em voz alta (Web Speech API).
 */

import { livro, rendicao } from './epubService.js';

// ==========================================================================
// Seleção de Elementos (DOM) e Ícones
// ==========================================================================
const btnLerLivro = document.getElementById('btn-ler-livro');
const speechSpeedControl = document.getElementById('speech-speed-control');
const ICON_PLAY = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDhweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSI0OHB4IiBmaWxsPSIjNUI1QjVCIj48cGF0aCBkPSJNMzIwLTIwMFYtNzYwbDQ0MCAyODBMMzIwLTIwMFoiLz48L3N2Zz4=" alt="Play">';
const ICON_STOP = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDhweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSI0OHB4IiBmaWxsPSIjNUI1QjVCIj48cGF0aCBkPSJNMzIwLTIwMHYtNTYwaDU2MHY1NjBIMzIwWiIvPjwvc3ZnPg==" alt="Stop">';

// ==========================================================================
// Estado do Módulo
// ==========================================================================
let isReading = false;
let speechQueue = [];
let currentSpeechIndex = 0;
let currentSpeechRate = 1.0;

// ==========================================================================
// Funções
// ==========================================================================

// Função para ler um trecho específico (usada pelo menu de contexto)
export function readAloud(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Para qualquer leitura anterior
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = currentSpeechRate;
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Seu navegador não suporta a funcionalidade de áudio.');
    }
}

// Funções internas para a leitura do livro completo
function playNextChunk() {
    if (!isReading || currentSpeechIndex >= speechQueue.length) {
        resetSpeechState();
        return;
    }
    const chunk = speechQueue[currentSpeechIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = 'pt-BR';
    utterance.rate = currentSpeechRate;
    utterance.onend = () => {
        currentSpeechIndex++;
        playNextChunk();
    };
    utterance.onerror = (event) => {
        console.error("Erro na síntese de voz:", event.error);
        resetSpeechState();
    };
    window.speechSynthesis.speak(utterance);
}

function resetSpeechState() {
    isReading = false;
    speechQueue = [];
    currentSpeechIndex = 0;
    if (btnLerLivro) {
        btnLerLivro.innerHTML = ICON_PLAY;
        btnLerLivro.title = "Ler o livro em voz alta";
    }
}

// Função principal para extrair o texto e iniciar a leitura do livro todo
async function startReadingBook() {
    if (isReading) {
        window.speechSynthesis.cancel();
        resetSpeechState();
        return;
    }
    
    isReading = true;
    btnLerLivro.disabled = true;
    btnLerLivro.innerHTML = '<p style="font-size:10px; text-align:center;">Preparando...</p>';

    try {
        let fullText = "";
        for (const section of livro.spine.spineItems) {
            const contents = await section.load(livro.load.bind(livro));
            const text = contents.textContent;
            if (text) fullText += text.trim() + " \n ";
            section.unload(); // Libera memória
        }

        const cleanedText = fullText.replace(/\s\s+/g, ' ').trim();
        if (cleanedText.length > 0) {
            speechQueue = cleanedText.match( /[^.!?]+[.!?]+/g ) || [cleanedText]; // Separa por frases
            currentSpeechIndex = 0;
            btnLerLivro.innerHTML = ICON_STOP;
            btnLerLivro.title = "Parar leitura";
            playNextChunk();
        } else {
            alert("Não foi possível extrair texto do livro.");
            resetSpeechState();
        }
    } catch (error) {
        console.error("Erro ao extrair texto para leitura:", error);
        alert("Ocorreu um erro ao preparar o áudio do livro.");
        resetSpeechState();
    } finally {
        btnLerLivro.disabled = false;
    }
}

// Inicializador de eventos do módulo
export function initTextToSpeech() {
    if (btnLerLivro) {
        btnLerLivro.innerHTML = ICON_PLAY;
        btnLerLivro.addEventListener('click', startReadingBook);
    }
    if (speechSpeedControl) {
        speechSpeedControl.addEventListener('change', (e) => {
            currentSpeechRate = parseFloat(e.target.value);
        });
    }
    // Garante que a fala pare ao fechar a página
    window.addEventListener('beforeunload', () => {
        if (isReading) window.speechSynthesis.cancel();
    });
}