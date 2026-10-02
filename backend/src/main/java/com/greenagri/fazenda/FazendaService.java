package com.greenagri.fazenda;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.auth.UsuarioRepository;
import com.greenagri.fazenda.FazendaDtos.FazendaRequest;
import com.greenagri.fazenda.FazendaDtos.FazendaResponse;
import com.greenagri.shared.RecursoNaoEncontradoException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FazendaService {

	private final FazendaRepository fazendas;
	private final UsuarioRepository usuarios;

	@Transactional(readOnly = true)
	public List<FazendaResponse> doUsuario(String email) {
		return fazendas.doUsuario(email).stream().map(FazendaResponse::de).toList();
	}

	/** Cria a fazenda e dá acesso a quem cadastrou. */
	@Transactional
	public FazendaResponse criar(FazendaRequest req, String email) {
		Fazenda f = new Fazenda();
		aplicar(f, req);
		f.getMembros().add(usuarios.findByEmailIgnoreCase(email)
			.orElseThrow(() -> new RecursoNaoEncontradoException("Usuário", email)));
		return FazendaResponse.de(fazendas.save(f));
	}

	@Transactional
	public FazendaResponse atualizar(Long id, FazendaRequest req, String email) {
		if (!fazendas.temAcesso(id, email)) {
			throw new RecursoNaoEncontradoException("Fazenda", id); // não revela fazendas de terceiros
		}
		Fazenda f = fazendas.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Fazenda", id));
		aplicar(f, req);
		return FazendaResponse.de(f);
	}

	private static void aplicar(Fazenda f, FazendaRequest req) {
		f.setNome(req.nome().trim());
		f.setMunicipio(req.municipio().trim());
		f.setUf(req.uf());
		f.setLatitude(req.latitude());
		f.setLongitude(req.longitude());
	}
}
