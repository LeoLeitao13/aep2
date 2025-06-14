let bounds = L.latLngBounds(L.latLng(-23.45, -51.97), L.latLng(-23.39, -51.88));
let map = L.map('map', { minZoom: 13, maxZoom: 17, maxBounds: bounds }).setView([-23.4208, -51.9331], 14);
map.on('drag', () => map.panInsideBounds(bounds, { animate: false }));
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

let origem = null, destino = null, rotaLayer = null;

map.on('click', function(e) {
    if (!origem) {
        origem = e.latlng;
        L.marker(origem).addTo(map).bindPopup("Origem").openPopup();
    } else if (!destino) {
        destino = e.latlng;
        L.marker(destino).addTo(map).bindPopup("Destino").openPopup();
        calcularRota();
    }
});

function buscarCoordenadas() {
    const origemTexto = document.getElementById('origemInput').value;
    const destinoTexto = document.getElementById('destinoInput').value;
    Promise.all([geocodificar(origemTexto), geocodificar(destinoTexto)])
        .then(([origemCoord, destinoCoord]) => {
            origem = origemCoord;
            destino = destinoCoord;
            L.marker(origem).addTo(map).bindPopup("Origem").openPopup();
            L.marker(destino).addTo(map).bindPopup("Destino").openPopup();
            map.setView(origem, 14);
            calcularRota();
        })
        .catch(error => console.error("Erro ao geocodificar:", error));
}

function geocodificar(endereco) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
    return fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0 || !data[0].display_name.includes("Maring")) {
                alert("O endereço precisa estar dentro de Maringá - PR.");
                throw new Error("Fora de Maringá");
            }
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        });
}

function calcularRota() {
    const url = `https://router.project-osrm.org/route/v1/foot/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?alternatives=true&overview=full&geometries=geojson`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.routes || data.routes.length < 1) {
                alert("Não foi possível encontrar rotas.");
                return;
            }

            // Limpa rota anterior
            if (rotaLayer) map.removeLayer(rotaLayer);
            document.querySelector('#rotasContainer')?.remove(); // remove cards anteriores

            // Cria container de escolha de rota
            const container = document.createElement('div');
            container.id = 'rotasContainer';
            container.innerHTML = "<h4>Rotas Encontradas</h4>";
            container.style.marginTop = "20px";

            // Exibe no mapa e cria UI para cada rota
            data.routes.slice(0, 2).forEach((route, index) => {
                const coords = route.geometry.coordinates.map(p => [p[1], p[0]]);
                const polyline = L.polyline(coords, { color: index === 0 ? 'blue' : 'green' }).addTo(map);

                const distanciaKm = (route.distance / 1000).toFixed(2);
                const duracaoMin = (route.duration / 60).toFixed(0);

                // Card UI
                const rotaCard = document.createElement('div');
                rotaCard.className = 'post';
                rotaCard.innerHTML = `
                    <div><strong>Rota ${index === 0 ? "A" : "B"}:</strong> ${distanciaKm} km – ${duracaoMin} min</div>
                    <button onclick="destacarRota(${index})">Selecionar Rota ${index === 0 ? "A" : "B"}</button>
                `;

                container.appendChild(rotaCard);

                // Armazena rota
                if (!window.rotasAlternativas) window.rotasAlternativas = [];
                window.rotasAlternativas[index] = polyline;
            });

            document.querySelector('.feed').prepend(container);

            // Gera avaliações simuladas para a primeira rota
            const origemTexto = document.getElementById('origemInput').value || "Coordenada";
            const destinoTexto = document.getElementById('destinoInput').value || "Coordenada";
        })
        .catch(error => console.error("Erro ao calcular rota:", error));
}



function enviarAvaliacao() {
    console.log("Tentando enviar avaliação");
    if (!window.javaConnector || !window.javaConnector.receberAvaliacao) {
        console.error("javaConnector ou receberAvaliacao não disponível");
        alert("O sistema ainda está carregando. Tente novamente em alguns segundos.");
        return;
    }

    const dados = {
        origem: document.getElementById('origemInput').value || "Coordenada",
        destino: document.getElementById('destinoInput').value || "Coordenada",
        seguranca: document.getElementById('seg').value,
        iluminacao: document.getElementById('ilu').value,
        trafego: document.getElementById('traf').value,
        comentario: document.getElementById('comentario').value || ""
    };

    console.log("Dados a enviar:", dados);

    if (!dados.seguranca || !dados.iluminacao || !dados.trafego ||
        isNaN(dados.seguranca) || isNaN(dados.iluminacao) || isNaN(dados.trafego) ||
        dados.seguranca < 0 || dados.seguranca > 5 ||
        dados.iluminacao < 0 || dados.iluminacao > 5 ||
        dados.trafego < 0 || dados.trafego > 5) {
        alert("Os valores de segurança, iluminação e tráfego devem estar entre 0 e 5.");
        return;
    }

    try {
        // Envia para o Java
        window.javaConnector.receberAvaliacao(JSON.stringify(dados));
        console.log("Avaliação enviada com sucesso para Java");

        // Atualiza imediatamente o front
        const post = document.createElement('div');
        post.className = 'post';
        post.innerHTML = `
  <div class="header-post">
    <img src="https://via.placeholder.com/30" alt="Usuário">
    <span>Usuário</span>
  </div>
  <div class="content">
    De ${dados.origem} → ${dados.destino} | Segurança: ${dados.seguranca} | Iluminação: ${dados.iluminacao} | Tráfego: ${dados.trafego}
    ${dados.comentario ? `<p><em>Comentário:</em> ${dados.comentario}</p>` : ""}
  </div>
`;
        document.getElementById('feedContent').prepend(post);

        alert("Avaliação enviada com sucesso!");
    } catch (e) {
        console.error("Erro ao enviar avaliação:", e);
        alert("Erro ao enviar avaliação: " + e.message);
    }
}

function updateFeed(avaliacoesJson) {
    console.log("Entrando em updateFeed com JSON recebido:", avaliacoesJson);
    const feedContent = document.getElementById('feedContent');
    if (!feedContent) {
        console.error("Elemento feedContent não encontrado!");
        return;
    }
    feedContent.innerHTML = ''; // Limpa o feed
    try {
        const avaliacoes = JSON.parse(avaliacoesJson);
        console.log("Avaliações parseadas:", avaliacoes);
        if (avaliacoes.length === 0) {
            feedContent.innerHTML = "<p>Nenhuma avaliação disponível.</p>";
        } else {
            avaliacoes.forEach(av => {
                const post = document.createElement('div');
                post.className = 'post';
                post.innerHTML = `
          <div class="header-post">
            <img src="https://via.placeholder.com/30" alt="Usuário">
            <span>Usuário</span>
          </div>
          <div class="content">
  De ${av.origem} → ${av.destino} | Segurança: ${av.seguranca} | Iluminação: ${av.iluminacao} | Tráfego: ${av.trafego}
  ${av.comentario ? `<p><em>Comentário:</em> ${av.comentario}</p>` : ""}
</div>
        `;
                feedContent.appendChild(post);
            });
        }
    } catch (e) {
        console.error("Erro ao parsear JSON do feed:", e, "JSON recebido:", avaliacoesJson);
        feedContent.innerHTML = "<p>Erro ao carregar avaliações. JSON inválido.</p>";
    }
    console.log("Feed atualizado. Conteúdo HTML:", feedContent.innerHTML);
}

function onJavaConnectorReady() {
    console.log("JavaConnector pronto, habilitando botões");
    document.getElementById('enviarAvaliacaoBtn').disabled = false;
}

window.addEventListener('load', () => {
    console.log("Página carregada");
    setTimeout(() => map.invalidateSize(), 500);
    const checkConnector = setInterval(() => {
        if (window.javaConnector && window.javaConnector.receberAvaliacao) {
            clearInterval(checkConnector);
            onJavaConnectorReady();
        }
    }, 500);
});
function gerarAvaliacoesSimuladas(origem, destino) {
    const feedContent = document.getElementById('feedContent');
    const nomes = ["Usuário 1", "Usuário 2", "Usuário 3", "Usuário 4"];

    for (let i = 0; i < 4; i++) {
        const seg = (Math.random() * 2 + 3).toFixed(1);  // de 3.0 a 5.0
        const ilu = (Math.random() * 2 + 3).toFixed(1);
        const traf = (Math.random() * 2 + 3).toFixed(1);

        const post = document.createElement('div');
        post.className = 'post';
        post.innerHTML = `
            <div class="header-post">
                <img src="img.png" alt="${nomes[i]}">
                <span>${nomes[i]}</span>
            </div>
            <div class="content">
                De ${origem} → ${destino} | Segurança: ${seg} | Iluminação: ${ilu} | Tráfego: ${traf}
            </div>
        `;
        feedContent.appendChild(post);
    }

    console.log("⚙️ Avaliações simuladas adicionadas para a rota.");
}
function limparMapa() {
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
    });
    origem = null;
    destino = null;
    rotaLayer = null;
    document.getElementById('origemInput').value = '';
    document.getElementById('destinoInput').value = '';

    // 🧹 Limpar o feed visual
    const feedContent = document.getElementById('feedContent');
    feedContent.innerHTML = '';

    console.log("Mapa, campos e avaliações simuladas limpos");
}
function destacarRota(index) {
    if (!window.rotasAlternativas) return;

    // Atualiza cores das rotas
    window.rotasAlternativas.forEach((rota, i) => {
        rota.setStyle({ color: i === index ? 'red' : (i === 0 ? 'blue' : 'green') });
    });

    console.log("🧭 Rota selecionada: ", index === 0 ? "A" : "B");

    // Atualiza título do feed
    const titulo = document.getElementById('tituloAvaliacaoRota');
    titulo.textContent = `📍 Avaliações para a Rota ${index === 0 ? 'A' : 'B'}`;

    // Limpa avaliações anteriores
    const feedContent = document.getElementById('feedContent');
    feedContent.innerHTML = '';

    // Gera avaliações simuladas
    const origemTexto = document.getElementById('origemInput').value || "Coordenada";
    const destinoTexto = document.getElementById('destinoInput').value || "Coordenada";
    gerarAvaliacoesSimuladas(origemTexto, destinoTexto);

    // MOSTRA O FORMULÁRIO DE AVALIAÇÃO (🚀 ESSENCIAL!)
    const avaliacaoArea = document.getElementById('avaliacaoArea');
    avaliacaoArea.style.display = 'block';

    const infoRota = document.getElementById('infoRotaSelecionada');
    infoRota.textContent = `📝 Você está avaliando a Rota ${index === 0 ? 'A' : 'B'}`;

    document.getElementById('enviarAvaliacaoBtn').disabled = false;
    window.rotaSelecionada = index; // se quiser usar depois
}


