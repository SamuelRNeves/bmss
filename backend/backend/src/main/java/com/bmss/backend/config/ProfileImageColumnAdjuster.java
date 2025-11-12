package com.bmss.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;

@Component
public class ProfileImageColumnAdjuster {

    private static final Logger logger = LoggerFactory.getLogger(ProfileImageColumnAdjuster.class);

    private final DataSource dataSource;

    public ProfileImageColumnAdjuster(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostConstruct
    public void ensureColumnSize() {
        try (Connection connection = dataSource.getConnection()) {
            String productName = connection.getMetaData().getDatabaseProductName();
            String loweredProduct = productName != null ? productName.toLowerCase(Locale.ROOT) : "";
            boolean isMySqlFamily = loweredProduct.contains("mysql") || loweredProduct.contains("mariadb");
            boolean isPostgres = loweredProduct.contains("postgresql");

            ColumnState state = fetchColumnState(connection, isMySqlFamily);

            if (!state.exists) {
                addColumn(connection, isMySqlFamily, isPostgres);
                return;
            }

            if (isMySqlFamily) {
                if (!"longtext".equalsIgnoreCase(state.type) && !"mediumtext".equalsIgnoreCase(state.type)) {
                    adjustColumn(connection, "ALTER TABLE users MODIFY COLUMN profile_image_url LONGTEXT NULL");
                }
            } else if (isPostgres) {
                if (!"text".equalsIgnoreCase(state.type)) {
                    adjustColumn(connection, "ALTER TABLE users ALTER COLUMN profile_image_url TYPE TEXT");
                }
            } else if (!"text".equalsIgnoreCase(state.type)) {
                adjustColumn(connection, "ALTER TABLE users ALTER COLUMN profile_image_url TYPE TEXT");
            }
        } catch (SQLException ex) {
            logger.warn("Não foi possível ajustar a coluna profile_image_url automaticamente: {}", ex.getMessage());
            logger.debug("Detalhes do erro ao ajustar coluna de imagem de perfil", ex);
        }
    }

    private ColumnState fetchColumnState(Connection connection, boolean mySqlFamily) {
        String query;
        if (mySqlFamily) {
            query = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image_url'";
        } else {
            query = "SELECT data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'profile_image_url'";
        }

        try (PreparedStatement statement = connection.prepareStatement(query);
             ResultSet resultSet = statement.executeQuery()) {
            if (resultSet.next()) {
                return new ColumnState(true, resultSet.getString(1));
            }
            return ColumnState.missing();
        } catch (SQLException ex) {
            logger.debug("Não foi possível consultar metadata da coluna profile_image_url: {}", ex.getMessage());
            return ColumnState.missing();
        }
    }

    private void addColumn(Connection connection, boolean mySqlFamily, boolean postgres) {
        if (mySqlFamily) {
            adjustColumn(connection, "ALTER TABLE users ADD COLUMN profile_image_url LONGTEXT NULL");
        } else if (postgres) {
            adjustColumn(connection, "ALTER TABLE users ADD COLUMN profile_image_url TEXT NULL");
        } else {
            adjustColumn(connection, "ALTER TABLE users ADD COLUMN profile_image_url TEXT NULL");
        }
    }

    private void adjustColumn(Connection connection, String ddl) {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(ddl);
        } catch (SQLException ex) {
            logger.debug("DDL ignorado (provavelmente já aplicado): {} - {}", ddl, ex.getMessage());
        }
    }

    private static final class ColumnState {
        private final boolean exists;
        private final String type;

        private ColumnState(boolean exists, String type) {
            this.exists = exists;
            this.type = type;
        }

        private static ColumnState missing() {
            return new ColumnState(false, null);
        }
    }
}
