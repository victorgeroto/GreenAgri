# Guia de desenvolvimento

## Estrutura

```
GreenAgri/
├── backend/            API REST — Java 21, Spring Boot 3.5
├── frontend/           PWA — React 18, TypeScript, Vite, Tailwind
├── firmware/           ESP32 (PlatformIO) + simulador de dispositivos
├── docs/               Documentação técnica
└── docker-compose.yml  PostgreSQL + API + frontend (nginx)
```

## Rodando localmente

Pré-requisitos: **JDK 21+** e **Node 18+**. O Maven não precisa estar instalado: use o wrapper `mvnw`.

```bash
# Terminal 1 — API em http://localhost:8080 (H2 em memória + dados de demonstração)
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# Terminal 2 — App em http://localhost:5173 (proxy de /api para a 8080)
cd frontend
npm install
npm run dev

# Terminal 3 (opcional) — sensores simulados
node firmware/simulador/simulador.mjs
```

- Swagger: http://localhost:8080/swagger-ui.html
- Console H2: http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:greenagri`, usuário `sa`)

> O service worker só é gerado no build. Para testar offline de verdade, rode `npm run build && npm run preview` (porta 4173) e use a aba *Network → Offline* do DevTools.
>
> Se a API estiver em outra porta, aponte o proxy com `API_PROXY=http://localhost:8090 npm run dev` e libere a origem do app em `GREENAGRI_CORS_ORIGENS`.

### Com Docker

```bash
docker compose up --build
```

O app fica em http://localhost:8081 e a API em http://localhost:8080, com PostgreSQL persistente e dados de demonstração carregados no primeiro start. Em produção, defina `GREENAGRI_JWT_SECRET`.

## Testes

```bash
cd backend && ./mvnw test        # unitários (regras, reconciliação) + integração (MockMvc)
cd frontend && npm test          # camada offline (fila, cache, projeção de saldo), geometria e safra
cd frontend && npm run typecheck
```

O GitHub Actions (`.github/workflows/ci.yml`) roda tudo isso em cada push para `main` e `develop`.

## Backend

Organizado **por domínio** (cada pacote tem entidade, repositório, serviço, DTOs e controller):

| Pacote | Responsabilidade |
|---|---|
| `auth` | Usuários, login/registro, emissão de JWT (HS256) |
| `produto` | Cadastro de produtos; o saldo **não** é editável diretamente |
| `estoque` | Movimentações (entrada, saída e inventário) e alertas de estoque mínimo |
| `talhao` | Talhões georreferenciados (GeoJSON), área e centróide calculados, ponto-no-polígono |
| `colheita` | Lavouras por talhão e safra, ciclo de status com histórico de eventos; concluir lança a produção no estoque |
| `frota` | Máquinas e veículos, horímetro e revisões |
| `equipe` | Operadores, habilitações por tipo de máquina, ausências e alocações em atividades |
| `iot` | Telemetria, regras de alerta, painel e reconciliação silo × estoque |
| `dashboard` | Indicadores consolidados |
| `seed` | Carga de dados de demonstração a partir de `resources/seed/*.json` |
| `shared` | Exceções de domínio e tratamento global (RFC 7807) |

### Regras de negócio importantes

- **O saldo é derivado das movimentações.** Cada lançamento grava o `saldoApos`, e o produto é bloqueado (`PESSIMISTIC_WRITE`) durante a operação, então lançamentos concorrentes não se perdem.
- **Uma saída nunca deixa o saldo negativo**: a API responde 422 com a mensagem do saldo disponível.
- **Idempotência**: uma movimentação com `idCliente` (UUID) já processado devolve o registro existente, o que torna seguro o reenvio da fila offline.
- **Horário do campo**: `ocorridoEm` aceita o horário do aparelho (lançamento feito offline), mas nunca no futuro.
- **Colheita → estoque**: concluir converte kg na unidade do produto (saca de 60 kg, tonelada) e lança uma entrada.
- **Ciclo da lavoura**: planejada → em desenvolvimento → em colheita → concluída. O status só avança, e cada mudança grava um evento (quem, quando, de onde, origem manual ou dispositivo).
- **Um talhão, uma lavoura ativa**: plantar soja num talhão com milho em desenvolvimento é recusado (422). A rotação na mesma safra (soja → milho safrinha) é permitida depois da conclusão.
- **Safra**: calculada pela data de plantio no padrão jul–jun (ago/2025 → 2025/26), podendo ser informada manualmente.
- **Geofence**: colheitadeira com rastreador operando dentro de um talhão com lavoura em desenvolvimento muda o status para *em colheita* (ver [SISTEMA-EMBARCADO.md](SISTEMA-EMBARCADO.md)).
- **Alocação da equipe**: um operador por vez em cada atividade e uma atividade por máquina; o operador precisa da habilitação do tipo da máquina (quem opera trator opera implemento), exceto em manutenção; ausentes e máquinas inativas são recusados, e máquina em manutenção só recebe manutenção. A alocação põe a máquina *em operação* (ou *em manutenção*) e o encerramento a libera. Operador e máquina são bloqueados (`PESSIMISTIC_WRITE`, sempre nessa ordem) e o `idCliente` torna o reenvio da fila idempotente.
- **Unidade imutável com saldo**: trocar sacas por kg num produto com estoque é recusado.

### Perfis

| Perfil | Banco | Seed | Uso |
|---|---|---|---|
| `dev` (padrão) | H2 em memória (modo PostgreSQL) | sim | desenvolvimento |
| `prod` | PostgreSQL (`DB_URL`, `DB_USER`, `DB_PASSWORD`) | via `GREENAGRI_SEED` | Docker/produção |

O schema é versionado pelo **Flyway** (`db/migration`), e o Hibernate não altera tabelas (`ddl-auto: none`).

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/registro` | Autenticação (público) |
| GET/POST | `/api/produtos` | Lista (`?q=`, `?categoria=`) / cria |
| GET/PUT/DELETE | `/api/produtos/{id}` | Detalhe / edita / exclui (ADMIN) |
| GET/POST | `/api/estoque/movimentacoes` | Histórico (`?produtoId=`) / lança |
| GET | `/api/estoque/alertas` | Produtos abaixo do mínimo |
| GET/POST | `/api/colheitas` | Lista (`?safra=2025/26`) / cria |
| PUT/DELETE | `/api/colheitas/{id}` | Edita / exclui |
| POST | `/api/colheitas/{id}/concluir` | Conclui e lança no estoque |
| POST | `/api/colheitas/{id}/status` | Avança o ciclo (`{"status":"EM_COLHEITA"}`) |
| GET | `/api/colheitas/{id}/eventos` · `/api/colheitas/safras` | Histórico de status · safras existentes |
| GET/POST | `/api/talhoes` | Talhões com polígono GeoJSON / cadastra (área calculada) |
| PUT/DELETE | `/api/talhoes/{id}` | Edita / exclui (ADMIN) |
| GET/POST/PUT/DELETE | `/api/veiculos[/{id}]` | Frota |
| GET | `/api/equipe/operadores` | Operadores com situação, habilitações e atividade atual |
| GET | `/api/equipe/operadores/{id}/alocacoes` | Últimas 30 atividades do operador |
| GET/POST | `/api/equipe/alocacoes` | Atividades em andamento / aloca (`operadorId`, `atividade`, `veiculoId` e/ou `talhaoId`) |
| POST | `/api/equipe/alocacoes/{id}/encerrar` | Encerra e libera a máquina |
| POST | `/api/iot/telemetria` | Ingestão do firmware (`X-Device-Key`) |
| GET/POST | `/api/iot/dispositivos` | Painel / provisiona (ADMIN, devolve a chave) |
| GET | `/api/iot/dispositivos/{id}/leituras?horas=24` | Série temporal |
| GET | `/api/iot/alertas` · POST `/api/iot/alertas/{id}/reconhecer` | Alertas |
| GET | `/api/dashboard` | Indicadores |

## Frontend

```
src/
├── auth/         Contexto de sessão (JWT no localStorage)
├── components/   UI base (botões, campos, sheet, toast) e Layout
├── lib/          Cliente HTTP, tipos e formatação pt-BR
├── offline/      IndexedDB (Dexie), fila de sincronização, cache e projeção
└── pages/        Telas (rotas carregadas sob demanda)
```

### Como funciona o offline-first

1. **App shell**: o `vite-plugin-pwa` (Workbox) pré-carrega HTML, JS, CSS e imagens. O app abre e recarrega sem rede e pode ser instalado na tela inicial.
2. **Leituras** (`offline/cache.ts`): toda resposta GET é salva no IndexedDB. Em falha de rede, a última cópia é devolvida.
3. **Escritas** (`offline/sync.ts`): `enviar()` tenta a API. Sem rede, grava na tabela `fila`. Se já houver itens pendentes, a nova escrita entra no fim da fila para preservar a ordem.
4. **Sincronização** (`SyncContext`): dispara no evento `online` e a cada 30 s enquanto houver pendências. Para no primeiro erro de rede ou 401 (sem perder nada). Itens recusados pelo servidor (ex.: saldo insuficiente) ficam marcados para o usuário revisar ou descartar.
5. **Consistência visual** (`offline/pendentes.ts`): o saldo exibido é a foto do servidor com os lançamentos pendentes aplicados por cima, e o histórico mostra os pendentes com o selo "na fila".
6. **Sessão expirada** não apaga a fila: o app pede login novamente e continua de onde parou.

### Imagens

- **Fotos do campo** (`public/img/campo/`): usadas no carrossel da visão geral e da tela de entrada (`components/Carrossel.tsx`). Foram redimensionadas para até 1600 px e são pré-carregadas pelo service worker, então o carrossel funciona offline.
- **Fotos de produto**: a coluna `produtos.imagem` (migração V3) guarda um caminho público (`/img/produtos/...`, usado nos dados de demonstração) ou uma *data URL* JPEG enviada pelo app. O app reduz a foto para até 800 px antes de enviar (`prepararFoto` em `components/ImagemProduto.tsx`), e a API recusa imagens acima de ~300 KB. Sem foto, aparece o ícone da categoria.

### Design responsivo

Mobile-first com Tailwind, tipografia Inter (empacotada localmente, funciona offline), paleta neutra com verde só nas ações principais: barra de navegação inferior e formulários em *bottom sheet* no celular, menu lateral e diálogos centralizados a partir de `lg`. Os campos numéricos usam `inputMode="decimal"` para abrir o teclado numérico, e os botões têm 40 px de altura no celular.
