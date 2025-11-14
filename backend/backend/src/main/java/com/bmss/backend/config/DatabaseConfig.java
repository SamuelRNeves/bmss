package com.bmss.backend.config;

import java.net.URI;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.util.StringUtils;

@Configuration
public class DatabaseConfig {

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Value("${DATABASE_USER:}")
    private String databaseUser;

    @Value("${DATABASE_PASSWORD:}")
    private String databasePassword;

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        if (StringUtils.hasText(databaseUrl)) {
            String normalized = normalizeJdbcUrl(databaseUrl.trim());
            if (normalized != null) {
                properties.setUrl(normalized);
            }

            if (StringUtils.hasText(databaseUser)) {
                properties.setUsername(databaseUser);
            }

            if (StringUtils.hasText(databasePassword)) {
                properties.setPassword(databasePassword);
            }
        }

        return properties.initializeDataSourceBuilder().build();
    }

    private String normalizeJdbcUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }

        if (url.startsWith("jdbc:")) {
            return url;
        }

        if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
            URI uri = URI.create(url);
            int port = uri.getPort() == -1 ? 5432 : uri.getPort();
            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                    .append(uri.getHost())
                    .append(":")
                    .append(port)
                    .append(uri.getPath() == null ? "" : uri.getPath());

            if (StringUtils.hasText(uri.getQuery())) {
                jdbcUrl.append("?").append(uri.getQuery());
            }

            return jdbcUrl.toString();
        }

        return url;
    }
}
