package com.example.poc.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "okta")
public record OktaProperties(
    String issuer,
    String clientId,
    String clientSecret,
    String redirectUri
) {
}
