package com.kuicat.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * Configuración CORS para permitir peticiones desde el frontend Angular.
 */
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Orígenes permitidos (desarrollo y producción)
        config.setAllowedOrigins(Arrays.asList(
                "http://localhost:4200",      // Angular dev server
                "http://localhost:8741",      // Mismo origen
                "http://127.0.0.1:4200",
                "http://127.0.0.1:8741"
        ));
        
        // También permitir cualquier origen en desarrollo
        config.setAllowedOriginPatterns(List.of("*"));
        
        // Métodos HTTP permitidos
        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        
        // Headers permitidos
        config.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With"
        ));
        
        // Permitir credenciales (cookies, auth headers)
        config.setAllowCredentials(true);
        
        // Tiempo de cache para preflight requests
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        
        return new CorsFilter(source);
    }
}
