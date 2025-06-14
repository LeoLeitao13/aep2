package org.example.demo;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.concurrent.Worker;
import javafx.scene.Scene;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;
import netscape.javascript.JSObject;

import java.net.URL;
import java.util.*;

public class MapaController extends Application {

    private final List<Avaliacao> avaliacoes = Collections.synchronizedList(new ArrayList<>());
    private WebEngine webEngine;

    @Override
    public void start(Stage stage) {
        WebView webView = new WebView();
        webEngine = webView.getEngine();

        webEngine.setOnError(event -> System.err.println("❌ Erro JavaScript: " + event.getMessage()));
        webEngine.setOnAlert(event -> System.out.println("JS Alert: " + event.getData()));

        URL mapaURL = getClass().getResource("/MapaView.html");
        if (mapaURL == null) {
            System.err.println("❌ ERRO: MapaView.html não encontrado em /resources");
            return;
        }

        webEngine.load(mapaURL.toExternalForm());

        webEngine.getLoadWorker().stateProperty().addListener((obs, oldState, newState) -> {
            if (newState == Worker.State.SUCCEEDED) {
                try {
                    JSObject window = (JSObject) webEngine.executeScript("window");
                    JavaBridge bridge = new JavaBridge(this);
                    window.setMember("javaConnector", bridge);
                    Platform.runLater(() -> {
                        webEngine.executeScript("onJavaConnectorReady();");
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

        Scene scene = new Scene(webView, 1000, 700);
        stage.setScene(scene);
        stage.setTitle("Rotas Seguras - Maringá");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }

    public class JavaBridge {
        private final MapaController controller;

        public JavaBridge(MapaController controller) {
            this.controller = controller;
        }

        public void receberAvaliacao(String json) {
            System.out.println("📩 Recebendo avaliação (JSON): " + json);
            Map<String, String> dados = parseJsonTexto(json);
            double seg = Double.parseDouble(dados.get("seguranca"));
            double ilu = Double.parseDouble(dados.get("iluminacao"));
            double traf = Double.parseDouble(dados.get("trafego"));
            Avaliacao av = new Avaliacao(
                    dados.getOrDefault("origem", "Origem X"),
                    dados.getOrDefault("destino", "Destino Y"),
                    seg, ilu, traf,
                    dados.getOrDefault("comentario", "")
            );
            synchronized (avaliacoes) {
                avaliacoes.add(av);
            }
            atualizarFeed();
        }

        public void mostrarRelatorioEmJanela() {
            System.out.println("🔍 Solicitando relatório (atualizando feed)");
            atualizarFeed();
        }

        private void atualizarFeed() {
            StringBuilder jsonFeed = new StringBuilder("[");
            boolean first = true;
            synchronized (avaliacoes) {
                for (Avaliacao a : avaliacoes) {
                    if (!first) jsonFeed.append(",");
                    jsonFeed.append("{\"origem\":\"").append(a.getOrigem()).append("\",")
                            .append("\"destino\":\"").append(a.getDestino()).append("\",")
                            .append("\"seguranca\":").append(a.getSeguranca()).append(",")
                            .append("\"iluminacao\":").append(a.getIluminacao()).append(",")
                            .append("\"trafego\":").append(a.getTrafego()).append(",")
                            .append("\"comentario\":\"").append(a.getComentario()).append("\"}");
                    first = false;
                }
            }
            jsonFeed.append("]");
            String jsonFinal = jsonFeed.toString();
            Platform.runLater(() -> {
                webEngine.executeScript("updateFeed('" + jsonFinal.replace("'", "\\'") + "');");
            });
        }

        private Map<String, String> parseJsonTexto(String json) {
            Map<String, String> map = new HashMap<>();
            if (json == null || json.trim().isEmpty()) return map;
            json = json.replaceAll("^\\{|\\}$", "");
            String[] pairs = json.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length == 2) {
                    String key = keyValue[0].replaceAll("\"", "").trim();
                    String value = keyValue[1].replaceAll("\"", "").trim();
                    map.put(key, value);
                }
            }
            return map;
        }

        // NOVO: Compara duas rotas fictícias com base na média de segurança
        public void compararRotasMaisSeguras() {
            List<Avaliacao> rotaA = gerarFakes("A");
            List<Avaliacao> rotaB = gerarFakes("B");

            PriorityQueue<RotaAvaliacao> heap = new PriorityQueue<>();
            heap.offer(new RotaAvaliacao("Rota A", rotaA));
            heap.offer(new RotaAvaliacao("Rota B", rotaB));

            System.out.println("📊 Prioridade de Rotas por Segurança:");
            while (!heap.isEmpty()) {
                System.out.println(heap.poll());
            }
        }

        private List<Avaliacao> gerarFakes(String label) {
            List<Avaliacao> list = new ArrayList<>();
            Random rand = new Random();
            for (int i = 0; i < 4; i++) {
                double seg = 3.0 + rand.nextDouble() * 2.0;
                double ilu = 3.0 + rand.nextDouble() * 2.0;
                double traf = 3.0 + rand.nextDouble() * 2.0;
                list.add(new Avaliacao("Origem " + label, "Destino " + label, seg, ilu, traf));
            }
            return list;
        }
    }

    // MODELO COMPLETO DE AVALIAÇÃO
    public static class Avaliacao {
        private final String origem;
        private final String destino;
        private final double seguranca;
        private final double iluminacao;
        private final double trafego;
        private final String comentario;

        public Avaliacao(String origem, String destino, double seguranca, double iluminacao, double trafego) {
            this(origem, destino, seguranca, iluminacao, trafego, "");
        }

        public Avaliacao(String origem, String destino, double seguranca, double iluminacao, double trafego, String comentario) {
            this.origem = origem;
            this.destino = destino;
            this.seguranca = seguranca;
            this.iluminacao = iluminacao;
            this.trafego = trafego;
            this.comentario = comentario;
        }

        public String getOrigem() { return origem; }
        public String getDestino() { return destino; }
        public double getSeguranca() { return seguranca; }
        public double getIluminacao() { return iluminacao; }
        public double getTrafego() { return trafego; }
        public String getComentario() { return comentario; }
    }

    // CLASSE HEAP PRIORITÁRIA
    public static class RotaAvaliacao implements Comparable<RotaAvaliacao> {
        private final String nome;
        private final List<Avaliacao> avaliacoes;

        public RotaAvaliacao(String nome, List<Avaliacao> avaliacoes) {
            this.nome = nome;
            this.avaliacoes = avaliacoes;
        }

        public double calcularMediaSeguranca() {
            return avaliacoes.stream().mapToDouble(Avaliacao::getSeguranca).average().orElse(0);
        }

        @Override
        public int compareTo(RotaAvaliacao outra) {
            return Double.compare(outra.calcularMediaSeguranca(), this.calcularMediaSeguranca());
        }

        @Override
        public String toString() {
            return nome + " → Média de Segurança: " + String.format("%.2f", calcularMediaSeguranca());
        }
    }
}
