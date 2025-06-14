package org.example.demo;

public class Trecho {
    private final String id;
    private double seguranca;
    private double iluminacao;
    private double trafego;

    public Trecho(String id, double seguranca, double iluminacao, double trafego) {
        this.id = id;
        this.seguranca = seguranca;
        this.iluminacao = iluminacao;
        this.trafego = trafego;
    }

    public String getId() { return id; }

    public double getNotaMedia() {
        return (seguranca + iluminacao + trafego) / 3.0;
    }
}
