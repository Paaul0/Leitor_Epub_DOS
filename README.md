# Leitor de Livros Digitais (EPUB) com Foco em Acessibilidade

## Descrição

Um leitor de livros digitais no formato EPUB para a web, construído com HTML, CSS e JavaScript puro. O projeto foi desenvolvido com forte ênfase na acessibilidade, oferecendo uma experiência otimizada para usuários de leitores de tela e navegação por teclado, além de um modo de leitura padrão visualmente rico. Ele visa resolver a dificuldade de encontrar leitores EPUB web que sejam verdadeiramente acessíveis e funcionais.

## Status do Projeto

**Versão:** 1.0 (Funcional / Em Manutenção)

O projeto está funcional, com as principais características implementadas e testadas. Futuras melhorias podem incluir salvamento de preferências do usuário e otimizações adicionais.

## Funcionalidades

* **Leitura de EPUB:** Carrega e exibe livros no formato EPUB 3.
* **Modo Duplo de Leitura:**
    * **Modo Padrão:** Experiência visual paginada, utilizando `<iframe>` (via Epub.js).
    * **Modo Acessível:** Renderização direta no DOM como uma única coluna de rolagem, otimizada para leitores de tela e navegação por teclado.
* **Acessibilidade Avançada:**
    * Navegação completa por teclado (Tab, Setas Cima/Baixo para conteúdo, Esquerda/Direita para páginas/seções).
    * Gerenciamento de foco robusto ("Focus Trap") em modais.
    * Anúncios dinâmicos para leitores de tela (mudança de capítulo, progresso, etc.).
    * Link "Pular para o Conteúdo".
    * Uso correto de HTML semântico e atributos ARIA (`role`, `aria-label`, `aria-describedby`, etc.).
* **Busca Inteligente:** Funcionalidade de busca no texto completo, com lógicas adaptadas para cada modo e insensível a acentos e maiúsculas/minúsculas.
* **Navegação:**
    * Sumário interativo na sidebar.
    * Botões "Anterior" / "Próximo".
    * Navegação por setas do teclado.
* **Leitura em Voz Alta:** Suporte a Text-to-Speech (TTS) via Web Speech API para leitura do livro inteiro ou trechos selecionados, com controle de velocidade.
* **Controles de Exibição:**
    * Ajuste de tamanho da fonte (adaptado para ambos os modos).
    * Seleção de Temas: Claro, Sépia, Noturno (Modo Padrão).
    * Modo de Alto Contraste (acessível pelo menu fixo).
* **Menu Fixo:** Acesso rápido a controles essenciais (aumentar/diminuir fonte, alto contraste) no Modo Acessível.
* **Design Responsivo:** Interface adaptada para diferentes tamanhos de tela (notebooks, tablets, celulares).
* **Outros:** Visualização de imagens em lightbox.

## Tecnologias Utilizadas

* **Front-End:**
    * HTML5 (Semântico)
    * CSS3 (Layout com Grid, Media Queries para responsividade)
    * JavaScript (ES6+ com Módulos)
* **Bibliotecas JavaScript:**
    * [Epub.js](https://github.com/futurepress/epub.js/): Para parsear e renderizar o EPUB no modo padrão.
    * [JSZip](https://stuk.github.io/jszip/): Dependência do Epub.js para descompactar arquivos EPUB.
* **APIs do Navegador:**
    * Web Speech API (SpeechSynthesisUtterance): Para a funcionalidade de leitura em voz alta.
* **Acessibilidade:**
    * ARIA (Accessible Rich Internet Applications)

## Como Instalar e Configurar

Este é um projeto front-end puro, não necessitando de um servidor complexo para ser executado localmente.

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Paaul0/Leitor_Epub_DOS.git
    ```
2.  **Navegue até a pasta do projeto:**
    ```bash
    cd https://github.com/Paaul0/Leitor_Epub_DOS.git
    ```
3.  **Abra o arquivo principal no navegador:**
    Abra o arquivo `leitor.html` (ou o nome do seu arquivo HTML principal) diretamente no seu navegador web (Firefox, Chrome, Edge, etc.).

4.  **Para abrir um livro:**
    Você precisa passar o caminho relativo do arquivo EPUB desejado como um parâmetro na URL.
    * **Exemplo:** Se o seu EPUB (`meulivro.epub`) está na mesma pasta que `leitor.html`, a URL seria:
        `file:///caminho/completo/para/pasta/leitor.html?livro=meulivro.epub`
    * Se o EPUB estiver em uma subpasta `livros`:
        `file:///caminho/completo/para/pasta/leitor.html?livro=livros/meulivro.epub`

    *(Observação: A execução direta de arquivos locais (`file:///`) pode ter restrições de segurança em alguns navegadores, especialmente para carregar recursos. Para desenvolvimento, pode ser útil usar um servidor local simples, como o `Live Server` do VS Code ou `python -m http.server`)*

## Como Usar

1.  **Abra o Leitor:** Carregue o `leitor.html` no navegador com o parâmetro `?livro=` apontando para o arquivo EPUB.
2.  **Escolha o Modo:** No pop-up inicial, selecione "Usar Modo Acessível" ou "Usar Modo Padrão".
3.  **Navegação:**
    * Use os botões "Anterior" e "Próximo" no rodapé.
    * Use as setas Esquerda e Direita do teclado.
    * No Modo Acessível, use as setas Cima e Baixo para navegar pelo conteúdo textual.
4.  **Sumário:** Clique no ícone (☰) no canto superior esquerdo para abrir/fechar a sidebar e acessar o sumário. Clique em um item para ir até ele.
5.  **Busca:** Clique no ícone de lupa (🔍), digite o termo e pressione Enter.
    * *Modo Acessível:* Os resultados aparecerão no menu principal (aba "Notas"). Clique ou use `Enter` em um resultado para ir até ele. Use `Tab` para navegar entre os resultados.
    * *Modo Padrão:* Use os botões `<` e `>` na barra de busca para navegar entre as ocorrências encontradas.
6.  **Controles Rápidos (Menu Fixo):** Use os ícones no canto superior direito para acessar rapidamente controles como aumentar/diminuir fonte e (no modo acessível) alternar alto contraste.
7.  **Configurações Completas (Menu Principal):** Clique no ícone de engrenagem (⚙️) para abrir o menu completo com opções de fonte, tema (modo padrão), sumário e notas.
8.  **Leitura em Voz Alta:** Use os controles de Play/Stop e velocidade no rodapé da sidebar.

## Como Contribuir

Contribuições são bem-vindas! Se você deseja melhorar este projeto, siga estes passos:

1.  **Faça um Fork** do repositório.
2.  **Crie uma Branch** para sua modificação:
    ```bash
    git checkout -b feature/SuaNovaFeature
    ```
3.  **Faça suas alterações.** Siga os padrões de código existentes e mantenha o foco na clareza e na acessibilidade.
4.  **Faça Commit** de suas mudanças com uma mensagem clara:
    ```bash
    git commit -m 'feat(escopo): Descreve a sua nova feature'
    # Ex: 'feat(a11y): Adiciona tema de alto contraste alternativo'
    ```
5.  **Faça Push** para a sua branch:
    ```bash
    git push origin feature/SuaNovaFeature
    ```
6.  **Abra um Pull Request** no repositório original, descrevendo suas alterações.

*Para mais detalhes sobre padrões de código e processo de contribuição, veja o arquivo `CONTRIBUTING.md` (se existir).*

## Autor

**Paulo Alberto Abrahão Neto**

* **Email:** [paulo.abrahao980@gmail.com](mailto:paulo.abrahao980@gmail.com)
* **(Opcional) GitHub:** https://github.com/Paaul0
* **(Opcional) LinkedIn:** http://linkedin.com/in/paulo-neto-9b0262238
