package com.example.poc.controller;

import com.example.poc.config.AppProperties;
import com.example.poc.config.OktaProperties;
import com.example.poc.model.CachedAuthorizeRequest;
import com.example.poc.model.ProxyCallbackState;
import com.example.poc.service.AuthorizeRequestStore;
import com.example.poc.service.OktaTokenService;
import com.example.poc.service.ProxyTokenStore;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class FlowController {

    private final AuthorizeRequestStore authorizeRequestStore;
    private final AppProperties appProperties;
    private final OktaProperties oktaProperties;
    private final OktaTokenService oktaTokenService;
    private final ProxyTokenStore proxyTokenStore;

    public FlowController(
        AuthorizeRequestStore authorizeRequestStore,
        AppProperties appProperties,
        OktaProperties oktaProperties,
        OktaTokenService oktaTokenService,
        ProxyTokenStore proxyTokenStore
    ) {
        this.authorizeRequestStore = authorizeRequestStore;
        this.appProperties = appProperties;
        this.oktaProperties = oktaProperties;
        this.oktaTokenService = oktaTokenService;
        this.proxyTokenStore = proxyTokenStore;
    }

    @GetMapping("/oauth/authorize")
    public RedirectView authorize(
        @RequestParam("client_id") String clientId,
        @RequestParam("redirect_uri") String redirectUri,
        @RequestParam(defaultValue = "code", value = "response_type") String responseType,
        @RequestParam("scope") String scope,
        @RequestParam("state") String state,
        @RequestParam("code_challenge") String codeChallenge,
        @RequestParam(defaultValue = "S256", value = "code_challenge_method") String codeChallengeMethod
    ) {
        authorizeRequestStore.save(
            clientId,
            redirectUri,
            responseType,
            scope,
            state,
            codeChallenge,
            codeChallengeMethod
        );

        return new RedirectView(appProperties.treasuryFrontendBaseUrl() + "/consent?state=" + state);
    }

    @GetMapping("/oauth/okta/start")
    public RedirectView startOktaLogin(@RequestParam("state") String state) {
        CachedAuthorizeRequest request = authorizeRequestStore.get(state);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown state");
        }

        ProxyCallbackState callbackState = new ProxyCallbackState(request.state());
        String authorizeUrl = UriComponentsBuilder
            .fromUriString(oktaProperties.issuer())
            .path("/v1/authorize")
            .queryParam("client_id", oktaProperties.clientId())
            .queryParam("response_type", "code")
            .queryParam("scope", "openid profile email")
            .queryParam("redirect_uri", oktaProperties.redirectUri())
            .queryParam("state", callbackState.asOktaState())
            .build()
            .toUriString();

        return new RedirectView(authorizeUrl);
    }

    @GetMapping("/login/callback")
    public ResponseEntity<Map<String, Object>> oktaLoginCallback(
        @RequestParam("code") String code,
        @RequestParam("state") String state
    ) {
        ProxyCallbackState callbackState = ProxyCallbackState.parse(state);
        CachedAuthorizeRequest request = authorizeRequestStore.get(callbackState.luxhubState());
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown state");
        }

        Map<String, Object> tokenResponse = oktaTokenService.exchangeAuthorizationCode(code);
        authorizeRequestStore.saveAccessToken(
            callbackState.luxhubState(),
            String.valueOf(tokenResponse.getOrDefault("access_token", ""))
        );
        String proxyCode = proxyTokenStore.save(callbackState.luxhubState(), tokenResponse);
        String target = UriComponentsBuilder
            .fromUriString(request.redirectUri())
            .queryParam("state", request.state())
            .queryParam("code", proxyCode)
            .build()
            .toUriString();

        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.LOCATION, target)
            .build();
    }

    @RequestMapping("/oauth/consent/approve")
    public RedirectView approveConsent(@RequestParam("state") String state) {
        CachedAuthorizeRequest request = authorizeRequestStore.get(state);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown state");
        }

        return new RedirectView("/oauth/okta/start?state=" + request.state());
    }

    @GetMapping("/api/requests/{state}")
    public ResponseEntity<CachedAuthorizeRequest> getRequest(@PathVariable String state) {
        CachedAuthorizeRequest request = authorizeRequestStore.get(state);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(request);
    }

    @PostMapping("/oauth/token")
    public ResponseEntity<Map<String, Object>> exchangeCodeForToken(@RequestParam("code") String code) {
        if (code.startsWith("proxy-code-")) {
            Map<String, Object> tokenResponse = proxyTokenStore.getTokenResponse(code);
            if (tokenResponse == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown or expired proxy code");
            }
            return ResponseEntity.ok(tokenResponse);
        }

        if (!code.startsWith("demo-code-")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported code");
        }

        String accessToken = code.replaceFirst("^demo-code-", "demo-access-");

        return ResponseEntity.ok(Map.of(
            "access_token", accessToken,
            "token_type", "Bearer",
            "expires_in", 300,
            "scope", "accounts",
            "issued_at", Instant.now().toString()
        ));
    }

    @GetMapping("/api/treasury/account")
    public ResponseEntity<Map<String, Object>> getAccountInfo(
        @org.springframework.web.bind.annotation.RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String accessToken = normalizeBearerToken(authorization);
        System.out.println("Treasury account raw Authorization = " + authorization);
        System.out.println("Treasury account normalized accessToken = " + accessToken);
        System.out.println("ProxyTokenStore accessTokens = " + proxyTokenStore.getAccessTokens());

        if (!proxyTokenStore.hasAccessToken(accessToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        return ResponseEntity.ok(Map.of(
            "institution", "Treasury",
            "accountId", "CHK-100200300",
            "accountType", "Checking",
            "currency", "USD",
            "availableBalance", 2450.18,
            "accountHolder", "Demo Customer",
            "tokenSource", "okta-via-proxy-cache"
        ));
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    private String normalizeBearerToken(String authorization) {
        String token = authorization.substring("Bearer ".length()).trim();
        while (token.startsWith("Bearer ")) {
            token = token.substring("Bearer ".length()).trim();
        }
        return token;
    }
}
