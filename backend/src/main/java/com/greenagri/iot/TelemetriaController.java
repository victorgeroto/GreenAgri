package com.greenagri.iot;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.iot.IotDtos.TelemetriaRequest;
import com.greenagri.iot.IotDtos.TelemetriaResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Endpoint consumido pelo firmware (ESP32) — autenticado pela chave do dispositivo. */
@RestController
@RequestMapping("/api/iot/telemetria")
@RequiredArgsConstructor
@Tag(name = "IoT - Dispositivos de campo")
public class TelemetriaController {

	private final TelemetriaService service;

	@PostMapping
	@ResponseStatus(HttpStatus.ACCEPTED)
	@SecurityRequirements
	@Operation(summary = "Recebe um lote de leituras de um dispositivo",
			description = "Autenticação via header X-Device-Key. Leituras repetidas (mesmo instante) são ignoradas.")
	public TelemetriaResponse receber(@RequestHeader("X-Device-Key") String apiKey,
			@Valid @RequestBody TelemetriaRequest req) {
		return service.receber(req, apiKey);
	}
}
