package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * SKU, código do talhão, placa e matrícula passam a ser únicos por fazenda (duas
 * fazendas podem ter um talhão "T-01"). As restrições antigas foram criadas sem nome
 * no V1 e cada banco gera um nome diferente (H2: CONSTRAINT_xx, PostgreSQL:
 * produtos_sku_key), por isso são localizadas pelo information_schema.
 */
public class V6__unicidade_por_fazenda extends BaseJavaMigration {

	private static final String[][] CHAVES = {
		{ "produtos", "sku" },
		{ "talhoes", "codigo" },
		{ "veiculos", "identificacao" },
		{ "operadores", "matricula" },
	};

	@Override
	public void migrate(Context context) throws Exception {
		Connection c = context.getConnection();
		for (String[] chave : CHAVES) {
			String tabela = chave[0];
			String coluna = chave[1];
			try (Statement st = c.createStatement()) {
				for (String nome : unicasDeUmaColuna(c, tabela, coluna)) {
					st.execute("ALTER TABLE " + tabela + " DROP CONSTRAINT \"" + nome + "\"");
				}
				st.execute("ALTER TABLE %s ADD CONSTRAINT uk_%s_fazenda_%s UNIQUE (fazenda_id, %s)"
					.formatted(tabela, tabela, coluna, coluna));
			}
		}
	}

	private static List<String> unicasDeUmaColuna(Connection c, String tabela, String coluna) throws Exception {
		String sql = """
				SELECT tc.constraint_name
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage k
				  ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
				WHERE tc.constraint_type = 'UNIQUE' AND lower(tc.table_name) = ? AND lower(tc.table_schema) = lower(?)
				GROUP BY tc.constraint_name
				HAVING count(*) = 1 AND max(lower(k.column_name)) = ?
				""";
		List<String> nomes = new ArrayList<>();
		try (PreparedStatement ps = c.prepareStatement(sql)) {
			ps.setString(1, tabela);
			ps.setString(2, c.getSchema());
			ps.setString(3, coluna);
			try (ResultSet rs = ps.executeQuery()) {
				while (rs.next()) {
					nomes.add(rs.getString(1));
				}
			}
		}
		if (nomes.isEmpty()) {
			throw new IllegalStateException("Restrição única de " + tabela + "." + coluna + " não encontrada");
		}
		return nomes;
	}
}
