const parametros = new URLSearchParams(window.location.search);
const caminhoDoLivro = parametros.get('livro');

// Seletores de elementos da página principal
const tituloEl = document.querySelector('.titulo p');
const leitorEl = document.getElementById('leitor');
const sumarioContainer = document.getElementById('sumario-container');
const progressoInfo = document.getElementById('progresso-info');
const btnAnterior = document.getElementById("anterior");
const btnProximo = document.getElementById("proximo");
const btnSearch = document.getElementById('btn-search');
const searchBar = document.getElementById('search-bar');
const closeSearchBtn = document.getElementById('close-search-btn');
const btnMenu = document.getElementById('btn-menu');

let currentTheme = 'claro'; // Guarda o nome do tema selecionado
let currentBookContents = null; // Guarda uma referência para o conteúdo do livro

// --- NOVO: Array para armazenar as anotações da sessão ---
let savedAnnotations = [];

// Lógica da Barra de Pesquisa
btnSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = btnSearch.getBoundingClientRect();
    searchBar.style.top = `${rect.bottom + window.scrollY + 5}px`;
    searchBar.style.left = `${rect.left + window.scrollX - (searchBar.offsetWidth / 2) + (rect.width / 2)}px`;
    searchBar.classList.toggle('visible');
    if (searchBar.classList.contains('visible')) {
        document.getElementById('search-input').focus();
    }
});
closeSearchBtn.addEventListener('click', () => searchBar.classList.remove('visible'));
document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !btnSearch.contains(e.target) && searchBar.classList.contains('visible')) {
        searchBar.classList.remove('visible');
    }
});

if (caminhoDoLivro) {
    const livro = ePub(caminhoDoLivro, { JSZip: window.JSZip });
    const rendicao = livro.renderTo("leitor", { width: "100%", height: "100%", spread: "auto" });
    rendicao.display();

    const menuModal = document.getElementById('menu-modal');
    const closeMenuModalBtn = document.getElementById('close-menu-modal-btn');
    const menuChapterTitle = document.getElementById('menu-chapter-title');
    const panelSumario = document.getElementById('panel-sumario');

    // --- NOVO: Função para renderizar o painel de notas ---
    function renderNotesPanel() {
        const panelNotas = document.getElementById('panel-notas');
        panelNotas.innerHTML = ''; // Limpa o conteúdo anterior

        if (savedAnnotations.length === 0) {
            panelNotas.innerHTML = '<p style="text-align: center; color: #888;">Você ainda não fez nenhuma anotação.</p>';
            return;
        }

        const notesList = document.createElement('div');
        savedAnnotations.forEach(annotation => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';

            // O texto que foi grifado/selecionado
            const noteText = document.createElement('blockquote');
            noteText.className = 'note-text';
            noteText.textContent = `"${annotation.text}"`;

            // O comentário/nota que o usuário adicionou
            const noteComment = document.createElement('p');
            noteComment.className = 'note-comment';
            noteComment.textContent = annotation.note;

            noteItem.appendChild(noteComment);
            noteItem.appendChild(noteText);

            // Adiciona o evento de clique para navegar até a anotação
            noteItem.addEventListener('click', () => {
                rendicao.display(annotation.cfi);
                menuModal.classList.remove('visible');
            });

            notesList.appendChild(noteItem);
        });
        panelNotas.appendChild(notesList);
    }

    btnMenu.addEventListener('click', () => {
        const currentLocation = rendicao.currentLocation();
        if (currentLocation && currentLocation.start) {
            const chapter = livro.navigation.get(currentLocation.start.href);
            menuChapterTitle.textContent = chapter ? chapter.label.trim() : 'Início';
        }

        panelSumario.innerHTML = '';
        const tocList = document.createElement('ul');
        livro.navigation.toc.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.label.trim();
            a.href = item.href;
            a.onclick = (e) => {
                e.preventDefault();
                rendicao.display(item.href);
                menuModal.classList.remove('visible');
            };
            li.appendChild(a);
            tocList.appendChild(li);
        });
        panelSumario.appendChild(tocList);

        // --- ATUALIZADO: Chama a função para popular o painel de notas sempre que o menu é aberto ---
        renderNotesPanel();

        menuModal.classList.add('visible');
    });

    closeMenuModalBtn.addEventListener('click', () => menuModal.classList.remove('visible'));
    menuModal.addEventListener('click', (event) => {
        if (event.target === menuModal) { menuModal.classList.remove('visible'); }
    });

    const tabButtons = document.querySelectorAll('.menu-tab-btn');
    const tabPanels = document.querySelectorAll('.menu-panel');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });

    // Controles de exibição (fonte, tema)
    const decreaseFontBtn = document.getElementById('decrease-font');
    const increaseFontBtn = document.getElementById('increase-font');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSelect = document.getElementById('font-select');
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    let currentFontSize = 100;
    const updateFontSize = () => {
        fontSizeSlider.value = currentFontSize;
        rendicao.themes.fontSize(`${currentFontSize}%`);
    };
    decreaseFontBtn.addEventListener('click', () => { if (currentFontSize > 80) { currentFontSize -= 10; updateFontSize(); } });
    increaseFontBtn.addEventListener('click', () => { if (currentFontSize < 200) { currentFontSize += 10; updateFontSize(); } });
    fontSizeSlider.addEventListener('input', (e) => { currentFontSize = parseInt(e.target.value); updateFontSize(); });
    fontSelect.addEventListener('change', (e) => rendicao.themes.font(e.target.value === "Original" ? "Arial" : e.target.value));

    themeRadios.forEach(radio => {
        radio.addEventListener('click', () => {
            currentTheme = radio.value; // Atualiza a variável com o novo tema
            applyTheme(currentBookContents); // Reaplica o tema imediatamente
        });
    });

    livro.ready.then(() => {
        const { title } = livro.packaging.metadata;
        tituloEl.textContent = title;
        document.title = title;
        const toc = livro.navigation.toc;
        const sumarioHtml = document.createElement('ul');
        toc.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.textContent = item.label.trim();
            a.href = item.href;
            li.appendChild(a);
            sumarioHtml.appendChild(li);
            a.addEventListener("click", (e) => { e.preventDefault(); rendicao.display(item.href); });
        });
        sumarioContainer.appendChild(sumarioHtml);
    });

    livro.locations.generate(1600).then(() => {
        rendicao.on("relocated", (location) => {
            const percent = livro.locations.percentageFromCfi(location.start.cfi);
            progressoInfo.textContent = `${Math.floor(percent * 100)}%`;
        });
    });

    btnAnterior.addEventListener("click", () => rendicao.prev());
    btnProximo.addEventListener("click", () => rendicao.next());

    let lastMousePosition = { x: 0, y: 0 };
    rendicao.hooks.content.register((contents) => {
        // ADICIONE ESTAS 3 LINHAS ABAIXO
        const style = contents.document.createElement('style');
        style.innerHTML = `p { margin-bottom: 1.5em; }`;
        contents.document.head.appendChild(style);

        currentBookContents = contents;
        applyTheme(contents);

        // O código abaixo já existia, mantenha-o como está
        contents.window.addEventListener('mousemove', (event) => { lastMousePosition = { x: event.clientX, y: event.clientY }; });
        contents.window.addEventListener('click', (event) => {
            const existingMenu = contents.document.getElementById('injected-context-menu');
            if (existingMenu && !existingMenu.contains(event.target)) { existingMenu.remove(); }
        });
    });

    rendicao.on("selected", (cfiRange, contents) => {
        const selection = contents.window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length === 0) return;

        const oldMenu = contents.document.getElementById('injected-context-menu');
        if (oldMenu) oldMenu.remove();

        const menu = contents.document.createElement('div');
        menu.id = 'injected-context-menu';
        Object.assign(menu.style, { position: 'absolute', backgroundColor: '#333', border: '1px solid #333', borderRadius: '6px', padding: '6px', boxShadow: '2px 2px 5px rgba(0, 0, 0, 0.2)', zIndex: '9999', display: 'flex', gap: '3px' });

        menu.innerHTML = `
                <button id="highlight-btn-inj" title="Grifar"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjZWZlIj48cGF0aCBkPSJNMzgwLTQwMGg2MHYtMTIwaDE4MGwtNjAtODAgNjAtODBIMzgwdjI4MFpNMjAwLTEyMHYtNjQwcTAtMzMgMjMuNS01Ni41VDI4MC04NDBoNDAwcTMzIDAgNTYuNSAyMy41VDc2MC03NjB2NjQwTDQ4MC0yNDAgMjAwLTEyMFptODAtMTIyIDIwMC04NiAyMDAgODZ2LTUxOEgyODB2NTE4Wm0wLTUxOGg0MDAtNDAwWiIvPjwvc3ZnPg==" style="width:22px; height:22px; display:block;"></button>
                <button id="copy-btn-inj" title="Copiar"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjZWZlIj48cGF0aCBkPSJNMTIwLTIyMHYtODBoODB2ODBoLTgwWm0wLTE0MHYtODBoODB2ODBoLTgwWm0wLTE0MHYtODBoODB2ODBoLTgwWk0yNjAtODB2LTgwaDgwdjgwaC04MFptMTAwLTE2MHEtMzMgMC01Ni41LTIzLjVUMjgwLTMyMHYtNDgwcTAtMzMgMjMuNS01Ni41VDM2MC04ODBoMzYwcTMzIDAgNTYuNSAyMy41VDgwMC04MDB2NDgwcTAgMzMtMjMuNSA1Ni41VDcyMC0yNDBIMzYwWm0wLTgwaDM2MHYtNDgwSDM2MHY0ODBabTQwIDI0MHYtODBoODB2ODBoLTgwWm0tMjAwIDBxLTMzIDAtNTYuNS0yMy41VDEyMC0xNjBoODB2ODBabTM0MCAwdi04MGg4MHEwIDMzLTIzLjUgNTYuNVQ1NDAtODBaTTEyMC02NDBxMC0zMyAyMy41LTU2LjVUMjAwLTcyMHY4MGgtODBabTQyMCA4MFoiLz48L3N2Zz4=" style="width:22px; height:22px; display:block;"></button>
                <button id="anotar-btn-inj" title="Anotar"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjZWZlIj48cGF0aCBkPSJNMjAwLTEyMHYtNjQwcTAtMzMgMjMuNS01Ni41VDI4MC04NDBoMjQwdjgwSDI4MHY1MThsMjAwLTg2IDIwMCA4NnYtMjc4aDgwdjQwMEw0ODAtMjQwIDIwMC0xMjBabTgwLTY0MGgyNDAtMjQwWm00MDAgMTYwdi04MGgtODB2LTgwaDgwdi04MGg4MHY4MGg4MHY4MGgtODB2ODBoLTgwWiIvPjwvc3ZnPg==" style="width:22px; height:22px; display:block;"></button>
                <button id="dicio-btn-inj" title="Dicionário"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjZWZlIj48cGF0aCBkPSJNNDgwLTgwcS04MyAwLTE1Ni0zMS41VDE5Ny0xOTdxLTU0LTU0LTg1LjUtMTI3VDgwLTQ4MHEwLTgzIDMxLjUtMTU2VDE5Ny03NjNxNTQtNTQgMTI3LTg1LjVUNDgwLTg4MHE4MyAwIDE1NiAzMS41VDc2My03NjNxNTQgNTQgODUuNSAxMjdUODgwLTQ4MHEwIDgzLTMxLjUgMTU2VDc2My0xOTdxLTU0IDU0LTEyNyA4NS41VDQ4MC04MFptLTQwLTgydi03OHEtMzMgMC01Ni41LTIzLjVUMzYwLTMyMHYtNDBMMTY4LTU1MnEtMyAxOC01LjUgMzZ0LTIuNSAzNnEwIDEyMSA3OS41IDIxMlQ0NDAtMTYyWm0yNzYtMTAycTQxLTQ1IDYyLjUtMTAwLjVUODAwLTQ4MHEwLTk4LTU0LjUtMTc5VDYwMC03NzZ2MTZxMCAzMy0yMy41IDU2LjVUNTIwLTY4MGgtODB2ODBxMCAxNy0xMS41IDI4LjVUNDAwLTU2MGgtODB2ODBoMjQwcTE3IDAgMjguNSAxMS41VDYwMC00NDB2MTIwaDQwcTI2IDAgNDcgMTUuNXQyOSA0MC41WiIvPjwvc3ZnPg==" style="width:22px; height:22px; display:block;"></button>
                <button id="audio-btn-inj" title="Áudio"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjZWZlIj48cGF0aCBkPSJNMjQwLTgwcTYyIDAgMTAxLjUtMzF0NjAuNS05MXExNy01MCAzMi41LTcwdDcxLjUtNjRxNjItNTAgOTgtMTEzdDM2LTE1MXEwLTExOS04MC41LTE5OS41VDM2MC04ODBxLTExOSAwLTE5OS41IDgwLjVUODAtNjAwaDgwcTAtODUgNTcuNS0xNDIuNVQzNjAtODAwcTg1IDAgMTQyLjUgNTcuNVQ1NjAtNjAwcTAgNjgtMjcgMTE2dC03NyA4NnEtNTIgMzgtODEgNzR0LTQzIDc4cS0xNCA0NC0zMy41IDY1VDI0MC0xNjBxLTMzIDAtNTYuNS0yMy41VDE2MC0yNDBIODBxMCA2NiA0NyAxMTN0MTEzIDQ3Wm0xMjAtNDIwcTQyIDAgNzEtMjkuNXQyOS03MC41cTAtNDItMjktNzF0LTcxLTI5cS00MiAwLTcxIDI5dC0yOSA3MXEwIDQxIDI5IDcwLjV0NzEgMjkuNVptMzgwIDEyMS01OS01OXExOS0zNyAyOS03Ny41dDEwLTg0LjVxMC00NC0xMC04NHQtMjktNzdsNTktNTlxMjkgNDkgNDQuNSAxMDQuNVQ4MDAtNjAwcTAgNjEtMTUuNSAxMTYuNVQ3NDAtMzc5Wm0xMTcgMTE2LTU5LTU4cTM5LTYwIDYwLjUtMTMwVDg4MC01OThxMC03OC0yMi0xNDguNVQ3OTctODc3bDYwLTYwcTQ5IDcyIDc2IDE1Ny41VDk2MC02MDBxMCA5NC0yNyAxNzkuNVQ4NTctMjYzWiIvPjwvc3ZnPg==" style="width:22px; height:22px; display:block;"></button>
            `;

        contents.document.body.appendChild(menu);
        const buttons = menu.querySelectorAll('button');
        buttons.forEach(button => {
            Object.assign(button.style, { backgroundColor: '#555', border: 'none', padding: '10px', margin: '0', borderRadius: '4px', cursor: 'pointer', lineHeight: '0' });
            button.addEventListener('mouseover', () => { button.style.backgroundColor = '#1a3f8b'; });
            button.addEventListener('mouseout', () => { button.style.backgroundColor = '#555'; });
        });
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        const top = lastMousePosition.y + contents.window.scrollY - menuHeight - 15;
        let left = lastMousePosition.x + contents.window.scrollX - (menuWidth / 2);
        if (left < 5) left = 5;
        if (left + menuWidth > contents.window.innerWidth) left = contents.window.innerWidth - menuWidth - 5;
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;

        contents.document.getElementById('highlight-btn-inj').addEventListener('click', () => {
            rendicao.annotations.highlight(cfiRange, {}, (e) => { }, "highlight", { "fill": "yellow" });
            menu.remove();
        });

        contents.document.getElementById('copy-btn-inj').addEventListener('click', () => {
            navigator.clipboard.writeText(selectedText);
            menu.remove();
        });

        // --- ATUALIZADO: Funcionalidade Anotar agora também salva a nota ---
        contents.document.getElementById('anotar-btn-inj').addEventListener('click', () => {
            const note = prompt("Digite sua anotação para o trecho selecionado:", "");
            if (note && note.trim() !== "") {
                // Salva a anotação no nosso array
                savedAnnotations.push({
                    cfi: cfiRange,
                    text: selectedText,
                    note: note.trim()
                });

                // Adiciona a marcação visual de sublinhado no livro
                rendicao.annotations.underline(cfiRange, { note: note }, (e) => { }, "underline", { "stroke": "blue" });
            }
            menu.remove();
        });

        contents.document.getElementById('dicio-btn-inj').addEventListener('click', () => {
            const dictionaryUrl = `https://www.dicio.com.br/${encodeURIComponent(selectedText.split(' ')[0])}`;
            window.open(dictionaryUrl, '_blank');
            menu.remove();
        });

        contents.document.getElementById('audio-btn-inj').addEventListener('click', () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(selectedText);
                utterance.lang = 'pt-BR';
                window.speechSynthesis.speak(utterance);
            } else {
                alert('Seu navegador não suporta a funcionalidade de áudio.');
            }
            menu.remove();
        });

        menu.addEventListener('click', (e) => e.stopPropagation());
    });

    function applyTheme(contents) {
        if (!contents) return;

        // Remove o estilo do tema antigo para não acumular
        const oldStyle = contents.document.getElementById('theme-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        const style = contents.document.createElement('style');
        style.id = 'theme-style'; // Damos um ID para encontrá-la e removê-la depois

        if (currentTheme === 'sepia') {
            style.innerHTML = `
            body { background-color: #fbf0d9 !important; color: #5b4636 !important; }
            p, a, h1, h2, h3, h4, h5, h6 { color: #5b4636 !important; }
        `;
        } else if (currentTheme === 'noturno') {
            style.innerHTML = `
            body { background-color: #121212 !important; color: #E0E0E0 !important; }
            p, a, h1, h2, h3, h4, h5, h6 { color: #E0E0E0 !important; }
        `;
        } else {
            // Para o tema 'claro', não precisamos de regras extras, pois ao remover o estilo antigo,
            // ele volta ao padrão.
            return;
        }

        contents.document.head.appendChild(style);
    }


} else {
    tituloEl.textContent = "Erro";
    leitorEl.innerHTML = "<h3>Nenhum livro selecionado.</h3>";
}