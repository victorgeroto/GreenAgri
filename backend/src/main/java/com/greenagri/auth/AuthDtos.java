package com.greenagri.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record LoginRequest(@NotBlank @Email @Size(max = 160) String email, @NotBlank @Size(max = 128) String senha) {
	}

	public record RegistroRequest(
			@NotBlank @Size(max = 120) String nome,
			@NotBlank @Email @Size(max = 160) String email,
			@NotBlank @Size(min = 10, max = 128, message = "A senha deve ter de 10 a 128 caracteres") String senha) {
	}

	public record UsuarioResponse(Long id, String nome, String email, Perfil perfil) {

		static UsuarioResponse de(Usuario u) {
			return new UsuarioResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil());
		}
	}

	public record TokenResponse(String token, long expiraEmSegundos, UsuarioResponse usuario) {
	}
}
