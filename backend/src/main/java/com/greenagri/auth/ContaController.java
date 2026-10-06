package com.greenagri.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.fazenda.FazendaRepository;
import com.greenagri.seguranca.Auditoria;
import com.greenagri.seguranca.LimitadorTentativas;
import com.greenagri.seguranca.PoliticaSenha;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

/** Perfil do usuário autenticado (não depende de fazenda selecionada). */
@RestController
@RequestMapping("/api/conta")
@RequiredArgsConstructor
@Tag(name = "Conta")
public class ContaController {

	private final UsuarioRepository usuarios;
	private final FazendaRepository fazendas;
	private final PasswordEncoder passwordEncoder;
	private final LimitadorTentativas limitador;

	public record FazendaAcesso(Long id, String nome, String municipio, String uf) {
	}

	public record PerfilResponse(Long id, String nome, String email, Perfil perfil, Instant criadoEm,
			List<FazendaAcesso> fazendas, Instant sessaoExpiraEm) {
	}

	public record NomeRequest(@NotBlank @Size(max = 120) String nome) {
	}

	public record SenhaRequest(@NotBlank @Size(max = 128) String senhaAtual, @NotBlank @Size(min = 10, max = 128) String novaSenha) {
	}

	@GetMapping
	@Transactional(readOnly = true)
	@Operation(summary = "Dados do usuário logado e fazendas a que tem acesso")
	public PerfilResponse perfil(@AuthenticationPrincipal Jwt jwt) {
		return montar(usuario(jwt), jwt);
	}

	@PutMapping
	@Transactional
	@Operation(summary = "Altera o nome exibido")
	public PerfilResponse alterarNome(@Valid @RequestBody NomeRequest req, @AuthenticationPrincipal Jwt jwt) {
		Usuario u = usuario(jwt);
		u.setNome(req.nome().trim());
		return montar(u, jwt);
	}

	@PostMapping("/senha")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Transactional
	@Operation(summary = "Troca a senha (exige a senha atual)")
	public void trocarSenha(@Valid @RequestBody SenhaRequest req, @AuthenticationPrincipal Jwt jwt, HttpServletRequest http) {
		Usuario u = usuario(jwt);
		String chave = "troca-senha:" + u.getEmail();
		limitador.verificar(chave);
		if (!passwordEncoder.matches(req.senhaAtual(), u.getSenhaHash())) {
			limitador.registrar(chave, 5, Duration.ofMinutes(15), Duration.ofMinutes(15));
			Auditoria.alerta("TROCA_SENHA_FALHOU", u.getEmail(), http.getRemoteAddr(), null);
			throw new RegraNegocioException("Senha atual incorreta");
		}
		if (passwordEncoder.matches(req.novaSenha(), u.getSenhaHash())) {
			throw new RegraNegocioException("A nova senha deve ser diferente da atual");
		}
		PoliticaSenha.validar(req.novaSenha(), u.getEmail(), u.getNome());
		u.setSenhaHash(passwordEncoder.encode(req.novaSenha()));
		limitador.limpar(chave);
		Auditoria.evento("SENHA_ALTERADA", u.getEmail(), http.getRemoteAddr(), null);
	}

	private Usuario usuario(Jwt jwt) {
		return usuarios.findByEmailIgnoreCase(jwt.getSubject())
			.orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", jwt.getSubject()));
	}

	private PerfilResponse montar(Usuario u, Jwt jwt) {
		return new PerfilResponse(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(), u.getCriadoEm(),
				fazendas.doUsuario(u.getEmail()).stream()
					.map(f -> new FazendaAcesso(f.getId(), f.getNome(), f.getMunicipio(), f.getUf()))
					.toList(),
				jwt.getExpiresAt());
	}
}
