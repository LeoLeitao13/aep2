package org.example.demo;

import java.util.*;

public class MapaGrafo {
    private final Map<String, List<Conexao>> adjacencias = new HashMap<>();
    private final Map<String, Trecho> trechos = new HashMap<>();

    public void adicionarTrecho(String origem, String destino, Trecho trecho) {
        adjacencias.computeIfAbsent(origem, k -> new ArrayList<>()).add(new Conexao(destino, trecho));
        adjacencias.computeIfAbsent(destino, k -> new ArrayList<>()).add(new Conexao(origem, trecho));
        trechos.put(trecho.getId(), trecho);
    }

    public Map<String, List<Conexao>> getAdjacencias() {
        return adjacencias;
    }

    public Trecho getTrecho(String id) {
        return trechos.get(id);
    }
}
