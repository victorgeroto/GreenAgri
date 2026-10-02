package com.greenagri.iot;

public enum TipoDispositivo {
	/** Temperatura e umidade do ar (risco de geada / estresse térmico). */
	ESTACAO_METEOROLOGICA,
	/** Umidade do solo no talhão (apoio à irrigação). */
	SENSOR_SOLO,
	/** Nível (ultrassom) e termometria do grão armazenado. */
	SENSOR_SILO
}
