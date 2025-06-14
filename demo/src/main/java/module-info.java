module org.example.demo {
    requires javafx.fxml;
    requires javafx.web;
    requires jdk.jsobject;
    requires com.google.gson;


    opens org.example.demo to javafx.fxml;
    exports org.example.demo;
}