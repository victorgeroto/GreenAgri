package com.greenagri;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GreenAgriApplication {

	public static void main(String[] args) {
		SpringApplication.run(GreenAgriApplication.class, args);
	}
}
