/**
 * epubService.js
 * Módulo responsável por carregar, renderizar e controlar a navegação do livro EPUB.
 */

// Exporta as instâncias para que outros módulos possam usá-las
export let livro;
export let rendicao;

export function initEpub(caminhoDoLivro, leitorContainerId) {
    if (!caminhoDoLivro) {
        console.error("Nenhum caminho de livro fornecido.");
        document.getElementById(leitorContainerId).innerHTML = "<h3>Nenhum livro selecionado.</h3>";
        return null;
    }

    livro = ePub(caminhoDoLivro, { JSZip: window.JSZip });
    
    rendicao = livro.renderTo(leitorContainerId, { 
        width: "100%", 
        height: "100%", 
        spread: "none", 
        allowScriptedContent: true 
    });

    // Gera as localizações para cálculo de progresso
    livro.ready.then(() => {
        return livro.locations.generate(1024);
    }).then(() => {
        rendicao.display();
    });

    return { livro, rendicao };
}

export function proximo() {
    rendicao?.next();
}

export function anterior() {
    rendicao?.prev();
}

export function irPara(href) {
    rendicao?.display(href);
}