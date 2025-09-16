document.addEventListener('DOMContentLoaded', function() {
    // Seleciona TODOS os contêineres de dropdown na página
    const dropdowns = document.querySelectorAll('.dropdown');

    // Se não encontrar nenhum dropdown, não faz nada
    if (dropdowns.length === 0) {
        return;
    }

    // Adiciona a funcionalidade para cada dropdown encontrado
    dropdowns.forEach(function(dropdown) {
        const btn = dropdown.querySelector('.dropdown-btn');
        const content = dropdown.querySelector('.dropdown-content');

        if (btn && content) {
            btn.addEventListener('click', function(event) {
                // Impede que o clique se propague e feche o menu imediatamente
                event.stopPropagation();

                // Fecha TODOS os outros dropdowns abertos antes de abrir o atual
                closeAllDropdowns(content);

                // Abre ou fecha o dropdown ATUAL
                content.classList.toggle('show');
            });
        }
    });

    // Função para fechar todos os dropdowns
    function closeAllDropdowns(exceptThisOne = null) {
        document.querySelectorAll('.dropdown-content').forEach(function(content) {
            // Se não for o dropdown que acabamos de clicar, fecha ele
            if (content !== exceptThisOne) {
                content.classList.remove('show');
            }
        });
    }

    // Listener global para fechar os menus ao clicar fora
    window.addEventListener('click', function() {
        closeAllDropdowns();
    });
});