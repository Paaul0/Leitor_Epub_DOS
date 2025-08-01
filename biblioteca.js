document.addEventListener('DOMContentLoaded', function() {

    const caminhosDosLivros = [
        "Epubs/moby-dick.epub",
        "Epubs/Edicao-141.epub",
        "Epubs/pg1342.epub",
        "Epubs/Diario_Oficial_188.epub",
        "Epubs/Diario_Oficial_189.epub",
        "Epubs/Diario_Oficial_196.epub"
    ];

    const estante = document.getElementById('estanteDeLivros');

    if (estante) {
        caminhosDosLivros.forEach(caminho => {
            
            // MUDANÇA IMPORTANTE AQUI:
            // Passamos o objeto JSZip que carregamos no HTML para a Epub.js
            const livro = ePub(caminho, { JSZip: window.JSZip });

            Promise.all([livro.coverUrl(), livro.loaded.metadata])
                .then(([urlCapa, meta]) => {
                
                    const divLivro = document.createElement('div');
                    divLivro.className = 'grid-item'; 

                    const linkLivro = document.createElement('a');
                    linkLivro.href = `leitorc.html?livro=${encodeURIComponent(caminho)}`;

                    if (urlCapa) {
                        const imgCapa = document.createElement('img');
                        imgCapa.src = urlCapa;
                        imgCapa.alt = `Capa do livro ${meta.title}`;
                        linkLivro.appendChild(imgCapa);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'placeholder-capa';
                        placeholder.textContent = meta.title || 'Capa não disponível';
                        linkLivro.appendChild(placeholder);
                    }

                    const tituloP = document.createElement('p');
                    tituloP.className = 'grid-item-titulo';
                    tituloP.textContent = meta.title || 'Título desconhecido';
                    linkLivro.appendChild(tituloP);
                    
                    divLivro.appendChild(linkLivro);
                    estante.appendChild(divLivro);

                }).catch(error => {
                    console.error(`Falha ao carregar o livro: ${caminho}`, error);
                });
        });
    }
});