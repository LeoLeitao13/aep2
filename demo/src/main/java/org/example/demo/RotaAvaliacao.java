package org.example.demo;

import java.util.List;

public class RotaAvaliacao implements Comparable<RotaAvaliacao> {
    private final String nome; // Ex: "Rota A" ou "Rota B"
    private final List<Avaliacao> avaliacoes;

    public RotaAvaliacao(String nome, List<Avaliacao> avaliacoes) {
        this.nome = nome;
        this.avaliacoes = avaliacoes;
    }

    public RotaAvaliacao(String rotaA, List<MapaController.Avaliacao> rotaA1, String nome, List<Avaliacao> avaliacoes) {
        this.nome = nome;
        this.avaliacoes = avaliacoes;
    }

    public double calcularMediaSeguranca() {
        return avaliacoes.stream().mapToDouble(Avaliacao::getSeguranca).average().orElse(0);
    }

    public String getNome() {
        return nome;
    }

    public List<Avaliacao> getAvaliacoes() {
        return avaliacoes;
    }

    @Override
    public int compareTo(RotaAvaliacao outra) {
        // Ordenar por segurança decrescente (maior segurança = maior prioridade)
        return Double.compare(outra.calcularMediaSeguranca(), this.calcularMediaSeguranca());
    }

    @Override
    public String toString() {
        return nome + " - Média Segurança: " + String.format("%.2f", calcularMediaSeguranca());
    }
}
