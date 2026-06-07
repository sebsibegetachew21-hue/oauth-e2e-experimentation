package com.example.poc.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    WebMvcConfigurer corsConfigurer(AppProperties appProperties) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins(
                        appProperties.luxhubFrontendBaseUrl(),
                        appProperties.treasuryFrontendBaseUrl()
                    )
                    .allowedMethods("GET")
                    .allowedHeaders("*");

                registry.addMapping("/oauth/token")
                    .allowedOrigins(appProperties.luxhubFrontendBaseUrl())
                    .allowedMethods("POST")
                    .allowedHeaders("*");
            }
        };
    }
}
