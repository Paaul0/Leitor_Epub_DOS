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
const searchInput = document.getElementById('search-input');
const closeSearchBtn = document.getElementById('close-search-btn');
const btnMenu = document.getElementById('btn-menu');
const infoLivEl = document.querySelector('.info_liv');

let currentTheme = 'claro';
let currentBookContents = null;

let savedAnnotations = [];

btnSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = btnSearch.getBoundingClientRect();
    searchBar.style.top = `${rect.bottom + window.scrollY + 5}px`;
    searchBar.style.left = `${rect.left + window.scrollX - (searchBar.offsetWidth / 2) + (rect.width / 2)}px`;
    searchBar.classList.toggle('visible');
    if (searchBar.classList.contains('visible')) {
        searchInput.focus();
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

    const doSearch = (q) => {
        rendicao.annotations.remove(null, "search-highlight");
        return Promise.all(
            livro.spine.spineItems.map(item =>
                item.load(livro.load.bind(livro))
                    .then(item.find.bind(item, q))
                    .finally(item.unload.bind(item))
            )
        ).then(results => Promise.resolve([].concat.apply([], results)));
    };

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                doSearch(query).then((results) => {
                    if (results.length > 0) {
                        const firstResultCfi = results[0].cfi;
                        rendicao.display(firstResultCfi).then(() => {
                            rendicao.annotations.highlight(firstResultCfi, {}, (e) => {
                                console.error("Erro ao grifar:", e);
                            }, "search-highlight", {"fill": "orange"});
                        });
                    } else {
                        alert("Nenhum resultado encontrado.");
                    }
                });
            }
        }
    });
    
    const menuModal = document.getElementById('menu-modal');
    const closeMenuModalBtn = document.getElementById('close-menu-modal-btn');
    const menuChapterTitle = document.getElementById('menu-chapter-title');
    const panelSumario = document.getElementById('panel-sumario');

    function renderNotesPanel() {
        const panelContainer = document.getElementById('panel-notas');
        panelContainer.innerHTML = ''; 

        if (savedAnnotations.length === 0) {
            panelContainer.innerHTML = '<p style="text-align: center; color: #888;">Você ainda não fez nenhuma anotação ou grifo.</p>';
        } else {
            const notesList = document.createElement('div');
            savedAnnotations.forEach(annotation => {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                const noteText = document.createElement('blockquote');
                noteText.className = 'note-text';
                noteText.textContent = `"${annotation.text}"`;
                noteItem.appendChild(noteText);
                if(annotation.note) {
                    const noteComment = document.createElement('p');
                    noteComment.className = 'note-comment';
                    noteComment.textContent = annotation.note;
                    noteItem.appendChild(noteComment);
                }
                noteItem.addEventListener('click', () => {
                    rendicao.display(annotation.cfi);
                    menuModal.classList.remove('visible');
                });
                notesList.appendChild(noteItem);
            });
            panelContainer.appendChild(notesList);
        }
        
        const exportButton = document.createElement('button');
        exportButton.id = 'export-notes-btn';
        exportButton.textContent = 'Exportar Notas e Grifos';
        exportButton.style.marginTop = '20px';
        exportButton.style.padding = '10px';
        exportButton.style.width = '100%';
        exportButton.style.cursor = 'pointer';
        exportButton.onclick = exportNotes;
        panelContainer.appendChild(exportButton);

        if (savedAnnotations.length === 0) {
            exportButton.style.display = 'none';
        }
    }
    
    const exportNotes = () => {
        if(savedAnnotations.length === 0) {
            alert("Não há notas ou grifos para exportar.");
            return;
        }
        const bookTitle = livro.packaging.metadata.title || "livro-desconhecido";
        let markdownContent = `# Notas e Grifos do Livro: ${bookTitle}\n\n`;
        savedAnnotations.forEach(ann => {
            if(ann.type === 'highlight') {
                markdownContent += `## Grifo\n`;
                markdownContent += `> ${ann.text}\n\n`;
            } else if (ann.type === 'annotation') {
                markdownContent += `## Anotação\n`;
                markdownContent += `> ${ann.text}\n\n`;
                markdownContent += `**Nota:** ${ann.note}\n\n`;
            }
            markdownContent += "---\n\n";
        });
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notas-${bookTitle.replace(/\s+/g, '-').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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
            currentTheme = radio.value;
            applyTheme(currentBookContents);
        });
    });

    livro.ready.then(() => {
    const { title, creator, pubdate } = livro.packaging.metadata;
    tituloEl.textContent = title;
    document.title = title;
    let infoHtml = `<p class="book-title">${title || 'Título desconhecido'}</p>`;
    if (creator) {
        infoHtml += `<p class="book-author">Por: ${creator}</p>`;
    }
    if (pubdate) {
        infoHtml += `<p class="book-publisher">Publicado em: ${pubdate}</p>`;
    }
    infoLivEl.innerHTML = infoHtml;
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
        const style = contents.document.createElement('style');
        style.innerHTML = `p { margin-bottom: 1.5em; } ::selection { background-color: #D3D3D3; }`;
        contents.document.head.appendChild(style);
        currentBookContents = contents;
        applyTheme(contents);
        contents.window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
                rendicao.prev();
            } else if (event.key === 'ArrowRight') {
                rendicao.next();
            }
        });
        contents.window.addEventListener('mousemove', (event) => { lastMousePosition = { x: event.clientX, y: event.clientY }; });
        contents.window.addEventListener('click', (event) => {
            const existingMenu = contents.document.getElementById('injected-context-menu');
            if (existingMenu && !existingMenu.contains(event.target)) { existingMenu.remove(); }
        });
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            rendicao.prev();
        } else if (event.key === 'ArrowRight') {
            rendicao.next();
        }
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
        const top = lastMousePosition.y + contents.window.scrollY - menuHeight - -67;
        let left = lastMousePosition.x + contents.window.scrollX - (menuWidth / 2);
        if (left < 5) left = 5;
        if (left + menuWidth > contents.window.innerWidth) left = contents.window.innerWidth - menuWidth - 5;
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;

        contents.document.getElementById('highlight-btn-inj').addEventListener('click', () => {
            savedAnnotations.push({ cfi: cfiRange, text: selectedText, note: null, type: 'highlight' });
            rendicao.annotations.highlight(cfiRange, {}, (e) => { }, "highlight", { "fill": "yellow" });
            menu.remove();
        });

        // --- CORREÇÃO DA FUNÇÃO DE COPIAR ---
        contents.document.getElementById('copy-btn-inj').addEventListener('click', () => {
            // Usa a API moderna se estiver disponível (HTTPS/Localhost)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(selectedText).then(() => {
                    // Opcional: mostrar um feedback de sucesso
                }).catch(err => {
                    console.error('Falha ao copiar com a API moderna:', err);
                });
            } else {
                // Usa o método antigo como fallback (HTTP/IP)
                const textArea = contents.document.createElement("textarea");
                textArea.value = selectedText;
                textArea.style.position = "fixed";  // Previne "rolagem" da tela
                textArea.style.top = "-9999px";
                textArea.style.left = "-9999px";
                contents.document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    contents.document.execCommand('copy');
                } catch (err) {
                    console.error('Falha ao copiar com o método antigo:', err);
                }
                contents.document.body.removeChild(textArea);
            }
            menu.remove();
        });

        contents.document.getElementById('anotar-btn-inj').addEventListener('click', () => {
            const note = prompt("Digite sua anotação para o trecho selecionado:", "");
            if (note && note.trim() !== "") {
                savedAnnotations.push({ cfi: cfiRange, text: selectedText, note: note.trim(), type: 'annotation' });
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
        const oldStyle = contents.document.getElementById('theme-style');
        if (oldStyle) {
            oldStyle.remove();
        }
        const style = contents.document.createElement('style');
        style.id = 'theme-style';
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
            return;
        }
        contents.document.head.appendChild(style);
    }

} else {
    tituloEl.textContent = "Erro";
    leitorEl.innerHTML = "<h3>Nenhum livro selecionado.</h3>";
}