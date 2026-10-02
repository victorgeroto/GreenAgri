package com.greenagri.iot;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.iot.IotDtos.AlertaResponse;
import com.greenagri.iot.IotDtos.DispositivoRequest;
import com.greenagri.iot.IotDtos.DispositivoResponse;
import com.greenagri.iot.IotDtos.LeituraResponse;
import com.greenagri.iot.IotDtos.ProvisionamentoResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/iot")
@RequiredArgsConstructor
@Tag(name = "IoT - Painel")
public class IotController {

	private final IotService service;

	@GetMapping("/dispositivos")
	@Operation(summary = "Dispositivos com status, última leitura e reconciliação de silos")
	public List<DispositivoResponse> dispositivos() {
		return service.listarDispositivos();
	}

	@PostMapping("/dispositivos")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('ADMIN')")
	@Operation(summary = "Provisiona um dispositivo e devolve sua chave (exibida uma única vez)")
	public ProvisionamentoResponse provisionar(@Valid @RequestBody DispositivoRequest req) {
		return service.provisionar(req);
	}

	@GetMapping("/dispositivos/{id}/leituras")
	@Operation(summary = "Série temporal das últimas N horas")
	public List<LeituraResponse> leituras(@PathVariable Long id, @RequestParam(defaultValue = "24") int horas) {
		return service.leituras(id, horas);
	}

	@GetMapping("/alertas")
	public List<AlertaResponse> alertas(@RequestParam(defaultValue = "false") boolean reconhecidos) {
		return service.alertas(reconhecidos);
	}

	@PostMapping("/alertas/{id}/reconhecer")
	public AlertaResponse reconhecer(@PathVariable Long id) {
		return service.reconhecer(id);
	}
}
