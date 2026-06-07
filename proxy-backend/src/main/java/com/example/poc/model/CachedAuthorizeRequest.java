package com.example.poc.model;

import java.time.Instant;

public record CachedAuthorizeRequest(
    String clientId,
    String redirectUri,
    String responseType,
    String scope,
    String state,
    String codeChallenge,
    String codeChallengeMethod,
    Instant createdAt
) {
}

