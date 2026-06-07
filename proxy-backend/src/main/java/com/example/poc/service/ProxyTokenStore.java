package com.example.poc.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ProxyTokenStore {

    private static final Logger log = LoggerFactory.getLogger(ProxyTokenStore.class);

    private final Map<String, StoredToken> tokensByCode = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor();

    public String save(String state, Map<String, Object> tokenResponse) {
        String code = "proxy-code-" + state;
        tokensByCode.put(code, new StoredToken(tokenResponse, Instant.now()));
        removeTokenAfterTwoMinutes(code);
        log.info("Stored proxy token response for state={} with 120 second expiration", state);
        return code;
    }

    public Map<String, Object> getTokenResponse(String code) {
        StoredToken storedToken = tokensByCode.get(code);
        if (storedToken == null) {
            return null;
        }

        return storedToken.tokenResponse();
    }

    public boolean hasAccessToken(String accessToken) {
        return tokensByCode.values().stream()
            .map(StoredToken::tokenResponse)
            .map(tokenResponse -> String.valueOf(tokenResponse.getOrDefault("access_token", "")))
            .anyMatch(accessToken::equals);
    }

    public java.util.List<String> getAccessTokens() {
        return tokensByCode.values().stream()
            .map(StoredToken::tokenResponse)
            .map(tokenResponse -> String.valueOf(tokenResponse.getOrDefault("access_token", "")))
            .toList();
    }

    private void removeTokenAfterTwoMinutes(String code) {
        cleanupExecutor.schedule(() -> tokensByCode.remove(code), 2, TimeUnit.MINUTES);
    }

    private record StoredToken(Map<String, Object> tokenResponse, Instant createdAt) {
    }
}
