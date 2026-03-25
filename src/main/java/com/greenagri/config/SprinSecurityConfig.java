package com.greenagri.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SprinSecurityConfig {

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http)throws Exception{
		http
		.csrf().disable()
		.authorizeHttpRequests((requests)-> requests

				.requestMatchers(
						HttpMethod.POST,"/colheita/", "/estoque/", "/produtos/", "/veiculos/")
				.permitAll()
				.requestMatchers(
						HttpMethod.GET,"/colheita/", "/estoque/", "/produtos/", "/veiculos/")
				.permitAll()
				.requestMatchers(
						HttpMethod.DELETE,"/colheita/{id}", "/estoque/{id}", "/produtos/{id}", "/veiculos/{id}")
				.permitAll()
				.requestMatchers(
						HttpMethod.PUT,"/colheita/**", "/estoque/**", "/produtos/**", "/veiculos/**")
				.permitAll()				
				.anyRequest()
				.authenticated()	

				)
		.httpBasic();
		return http.build();

	}

	@Bean
	public InMemoryUserDetailsManager userDetailsService(){
		UserDetails user = User.withDefaultPasswordEncoder()
				.username("Victor")
				.password("12345@senai")
				.roles("USER")
				.build();
		return new InMemoryUserDetailsManager(user);

	}
}

