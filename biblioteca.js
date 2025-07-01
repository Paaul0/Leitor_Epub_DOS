document.addEventListener('DOMContentLoaded', function() {

    // --- SUA LISTA DE LIVROS ---
    // Agora, para adicionar um novo livro, você só mexe aqui!
    const livros = [
        {
            titulo: "Moby Dick",
            arquivo: "Epubs/moby-dick.epub",
            capa: "./icons/28002-515x800.jpg"
        },
        {
            titulo: "Um Outro Livro",
            arquivo: "Epubs/Edicao-141.epub",
            capa: "./icons/dos.png" // Lembre-se de trocar este caminho
        },

        {
            titulo: "Um Outro Livro",
            arquivo: "epubs/outro-livro.epub",
            capa: "caminho/para/outra-capa.jpg" // Lembre-se de trocar este caminho
        }
        // Para adicionar um terceiro livro:
        // ,{
        //     titulo: "Nome do Terceiro Livro",
        //     arquivo: "epubs/terceiro-livro.epub",
        //     capa: "caminho/para/terceira-capa.jpg"
        // }
    ];

    const estante = document.getElementById('estanteDeLivros');

    if (estante) {
        livros.forEach(livro => {
            // Cria a div principal do livro e adiciona a classe para o CSS funcionar
            const divLivro = document.createElement('div');
            divLivro.className = 'grid-item'; 

            // Cria o link <a>
            const linkLivro = document.createElement('a');
            linkLivro.href = `leitorc.html?livro=${livro.arquivo}`;

            // Cria a imagem <img>
            const imgCapa = document.createElement('img');
            imgCapa.src = livro.capa;
            imgCapa.alt = `Capa do livro ${livro.titulo}`;

            // Monta a estrutura: <img> dentro do <a>, e <a> dentro da <div>
            linkLivro.appendChild(imgCapa);
            divLivro.appendChild(linkLivro);
            
            // Adiciona o livro montado na estante
            estante.appendChild(divLivro);
        });
    }
})