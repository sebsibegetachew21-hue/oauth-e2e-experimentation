package com.example.poc.service;

import com.example.poc.config.OktaProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OktaTokenService {

    private final OktaProperties oktaProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public OktaTokenService(OktaProperties oktaProperties, ObjectMapper objectMapper) {
        this.oktaProperties = oktaProperties;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> exchangeAuthorizationCode(String code) {
        String requestBody = formBody(Map.of(
            "grant_type", "authorization_code",
            "code", code,
            "redirect_uri", oktaProperties.redirectUri()
        ));

        String basicAuth = Base64.getEncoder().encodeToString(
            (oktaProperties.clientId() + ":" + oktaProperties.clientSecret()).getBytes(StandardCharsets.UTF_8)
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(oktaProperties.issuer() + "/v1/token"))
            .header("Authorization", "Basic " + basicAuth)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {});

            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Okta token exchange failed: " + payload.getOrDefault("error", "unknown_error")
                );
            }

            return payload;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Okta token exchange interrupted", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Okta token exchange failed", exception);
        }
    }

    private String formBody(Map<String, String> values) {
        return values.entrySet().stream()
            .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
            .reduce((left, right) -> left + "&" + right)
            .orElse("");
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
