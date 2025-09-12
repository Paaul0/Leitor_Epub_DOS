const parametros = new URLSearchParams(window.location.search);
const caminhoDoLivro = parametros.get('livro');

// VARIÁVEIS PARA CONTROLE DA PESQUISA
let searchResults = [];
let currentSearchIndex = 0;
let currentSearchHighlightCfi = null;

// ESPERA O HTML ESTAR COMPLETAMENTE CARREGADO ANTES DE EXECUTAR O JAVASCRIPT
document.addEventListener('DOMContentLoaded', function () {

    const ICON_PLAY = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDhweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSI0OHB4IiBmaWxsPSIjNUI1QjVCIj48cGF0aCBkPSJNMzIwLTIwMFYtNzYwbDQ0MCAyODBMMzIwLTIwMFoiLz48L3N2Zz4=" alt="Play">';
    const ICON_STOP = '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDhweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSI0OHB4IiBmaWxsPSIjNUI1QjVCIj48cGF0aCBkPSJNMzIwLTIwMHYtNTYwaDU2MHY1NjBIMzIwWiIvPjwvc3ZnPg==" alt="Stop">';

    // Variáveis para controlar o estado da leitura
    let isReading = false;
    let speechQueue = [];
    let currentSpeechIndex = 0;
    let currentSpeechRate = 1.0;

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
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnShowSidebar = document.getElementById('btn-show-sidebar');
    const btnLerLivro = document.getElementById('btn-ler-livro');
    const speechSpeedControl = document.getElementById('speech-speed-control');
    const btnKindleExibicao = document.getElementById('btn-kindle-exibicao');

    // Seletores para o Lightbox
    const imageLightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.querySelector('.close-lightbox');

    // Seletores do Menu de Contexto
    const btnToggleFixedMenu = document.getElementById('btn-toggle-fixed-menu');
    const fixedContextMenu = document.getElementById('fixed-context-menu');
    const btnHighlightFixed = document.getElementById('fixed-highlight-btn');
    const btnCopyFixed = document.getElementById('fixed-copy-btn');
    const btnAnnotateFixed = document.getElementById('fixed-anotar-btn');
    const btnDictionaryFixed = document.getElementById('fixed-dicio-btn');
    const btnAudioFixed = document.getElementById('fixed-audio-btn');

    // Seletores para os botões de pesquisa
    const searchResultsInfo = document.getElementById('search-results-info');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');

    // Variáveis de estado
    let lastCfiRange = null;
    let lastSelectedText = "";
    let currentTheme = 'claro';
    let currentBookContents = null;
    let savedAnnotations = [];

    if (btnToggleFixedMenu) {
        btnToggleFixedMenu.addEventListener('click', (event) => {
            event.stopPropagation();
            fixedContextMenu.classList.toggle('collapsed');
            const isCollapsed = fixedContextMenu.classList.contains('collapsed');
            btnToggleFixedMenu.setAttribute('title', isCollapsed ? 'Expandir menu' : 'Recolher menu');
        });
    }

    if (caminhoDoLivro) {
        const livro = ePub(caminhoDoLivro, { JSZip: window.JSZip });
        const rendicao = livro.renderTo("leitor", { width: "100%", height: "100%", spread: "none", allowScriptedContent: true });

        const sendBookToKindle = () => {
            const kindleEmail = prompt("Por favor, digite seu e-mail do Kindle (ex: seu_nome@kindle.com):", "");

            if (kindleEmail === null || kindleEmail.trim() === "") {
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(kindleEmail)) {
                alert("Formato de e-mail inválido. Por favor, tente novamente.");
                return;
            }

            const bookTitle = livro.packaging.metadata.title || "Livro sem título";

            const dataForBackend = {
                to_email: kindleEmail,
                book_path: caminhoDoLivro
            };

            console.log("--- SIMULANDO ENVIO DO LIVRO PARA O KINDLE ---");
            console.log("Dados que seriam enviados para o back-end:", dataForBackend);

            alert(`O livro "${bookTitle}" seria enviado para ${kindleEmail}.\n\n(Esta é uma simulação. Verifique o console do desenvolvedor para ver os dados).`);
        };

        if (btnKindleExibicao) {
            btnKindleExibicao.addEventListener('click', sendBookToKindle);
        }

        const doSearch = (q) => {
            return Promise.all(
                livro.spine.spineItems.map(item =>
                    item.load(livro.load.bind(livro))
                        .then(item.find.bind(item, q))
                        .finally(item.unload.bind(item))
                )
            ).then(results => Promise.resolve([].concat.apply([], results)));
        };

        function closeAndClearSearch() {
            searchBar.classList.remove('visible');
            currentSearchHighlightCfi = null;

            const contents = rendicao.getContents()[0];
            if (contents) {
                const highlightElement = contents.document.querySelector('g.search-highlight');
                if (highlightElement) {
                    highlightElement.style.display = 'none';
                }
            }
            searchResults = [];
            currentSearchIndex = 0;
            searchResultsInfo.textContent = "";
            searchPrevBtn.disabled = true;
            searchNextBtn.disabled = true;
            searchInput.value = "";
        }

        function displaySearchResult() {
            if (searchResults.length === 0) return;
            const cfi = searchResults[currentSearchIndex].cfi;
            currentSearchHighlightCfi = cfi;
            rendicao.display(cfi);

            searchResultsInfo.textContent = `${currentSearchIndex + 1} de ${searchResults.length}`;
            searchPrevBtn.disabled = currentSearchIndex === 0;
            searchNextBtn.disabled = currentSearchIndex >= searchResults.length - 1;
        }

        btnSearch.addEventListener('click', (e) => {
            e.stopPropagation();
            searchBar.classList.toggle('visible');

            if (searchBar.classList.contains('visible')) {
                searchInput.focus();
            } else {
                closeAndClearSearch();
            }
        });

        closeSearchBtn.addEventListener('click', closeAndClearSearch);

        document.addEventListener('click', (e) => {
            if (!searchBar.contains(e.target) && !btnSearch.contains(e.target) && searchBar.classList.contains('visible')) {
                closeAndClearSearch();
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    doSearch(query).then((results) => {
                        searchResults = results;
                        currentSearchIndex = 0;
                        if (results.length > 0) {
                            displaySearchResult();
                        } else {
                            searchResultsInfo.textContent = "Nenhum resultado";
                            searchPrevBtn.disabled = true;
                            searchNextBtn.disabled = true;
                        }
                    });
                }
            }
        });

        searchPrevBtn.addEventListener('click', () => {
            if (currentSearchIndex > 0) {
                currentSearchIndex--;
                displaySearchResult();
            }
        });

        searchNextBtn.addEventListener('click', () => {
            if (currentSearchIndex < searchResults.length - 1) {
                currentSearchIndex++;
                displaySearchResult();
            }
        });

        const menuModal = document.getElementById('menu-modal');
        const closeMenuModalBtn = document.getElementById('close-menu-modal-btn');
        const menuChapterTitle = document.getElementById('menu-chapter-title');
        const panelSumario = document.getElementById('panel-sumario');

        const exportNotes = () => {
            if (savedAnnotations.length === 0) {
                alert("Não há notas ou grifos para exportar.");
                return;
            }
            const bookTitle = livro.packaging.metadata.title || "livro-desconhecido";
            let textContent = `Notas e Grifos do Livro: ${bookTitle}\n\n========================================\n\n`;

            savedAnnotations.forEach(ann => {
                if (ann.type === 'highlight') {
                    textContent += `Tipo: Grifo\nTexto: "${ann.text}"\n\n`;
                } else if (ann.type === 'annotation') {
                    textContent += `Tipo: Anotação\nTexto: "${ann.text}"\nNota: ${ann.note}\n\n`;
                }
                textContent += "----------------------------------------\n\n";
            });

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `notas-${bookTitle.replace(/\s+/g, '-').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        function renderNotesPanel() {
            const panelContainer = document.getElementById('panel-notas');
            panelContainer.innerHTML = '';
            const hasNotes = savedAnnotations.length > 0;

            if (hasNotes) {
                const notesList = document.createElement('div');
                savedAnnotations.forEach(annotation => {
                    const noteItem = document.createElement('div');
                    noteItem.className = 'note-item';
                    const noteText = document.createElement('blockquote');
                    noteText.className = 'note-text';
                    noteText.textContent = `"${annotation.text}"`;
                    noteItem.appendChild(noteText);
                    if (annotation.note) {
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
            } else {
                panelContainer.innerHTML = '<p style="text-align: center; color: #888;">Você ainda não fez nenhuma anotação ou grifo.</p>';
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

            if (!hasNotes) {
                exportButton.disabled = true;
            }
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

        const layoutRadios = document.querySelectorAll('input[name="layout"]');
        layoutRadios.forEach(radio => {
            radio.addEventListener('click', () => {
                const newSpread = radio.value;
                rendicao.spread(newSpread);
            });
        });

        livro.ready.then(() => {
            const { title, creator, pubdate } = livro.packaging.metadata;
            tituloEl.textContent = title;
            document.title = title;
            let infoHtml = `<p class="book-title">${title || 'Título desconhecido'}</p>`;
            if (creator) infoHtml += `<p class="book-author">Por: ${creator}</p>`;
            if (pubdate) infoHtml += `<p class="book-publisher">Publicado em: ${pubdate}</p>`;
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

            rendicao.on("relocated", (location) => {
                if (location.start && livro.locations && livro.locations.length() > 0) {
                    const percentage = Math.floor(livro.locations.percentageFromCfi(location.start.cfi) * 100);
                    progressoInfo.textContent = `Progresso: ${percentage}%`;
                }
                // MUDANÇA: A chamada para reaplicarAnotacoes() foi REMOVIDA daqui
            });

            // A função de reaplicar os grifos agora é chamada apenas aqui
            rendicao.on("displayed", () => reaplicarAnotacoes());
            
            return livro.locations.generate(1024);
        }).then(() => {
            rendicao.display();
        });


        btnAnterior.addEventListener("click", () => rendicao.prev());
        btnProximo.addEventListener("click", () => rendicao.next());

        function deactivateFixedMenu() {
            lastCfiRange = null;
            lastSelectedText = "";
            fixedContextMenu.classList.remove('active');
        }

        rendicao.on("selected", (cfiRange, contents) => {
            lastCfiRange = cfiRange;
            lastSelectedText = contents.window.getSelection().toString().trim();
            if (lastSelectedText.length > 0) {
                fixedContextMenu.classList.add('active');
            } else {
                deactivateFixedMenu();
            }
        });

        rendicao.on("deselected", () => {
            deactivateFixedMenu();
        });

        btnHighlightFixed.addEventListener('click', () => {
            if (!lastCfiRange) return;
            const grifoExistente = savedAnnotations.some(ann => ann.cfi === lastCfiRange);
            if (!grifoExistente) {
                savedAnnotations.push({ cfi: lastCfiRange, text: lastSelectedText, note: null, type: 'highlight' });
                rendicao.annotations.highlight(lastCfiRange, {}, (e) => { }, "highlight", { "fill": "yellow" });
            }
            rendicao.getContents()[0].window.getSelection().removeAllRanges();
            deactivateFixedMenu();
        });

        btnCopyFixed.addEventListener('click', () => {
            if (!lastSelectedText) return;
            navigator.clipboard.writeText(lastSelectedText);
            rendicao.getContents()[0].window.getSelection().removeAllRanges();
            deactivateFixedMenu();
        });

        btnAnnotateFixed.addEventListener('click', () => {
            if (!lastCfiRange) return;
            const note = prompt("Digite sua anotação para o trecho selecionado:", "");
            if (note && note.trim() !== "") {
                savedAnnotations.push({ cfi: lastCfiRange, text: lastSelectedText, note: note.trim(), type: 'annotation' });
                rendicao.annotations.underline(lastCfiRange, { note: note }, (e) => { }, "underline", { "stroke": "blue" });
            }
            rendicao.getContents()[0].window.getSelection().removeAllRanges();
            deactivateFixedMenu();
        });

        btnDictionaryFixed.addEventListener('click', () => {
            if (!lastSelectedText) return;
            const dictionaryUrl = `https://www.dicio.com.br/${encodeURIComponent(lastSelectedText.split(' ')[0])}`;
            window.open(dictionaryUrl, '_blank');
            rendicao.getContents()[0].window.getSelection().removeAllRanges();
            deactivateFixedMenu();
        });

        btnAudioFixed.addEventListener('click', () => {
            if (!lastSelectedText) return;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(lastSelectedText);
                utterance.lang = 'pt-BR';
                window.speechSynthesis.speak(utterance);
            } else {
                alert('O seu navegador não suporta a funcionalidade de áudio.');
            }
            rendicao.getContents()[0].window.getSelection().removeAllRanges();
            deactivateFixedMenu();
        });

        rendicao.hooks.content.register((contents) => {
            const fontLink = contents.document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,700;1,7..72,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap';
            contents.document.head.appendChild(fontLink);

            const style = contents.document.createElement('style');
            style.innerHTML = ` img, svg { max-width: 100% !important; height: auto !important; object-fit: contain; cursor: pointer; } p { margin-bottom: 1.5em; } ::selection { background-color: #D3D3D3; } g.search-highlight { display: none; }`;
            contents.document.head.appendChild(style);
            currentBookContents = contents;
            applyTheme(contents);

            contents.window.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') rendicao.prev();
                else if (event.key === 'ArrowRight') rendicao.next();
            });

            contents.window.addEventListener('mousedown', () => {
                setTimeout(() => {
                    const selection = contents.window.getSelection();
                    if (!selection || selection.toString().trim().length === 0) {
                        deactivateFixedMenu();
                    }
                }, 10);
            });

            const images = contents.document.querySelectorAll('img');
            images.forEach(img => {
                img.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (imageLightbox && lightboxImg) {
                        lightboxImg.src = img.src;
                        imageLightbox.style.display = 'flex';
                    }
                });
            });

            if (closeLightboxBtn) {
                closeLightboxBtn.addEventListener('click', () => {
                    imageLightbox.style.display = 'none';
                });
            }

            if (imageLightbox) {
                imageLightbox.addEventListener('click', (event) => {
                    if (event.target === imageLightbox) {
                        imageLightbox.style.display = 'none';
                    }
                });
            }

        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') rendicao.prev();
            else if (event.key === 'ArrowRight') rendicao.next();
        });

        function applyTheme(contents) {
            const header = document.querySelector('.titulo');
            const footer = document.querySelector('.progresso');
            const mainReaderArea = document.querySelector('.leitor');
            const footerButtons = footer.querySelectorAll('button');
            const footerText = footer.querySelector('#progresso-info');
            const uiThemes = {
                claro: { bg: '#FFFFFF', text: '#000000', border: '#ddd', buttonBg: '#f0f0f0' },
                sepia: { bg: '#fbf0d9', text: '#5b4636', border: '#e9e0cb', buttonBg: '#f4e8d1' },
                noturno: { bg: '#383B43', text: '#E0E0E0', border: '#4a4e59', buttonBg: '#4a4e59' }
            };
            const bookThemes = {
                claro: { bg: '#FFFFFF', text: '#000000' },
                sepia: { bg: '#fbf0d9', text: '#5b4636' },
                noturno: { bg: '#383B43', text: '#E0E0E0' }
            };
            const selectedUiTheme = uiThemes[currentTheme];
            const selectedBookTheme = bookThemes[currentTheme];
            if (header) {
                header.style.backgroundColor = selectedUiTheme.bg;
                header.style.borderColor = selectedUiTheme.border;
                if (header.querySelector('p')) {
                    header.querySelector('p').style.color = selectedUiTheme.text;
                }
            }
            if (footer) {
                footer.style.backgroundColor = selectedUiTheme.bg;
                footer.style.borderColor = selectedUiTheme.border;
                if (footerText) footerText.style.color = selectedUiTheme.text;
                footerButtons.forEach(button => {
                    button.style.backgroundColor = selectedUiTheme.buttonBg;
                    button.style.color = selectedUiTheme.text;
                    button.style.borderColor = selectedUiTheme.border;
                });
            }
            if (mainReaderArea) {
                mainReaderArea.style.backgroundColor = selectedBookTheme.bg;
            }
            if (contents) {
                const oldStyle = contents.document.getElementById('theme-style');
                if (oldStyle) oldStyle.remove();

                if (currentTheme !== 'claro') {
                    const style = contents.document.createElement('style');
                    style.id = 'theme-style';

                    let themeStyles = `
                        body {
                            background-color: ${selectedBookTheme.bg} !important;
                            color: ${selectedBookTheme.text} !important;
                        }
                        p, a, h1, h2, h3, h4, h5, h6, li, span {
                            color: ${selectedBookTheme.text} !important;
                        }
                    `;

                    if (currentTheme === 'noturno') {
                        themeStyles += `
                            .expediente *, .sumario *, .toc *, .credits *, .sumario-secao * {
                                color: #1E1E1E !important;
                            }
                        `;
                    }

                    style.innerHTML = themeStyles;
                    contents.document.head.appendChild(style);
                }
            }
        }

        if (btnLerLivro) btnLerLivro.innerHTML = ICON_PLAY;

        function playNextChunk() {
            if (!isReading || currentSpeechIndex >= speechQueue.length) { resetSpeechState(); return; }
            const chunk = speechQueue[currentSpeechIndex];
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.lang = 'pt-BR';
            utterance.rate = currentSpeechRate;
            utterance.onend = () => { currentSpeechIndex++; playNextChunk(); };
            utterance.onerror = (event) => { console.error("Erro na síntese de voz:", event.error); resetSpeechState(); };
            window.speechSynthesis.speak(utterance);
        }

        function resetSpeechState() {
            isReading = false;
            speechQueue = [];
            currentSpeechIndex = 0;
            if (btnLerLivro) { btnLerLivro.innerHTML = ICON_PLAY; btnLerLivro.title = "Ler o livro em voz alta"; }
        }

        async function startReadingBook() {
            if (isReading) { window.speechSynthesis.cancel(); resetSpeechState(); return; }
            const originalLocation = rendicao.currentLocation();
            isReading = true;
            btnLerLivro.disabled = true;
            btnLerLivro.innerHTML = '<p style="font-size:10px; text-align:center;">Preparando áudio...</p>';
            try {
                let fullText = "";
                for (const section of livro.spine.spineItems) {
                    await rendicao.display(section.href);
                    const contents = rendicao.getContents()[0];
                    if (contents && contents.document && contents.document.body) {
                        const text = contents.document.body.textContent;
                        if (text) fullText += text.trim() + " \n ";
                    }
                }
                rendicao.display(originalLocation.start.cfi);
                const cleanedText = fullText.trim();
                if (cleanedText.length > 0) {
                    speechQueue = cleanedText.split(/[\n.]+/).filter(chunk => chunk.trim().length > 0);
                    currentSpeechIndex = 0;
                    if (btnLerLivro) { btnLerLivro.innerHTML = ICON_STOP; btnLerLivro.title = "Parar leitura"; }
                    playNextChunk();
                } else { alert("Não foi possível extrair texto do livro com este método."); resetSpeechState(); }
            } catch (error) {
                console.error("Erro durante a navegação para extração de texto:", error);
                alert("Ocorreu um erro ao navegar pelo livro para extrair o texto.");
                resetSpeechState();
                rendicao.display(originalLocation.start.cfi);
            } finally { btnLerLivro.disabled = false; }
        }

        if (btnLerLivro) btnLerLivro.addEventListener('click', startReadingBook);
        if (speechSpeedControl) { speechSpeedControl.addEventListener('change', (event) => { currentSpeechRate = parseFloat(event.target.value); }); }
        window.addEventListener('beforeunload', () => { if (isReading) window.speechSynthesis.cancel(); });

        function reaplicarAnotacoes() {
            rendicao.annotations.remove(null, "highlight");
            rendicao.annotations.remove(null, "underline");
            savedAnnotations.forEach(ann => {
                if (ann.type === 'highlight') {
                    rendicao.annotations.highlight(ann.cfi, {}, (e) => { }, "highlight", { "fill": "yellow" });
                } else if (ann.type === 'annotation') {
                    rendicao.annotations.underline(ann.cfi, { note: ann.note }, (e) => { }, "underline", { "stroke": "blue" });
                }
            });

            if (currentSearchHighlightCfi) {
                rendicao.annotations.highlight(currentSearchHighlightCfi, {}, (e) => { }, "search-highlight", { "fill": "orange", "fill-opacity": "0.5", "stroke": "orange" });
                setTimeout(() => {
                    const contents = rendicao.getContents()[0];
                    if (contents) {
                        const highlightElement = contents.document.querySelector('g.search-highlight');
                        if (highlightElement) {
                            highlightElement.style.display = 'block';
                        }
                    }
                }, 10);
            }
        }

        if (btnToggleSidebar) {
            btnToggleSidebar.addEventListener('click', () => {
                document.body.classList.add('sidebar-collapsed');
                setTimeout(() => { if (rendicao) rendicao.resize(); }, 400);
            });
        }

        if (btnShowSidebar) {
            btnShowSidebar.addEventListener('click', () => {
                document.body.classList.remove('sidebar-collapsed');
                setTimeout(() => { if (rendicao) rendicao.resize(); }, 400);
            });
        }
    } else {
        tituloEl.textContent = "Erro";
        leitorEl.innerHTML = "<h3>Nenhum livro selecionado.</h3>";
    }

});