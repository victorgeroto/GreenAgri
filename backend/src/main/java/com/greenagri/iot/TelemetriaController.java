package com.greenagri.iot;

import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.fazenda.ContextoFazenda;
import com.greenagri.iot.IotDtos.TelemetriaRequest;
import com.greenagri.iot.IotDtos.TelemetriaResponse;
import com.greenagri.seguranca.Auditoria;
import com.greenagri.seguranca.LimitadorTentativas;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Endpoint consumido pelo firmware (ESP32) — autenticado pela chave do dispositivo. */
@RestController
@RequestMapping("/api/iot/telemetria")
@RequiredArgsConstructor
@Tag(name = "IoT - Dispositivos de campo")
public class TelemetriaController {

	private final TelemetriaService service;
	private final LimitadorTentativas limitador;

	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	@SecurityRequirements
	@Operation(summary = "Recebe um lote de leituras de um dispositivo",
			description = "Autenticação via header X-Device-Key. Leituras repetidas (mesmo instante) são ignoradas.")
	public TelemetriaResponse receber(@RequestHeader("X-Device-Key") String apiKey,
			@Valid @RequestBody TelemetriaRequest req, HttpServletRequest http) {
		// O dispositivo não tem usuário: descobre a fazenda dele e processa o lote dentro dela,
		// para leituras, alertas e geofence ficarem restritos à mesma fazenda.
		String chave = "telemetria:" + http.getRemoteAddr();
		limitador.verificar(chave);
		Long fazendaId;
		try {
			fazendaId = service.fazendaDoDispositivo(req.codigo(), apiKey);
		}
		catch (BadCredentialsException e) {
			limitador.registrar(chave, 20, Duration.ofMinutes(10), Duration.ofMinutes(10));
			Auditoria.alerta("DISPOSITIVO_CHAVE_INVALIDA", null, http.getRemoteAddr(), "codigo=" + req.codigo());
			throw e;
		}
		return ContextoFazenda.executar(fazendaId, () -> service.receber(req, apiKey));
	}
}
