package com.example.poc.model;

public record ProxyCallbackState(String thirdPartyAppState) {

    public static ProxyCallbackState parse(String rawState) {
        if (rawState == null || !rawState.startsWith("proxy:")) {
            return new ProxyCallbackState(rawState);
        }

        return new ProxyCallbackState(rawState.substring("proxy:".length()));
    }

    public String asOktaState() {
        return "proxy:" + thirdPartyAppState;
    }
}
