package com.greenagri.colheita;

/** Ciclo de vida da lavoura no talhão; só avança, nunca volta. */
public enum StatusColheita {
	PLANEJADA, EM_DESENVOLVIMENTO, EM_COLHEITA, CONCLUIDA;

	/** Lavoura ocupando o talhão (plantada ou sendo colhida). */
	public boolean ocupaTalhao() {
		return this == EM_DESENVOLVIMENTO || this == EM_COLHEITA;
	}
}
