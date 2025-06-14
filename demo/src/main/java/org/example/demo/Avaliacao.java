package org.example.demo;

public class Avaliacao {
    private final double seguranca;
    private final double iluminacao;
    private final double trafego;
    private final String comentario;

    public Avaliacao(double seguranca, double iluminacao, double trafego, String comentario) {
        this.seguranca = seguranca;
        this.iluminacao = iluminacao;
        this.trafego = trafego;
        this.comentario = "";
    }

    @Override
    public String toString() {
        return "Segurança: " + seguranca + ", Iluminação: " + iluminacao + ", Tráfego: " + trafego + "Comentário" + comentario;
    }

    public double getSeguranca() {
        return 0;
    }
}

