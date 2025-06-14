package org.example.demo;

public class Conexao {
    private final String destino;
    private final Trecho trecho;

    public Conexao(String destino, Trecho trecho) {
        this.destino = destino;
        this.trecho = trecho;
    }

    public String getDestino() { return destino; }
    public Trecho getTrecho() { return trecho; }
}
