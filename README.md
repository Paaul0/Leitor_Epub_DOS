# 📖 Leitor de EPUB Web

Um leitor de livros digitais em formato EPUB, totalmente funcional no navegador, desenvolvido com HTML, CSS e JavaScript puro, utilizando a poderosa biblioteca Epub.js.

Este projeto foi criado para explorar a manipulação de arquivos EPUB no ambiente web e para construir uma experiência de leitura rica e personalizável.

**[Veja a demonstração ao vivo](https://seu-usuario.github.io/seu-repositorio/)** `(substitua este link)`

---

## ✨ Funcionalidades Principais

O leitor oferece uma gama completa de funcionalidades para uma ótima experiência de leitura:

* **Leitura de Arquivos EPUB:** Carregue e renderize qualquer arquivo `.epub` local.
* **Navegação:**
    * Paginação fluida com botões "Anterior" e "Próximo".
    * Sumário interativo para pular diretamente para qualquer capítulo.
    * Exibição do progresso de leitura em porcentagem (%).
* **Menu de Contexto (ao selecionar texto):**
    * **Grifar:** Destaque trechos importantes com a cor amarela.
    * **Anotar:** Crie notas pessoais associadas a um trecho.
    * **Copiar:** Copie o texto selecionado para a área de transferência.
    * **Dicionário:** Pesquise a palavra selecionada no dicionário online Dicio.
    * **Ler em Voz Alta:** Utilize a síntese de voz do navegador para ouvir o trecho selecionado.
* **Painel de Configurações e Notas:**
    * **Aba Sumário:** Navegue pela estrutura do livro.
    * **Aba Exibição:**
        * Ajuste o **tamanho da fonte** com um slider e botões.
        * Altere a **família da fonte** (Original, Literata, Georgia).
        * Escolha entre três **temas de cores**: Claro, Sépia e Noturno.
    * **Aba Notas:**
        * Veja uma lista de todas as anotações feitas.
        * Clique em uma nota para ser levado diretamente ao local correspondente no livro.
* **Pesquisa:** Interface de pesquisa para futuras implementações.

---

## 🚀 Tecnologias Utilizadas

* **HTML5**
* **CSS3**
* **JavaScript (ES6+)**
* **[Epub.js](https://github.com/futurepress/epub.js/)**: A biblioteca principal para processar e renderizar os arquivos EPUB.
* **[JSZip](https://stuk.github.io/jszip/)**: Dependência utilizada pela Epub.js para descompactar os arquivos `.epub`.
* **Web Speech API**: API nativa do navegador para a funcionalidade de "Ler em Voz Alta".

---
