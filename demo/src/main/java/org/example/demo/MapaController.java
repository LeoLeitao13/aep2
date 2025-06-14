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
import com.google.gson.Gson;

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
        private final Map<String, List<Avaliacao>> avaliacoesPorRota = new HashMap<>();

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

        public void receberAvaliacoesFake(String json) {
            System.out.println("📦 Recebendo avaliações fakes: " + json);
            try {
                Map<String, Object> parsed = parseJsonSimples(json);
                String rota = (String) parsed.get("rota");
                List<Map<String, Object>> listaRaw = (List<Map<String, Object>>) parsed.get("avaliacoes");

                List<Avaliacao> lista = new ArrayList<>();
                for (Map<String, Object> raw : listaRaw) {
                    double seg = Double.parseDouble(raw.get("seguranca").toString());
                    double ilu = Double.parseDouble(raw.get("iluminacao").toString());
                    double traf = Double.parseDouble(raw.get("trafego").toString());
                    lista.add(new Avaliacao("Origem", "Destino", seg, ilu, traf));
                }

                avaliacoesPorRota.put(rota, lista);

                if (avaliacoesPorRota.containsKey("A") && avaliacoesPorRota.containsKey("B")) {
                    PriorityQueue<RotaAvaliacao> heap = new PriorityQueue<>();
                    heap.offer(new RotaAvaliacao("A", avaliacoesPorRota.get("A")));
                    heap.offer(new RotaAvaliacao("B", avaliacoesPorRota.get("B")));

                    List<Map<String, Object>> resultado = new ArrayList<>();
                    int prioridade = 1;
                    while (!heap.isEmpty()) {
                        RotaAvaliacao r = heap.poll();
                        Map<String, Object> rotaResp = new HashMap<>();
                        rotaResp.put("rota", r.getNome());
                        rotaResp.put("media", r.calcularMediaFinal());
                        rotaResp.put("prioridade", prioridade++);
                        resultado.add(rotaResp);
                    }

                    String jsonFinal = new Gson().toJson(resultado);
                    System.out.println("📤 Enviando notas finais: " + jsonFinal);

                    Platform.runLater(() -> {
                        webEngine.executeScript("atualizarNotasRotas('" + jsonFinal.replace("'", "\\'") + "');");
                    });
                }

            } catch (Exception e) {
                System.err.println("❌ Erro ao processar avaliações fake: " + e.getMessage());
                e.printStackTrace();
            }
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

        private Map<String, Object> parseJsonSimples(String json) {
            return new Gson().fromJson(json, Map.class);
        }
    }

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

    public static class RotaAvaliacao implements Comparable<RotaAvaliacao> {
        private final String nome;
        private final List<Avaliacao> avaliacoes;

        public RotaAvaliacao(String nome, List<Avaliacao> avaliacoes) {
            this.nome = nome;
            this.avaliacoes = avaliacoes;
        }

        public String getNome() {
            return nome;
        }

        public double calcularMediaSeguranca() {
            return avaliacoes.stream().mapToDouble(Avaliacao::getSeguranca).average().orElse(0);
        }

        public double calcularMediaIluminacao() {
            return avaliacoes.stream().mapToDouble(Avaliacao::getIluminacao).average().orElse(0);
        }

        public double calcularMediaTrafego() {
            return avaliacoes.stream().mapToDouble(Avaliacao::getTrafego).average().orElse(0);
        }

        public double calcularMediaFinal() {
            return (calcularMediaSeguranca() + calcularMediaIluminacao() + calcularMediaTrafego()) / 3.0;
        }

        @Override
        public int compareTo(RotaAvaliacao outra) {
            return Double.compare(outra.calcularMediaFinal(), this.calcularMediaFinal());
        }

        @Override
        public String toString() {
            return "Rota " + nome + " → Média Final: " + String.format("%.2f", calcularMediaFinal());
        }
    }
}
