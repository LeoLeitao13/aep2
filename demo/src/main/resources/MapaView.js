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

            if (rotaLayer) map.removeLayer(rotaLayer);
            document.querySelector('#rotasContainer')?.remove();

            const container = document.createElement('div');
            container.id = 'rotasContainer';
            container.innerHTML = "<h4>Rotas Encontradas</h4>";
            container.style.marginTop = "20px";

            if (!window.rotasAlternativas) window.rotasAlternativas = [];
            if (!window.avaliacoesFakes) window.avaliacoesFakes = [];

            const feedContent = document.getElementById('feedContent');
            feedContent.innerHTML = '';

            data.routes.slice(0, 2).forEach((route, index) => {
                const coords = route.geometry.coordinates.map(p => [p[1], p[0]]);
                const polyline = L.polyline(coords, { color: index === 0 ? 'blue' : 'green' }).addTo(map);

                const distanciaKm = (route.distance / 1000).toFixed(2);
                const duracaoMin = (route.duration / 60).toFixed(0);

                const rotaCard = document.createElement('div');
                rotaCard.className = 'post';
                rotaCard.innerHTML = `
                    <div><strong>Rota ${index === 0 ? "A" : "B"}:</strong> ${distanciaKm} km – ${duracaoMin} min</div>
                    <button onclick="destacarRota(${index})">Selecionar Rota ${index === 0 ? "A" : "B"}</button>
                `;
                container.appendChild(rotaCard);

                window.rotasAlternativas[index] = polyline;

                const avaliacoes = [];
                for (let i = 0; i < 4; i++) {
                    const seg = +(Math.random() * 2 + 3).toFixed(1);
                    const ilu = +(Math.random() * 2 + 3).toFixed(1);
                    const traf = +(Math.random() * 2 + 3).toFixed(1);
                    avaliacoes.push({ seguranca: seg, iluminacao: ilu, trafego: traf });
                }

                const rotaId = index === 0 ? "A" : "B";
                window.avaliacoesFakes[rotaId] = avaliacoes;

                if (window.javaConnector && window.javaConnector.receberAvaliacoesFake) {
                    window.javaConnector.receberAvaliacoesFake(JSON.stringify({
                        rota: rotaId,
                        avaliacoes: avaliacoes
                    }));
                }

                avaliacoes.forEach((av, iFake) => {
                    const post = document.createElement('div');
                    post.className = 'post';
                    post.setAttribute('data-rota', rotaId);
                    post.innerHTML = `
                        <div class="header-post">
                            <img src="img.png" alt="Usuário">
                            <span>Usuário ${iFake + 1} (Rota ${rotaId})</span>
                        </div>
                        <div class="content">
                            Segurança: ${av.seguranca} | Iluminação: ${av.iluminacao} | Tráfego: ${av.trafego}
                        </div>
                    `;
                    feedContent.appendChild(post);
                });
            });

            const wrapper = document.getElementById('cardsRotasWrapper');
            if (wrapper) {
                wrapper.innerHTML = '';
                wrapper.appendChild(container);
            }
        })
        .catch(error => console.error("Erro ao calcular rota:", error));
}

function destacarRota(index) {
    if (!window.rotasAlternativas) return;

    window.rotasAlternativas.forEach((rota, i) => {
        rota.setStyle({ color: i === index ? 'red' : (i === 0 ? 'blue' : 'green') });
    });

    const rotaId = index === 0 ? 'A' : 'B';
    console.log("🧭 Rota selecionada:", rotaId);

    const titulo = document.getElementById('tituloAvaliacaoRota');
    titulo.textContent = `📍 Avaliações para a Rota ${rotaId}`;

    const avaliacaoArea = document.getElementById('avaliacaoArea');
    avaliacaoArea.style.display = 'block';

    const infoRota = document.getElementById('infoRotaSelecionada');
    infoRota.textContent = `📝 Você está avaliando a Rota ${rotaId}`;

    document.getElementById('enviarAvaliacaoBtn').disabled = false;
    window.rotaSelecionada = rotaId;

    const posts = document.querySelectorAll('#feedContent .post');
    posts.forEach(post => {
        const rota = post.getAttribute('data-rota');
        post.style.display = rota === rotaId ? 'block' : 'none';
    });
}

function enviarAvaliacao() {
    console.log("Tentando enviar avaliação");

    if (!window.javaConnector || !window.javaConnector.receberAvaliacao) {
        alert("O sistema ainda está carregando. Tente novamente em alguns segundos.");
        return;
    }

    const dados = {
        origem: document.getElementById('origemInput').value || "Coordenada",
        destino: document.getElementById('destinoInput').value || "Coordenada",
        seguranca: document.getElementById('seg').value,
        iluminacao: document.getElementById('ilu').value,
        trafego: document.getElementById('traf').value,
        comentario: document.getElementById('comentario').value || "",
        rota: window.rotaSelecionada || "A"
    };

    if (!dados.seguranca || !dados.iluminacao || !dados.trafego ||
        isNaN(dados.seguranca) || isNaN(dados.iluminacao) || isNaN(dados.trafego) ||
        dados.seguranca < 0 || dados.seguranca > 5 ||
        dados.iluminacao < 0 || dados.iluminacao > 5 ||
        dados.trafego < 0 || dados.trafego > 5) {
        alert("Os valores de segurança, iluminação e tráfego devem estar entre 0 e 5.");
        return;
    }

    try {
        window.javaConnector.receberAvaliacao(JSON.stringify(dados));

        const post = document.createElement('div');
        post.className = 'post';
        post.setAttribute('data-rota', dados.rota);

        post.innerHTML = `
            <div class="header-post">
                <img src="img.png" alt="Usuário">
                <span>Você</span>
            </div>
            <div class="content">
                De ${dados.origem} → ${dados.destino} | Segurança: ${dados.seguranca} | Iluminação: ${dados.iluminacao} | Tráfego: ${dados.trafego}
                ${dados.comentario ? `<p><em>Comentário:</em> ${dados.comentario}</p>` : ""}
            </div>
        `;

        const feedContent = document.getElementById('feedContent');
        feedContent.prepend(post);

        const posts = document.querySelectorAll('#feedContent .post');
        posts.forEach(p => {
            const rota = p.getAttribute('data-rota');
            p.style.display = rota === dados.rota ? 'block' : 'none';
        });

        alert("Avaliação enviada com sucesso!");
    } catch (e) {
        console.error("Erro ao enviar avaliação:", e);
        alert("Erro ao enviar avaliação: " + e.message);
    }
}
