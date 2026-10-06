package com.greenagri.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.auth.AuthDtos.LoginRequest;
import com.greenagri.auth.AuthDtos.RegistroRequest;
import com.greenagri.auth.AuthDtos.TokenResponse;
import com.greenagri.auth.AuthDtos.UsuarioResponse;
import com.greenagri.config.GreenAgriProperties;
import com.greenagri.seguranca.Auditoria;
import com.greenagri.seguranca.LimitadorTentativas;
import com.greenagri.seguranca.PoliticaSenha;
import com.greenagri.shared.RegraNegocioException;

@Service
public class AuthService {

	public static final String EMISSOR = "greenagri";
	private static final String FALHA = "E-mail ou senha inválidos";

	private final UsuarioRepository usuarios;
	private final PasswordEncoder passwordEncoder;
	private final JwtEncoder jwtEncoder;
	private final GreenAgriProperties props;
	private final LimitadorTentativas limitador;
	/** Hash fictício: e-mail inexistente também paga o custo do bcrypt (sem enumeração por tempo). */
	private final String hashFicticio;

	public AuthService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
			GreenAgriProperties props, LimitadorTentativas limitador) {
		this.usuarios = usuarios;
		this.passwordEncoder = passwordEncoder;
		this.jwtEncoder = jwtEncoder;
		this.props = props;
		this.limitador = limitador;
		this.hashFicticio = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	@Transactional(readOnly = true)
	public TokenResponse login(LoginRequest req, String ip) {
		String email = req.email().trim().toLowerCase(Locale.ROOT);
		// Duas chaves: uma conta sob ataque de vários IPs e um IP testando várias contas.
		String porConta = "login:" + email + "|" + ip;
		String porIp = "login-ip:" + ip;
		limitador.verificar(porConta);
		limitador.verificar(porIp);

		Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElse(null);
		boolean ok = passwordEncoder.matches(req.senha(), usuario != null ? usuario.getSenhaHash() : hashFicticio) && usuario != null;
		if (!ok) {
			var s = props.seguranca();
			Duration bloqueio = Duration.ofMinutes(s.bloqueioMinutos());
			boolean bloqueouConta = limitador.registrar(porConta, s.tentativasLogin(), bloqueio, bloqueio);
			boolean bloqueouIp = limitador.registrar(porIp, s.tentativasLogin() * 6, bloqueio, bloqueio);
			if (bloqueouConta || bloqueouIp) {
				Auditoria.alerta("LOGIN_BLOQUEADO", email, ip, bloqueouIp ? "motivo=ip" : "motivo=conta");
			}
			else {
				Auditoria.evento("LOGIN_FALHOU", email, ip, null);
			}
			throw new BadCredentialsException(FALHA); // mesma mensagem para e-mail ou senha errados
		}
		limitador.limpar(porConta);
		Auditoria.evento("LOGIN_OK", email, ip, null);
		return emitirToken(usuario);
	}

	@Transactional
	public TokenResponse registrar(RegistroRequest req, String ip) {
		String chave = "registro:" + ip;
		limitador.verificar(chave);
		limitador.registrar(chave, props.seguranca().cadastrosPorHora(), Duration.ofHours(1), Duration.ofHours(1));

		String email = req.email().trim().toLowerCase(Locale.ROOT);
		PoliticaSenha.validar(req.senha(), email, req.nome());
		if (usuarios.existsByEmailIgnoreCase(email)) {
			throw new RegraNegocioException("Já existe uma conta com este e-mail");
		}
		Usuario usuario = usuarios.save(new Usuario(req.nome().trim(), email, passwordEncoder.encode(req.senha()), Perfil.OPERADOR));
		Auditoria.evento("CONTA_CRIADA", email, ip, null);
		return emitirToken(usuario);
	}

	private TokenResponse emitirToken(Usuario usuario) {
		Duration validade = Duration.ofHours(props.jwt().expiracaoHoras());
		Instant agora = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(EMISSOR)
			.id(UUID.randomUUID().toString())
			.subject(usuario.getEmail())
			.issuedAt(agora)
			.notBefore(agora)
			.expiresAt(agora.plus(validade))
			.claim("nome", usuario.getNome())
			.claim("perfil", usuario.getPerfil().name())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
		return new TokenResponse(token, validade.toSeconds(), UsuarioResponse.de(usuario));
	}
}
