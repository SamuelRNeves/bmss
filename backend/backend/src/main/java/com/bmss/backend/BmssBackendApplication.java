package com.bmss.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BmssBackendApplication {

        public static void main(String[] args) {
                SpringApplication.run(BmssBackendApplication.class, args);
        }

}
