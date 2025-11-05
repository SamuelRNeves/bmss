# =========================
# 1. Build stage
# =========================
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copia arquivos de dependência primeiro (cache)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copia o restante do projeto
COPY src ./src

# Build do jar
RUN mvn clean package -DskipTests

# =========================
# 2. Runtime stage
# =========================
FROM eclipse-temurin:21-jdk
WORKDIR /app

# Copia o jar gerado do estágio anterior
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
