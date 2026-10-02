package com.greenagri.auth;

import java.time.Duration;
import java.time.Instant;

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
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final UsuarioRepository usuarios;
	private final PasswordEncoder passwordEncoder;
	private final JwtEncoder jwtEncoder;
	private final GreenAgriProperties props;

	@Transactional(readOnly = true)
	public TokenResponse login(LoginRequest req) {
		Usuario usuario = usuarios.findByEmailIgnoreCase(req.email())
			.filter(u -> passwordEncoder.matches(req.senha(), u.getSenhaHash()))
			.orElseThrow(() -> new BadCredentialsException("E-mail ou senha inválidos"));
		return emitirToken(usuario);
	}

	@Transactional
	public TokenResponse registrar(RegistroRequest req) {
		if (usuarios.existsByEmailIgnoreCase(req.email())) {
			throw new RegraNegocioException("Já existe uma conta com este e-mail");
		}
		Usuario usuario = usuarios.save(new Usuario(req.nome(), req.email().toLowerCase(),
				passwordEncoder.encode(req.senha()), Perfil.OPERADOR));
		return emitirToken(usuario);
	}

	private TokenResponse emitirToken(Usuario usuario) {
		Duration validade = Duration.ofHours(props.jwt().expiracaoHoras());
		Instant agora = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer("greenagri")
			.subject(usuario.getEmail())
			.issuedAt(agora)
			.expiresAt(agora.plus(validade))
			.claim("nome", usuario.getNome())
			.claim("perfil", usuario.getPerfil().name())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
		return new TokenResponse(token, validade.toSeconds(), UsuarioResponse.de(usuario));
	}
}
