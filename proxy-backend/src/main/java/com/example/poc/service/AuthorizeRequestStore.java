package com.example.poc.service;

import com.example.poc.model.CachedAuthorizeRequest;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuthorizeRequestStore {

    private static final Logger log = LoggerFactory.getLogger(AuthorizeRequestStore.class);

    private final Map<String, CachedAuthorizeRequest> requests = new ConcurrentHashMap<>();
    private final Map<String, String> accessTokensByState = new ConcurrentHashMap<>();

    public CachedAuthorizeRequest save(
        String clientId,
        String redirectUri,
        String responseType,
        String scope,
        String state,
        String codeChallenge,
        String codeChallengeMethod
    ) {
        CachedAuthorizeRequest request = new CachedAuthorizeRequest(
            clientId,
            redirectUri,
            responseType,
            scope,
            state,
            codeChallenge,
            codeChallengeMethod,
            Instant.now()
        );
        requests.put(state, request);
        log.info("Cached authorize request for state={} with no expiration", state);
        return request;
    }

    public CachedAuthorizeRequest get(String state) {
        CachedAuthorizeRequest request = requests.get(state);
        if (request == null) {
            log.info("Cache miss for state={}", state);
            return null;
        }

        log.info("Cache hit for state={}", state);
        return request;
    }

    public void saveAccessToken(String state, String accessToken) {
        accessTokensByState.put(state, accessToken);
        log.info("Stored authorize-request access token for state={}", state);
    }

    public boolean hasAccessToken(String accessToken) {
        return accessTokensByState.values().stream()
            .anyMatch(accessToken::equals);
    }
}
