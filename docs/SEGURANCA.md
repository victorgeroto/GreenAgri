# Segurança do GreenAgri

Medidas adotadas no sistema, organizadas pelo [OWASP Top 10 (2021)](https://owasp.org/Top10/), mais as práticas de LGPD, do ambiente de produção e do processo de desenvolvimento. Cada item aponta onde está implementado.

## OWASP Top 10

| Risco | O que o GreenAgri faz | Onde |
|---|---|---|
| **A01 Quebra de controle de acesso** | Toda rota exige JWT, exceto login, cadastro e telemetria. Os dados são isolados por fazenda pelo Hibernate (`@TenantId`) em **toda** consulta, inclusive busca por ID, e só membros entram na fazenda (403). Ações destrutivas exigem perfil ADMIN (`@PreAuthorize`). | `FazendaFilter`, `FazendaTenantResolver`, `MultiFazendaIntegrationTest` |
| **A02 Falhas criptográficas** | Senhas com bcrypt custo 12. Chaves de dispositivo guardadas só como hash SHA-256 e comparadas em tempo constante. JWT HS256 com segredo de 32+ bytes obrigatório; em produção a API não sobe com segredo de exemplo. HSTS de 1 ano. | `SecurityConfig`, `ChaveDispositivo` |
| **A03 Injeção** | Acesso a dados só por JPA/JPQL com parâmetros (sem SQL concatenado; a única migração Java usa `PreparedStatement`). Entrada validada com Bean Validation. React escapa toda saída e a CSP impede scripts inline. | DTOs `*Dtos`, `V6__unicidade_por_fazenda` |
| **A04 Design inseguro** | Regras de negócio no servidor: saldo nunca negativo, status da lavoura que só avança, uma máquina por operador. A fila offline é idempotente (`idCliente`) e lançamentos são reenviados sempre para a fazenda de origem. | serviços de domínio |
| **A05 Configuração incorreta** | Sem segredos com valor padrão fora do perfil `dev`. Swagger e console H2 desligados em produção. Erros sem stack trace e com mensagem genérica para falhas internas. Cabeçalhos de segurança na API e no app. nginx sem versão exposta e sem servir arquivos ocultos. Containers sem root, `read_only` e `no-new-privileges`; banco e API sem portas publicadas. | `application-prod.yml`, `SecurityConfig`, `security-headers.conf`, `docker-compose.yml` |
| **A06 Componentes vulneráveis** | Dependabot semanal (Maven, npm, Actions). `npm audit` bloqueia o CI com vulnerabilidade alta ou crítica. Spring Boot na linha 3.5 com correções. | `.github/dependabot.yml`, `ci.yml` |
| **A07 Falhas de identificação e autenticação** | Bloqueio após 5 erros por e-mail + IP (15 min) e após 30 erros por IP, com HTTP 429 e `Retry-After`. Mesma mensagem e mesmo tempo de resposta para e-mail inexistente ou senha errada (sem enumeração de contas). Senha mínima de 10 caracteres, com letras e números, recusando senhas comuns ou que contenham o nome ou o e-mail (NIST SP 800-63B). Limite de 5 cadastros por hora por IP. A troca de senha exige a senha atual, segue a mesma política e bloqueia após 5 erros. Token de 8 h com `jti`, `nbf` e emissor validado. | `AuthService`, `LimitadorTentativas`, `PoliticaSenha`, `SegurancaIntegrationTest` |
| **A08 Falhas de integridade** | `package-lock.json` versionado e `npm ci` no CI. O service worker só abre destinos do próprio site. Upload de imagem aceito só como data URL de imagem (JPEG/PNG/WebP), com tamanho máximo. | `sw-notificacoes.js`, `ProdutoDtos`, `EstoqueDtos` |
| **A09 Falhas de log e monitoramento** | Logger dedicado `greenagri.seguranca` para login (sucesso, falha, bloqueio), criação de conta, troca de senha, acesso negado a fazenda e chave de dispositivo inválida. Nunca registra senha, token ou chave, e o e-mail é mascarado. | `Auditoria` |
| **A10 SSRF** | O servidor não busca URLs informadas pelo usuário. A busca de endereço (Nominatim) é feita pelo navegador e liberada na CSP só para esse domínio. | `LocalizarFazenda`, `security-headers.conf` |

## Proteções do navegador (CSP e cabeçalhos)

- **App** (nginx e `vite preview`): `Content-Security-Policy` só com scripts do próprio domínio (sem `unsafe-inline` ou `eval`). Imagens do mapa só do OpenStreetMap e da Esri, e conexões só com a própria API e a busca de endereço. Também: `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` (câmera e localização só para o próprio app).
- **API**: `default-src 'none'` (só devolve JSON), `Cache-Control: no-store`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- **Login nativo do navegador bloqueado**: o proxy remove `WWW-Authenticate`, e o app trata o 401 com aviso próprio.
- **Limite de tamanho**: requisições acima de 1 MB recebem 413, na API e no nginx.

## Telemetria dos dispositivos

Cada dispositivo tem chave própria de 192 bits (`POST /api/iot/dispositivos`, exibida uma única vez e guardada só como hash). Chaves erradas recebem a mesma resposta, exista o código ou não, e 20 erros em 10 minutos bloqueiam o IP. Em produção, use HTTPS ou TLS no gateway LoRaWAN, e grave a chave no ESP32 com criptografia de flash habilitada (ver `SISTEMA-EMBARCADO.md`).

## Segredos

- Nada sensível no repositório: senhas e chaves de demonstração são geradas na primeira execução em `.greenagri-demo/` (ignorado pelo Git).
- Produção: `GREENAGRI_JWT_SECRET`, `DB_USER` e `DB_PASSWORD` vêm do ambiente (`.env`, a partir do `.env.example`). Gere com `openssl rand -base64 48`. **Troque o segredo do JWT** para invalidar todos os tokens em caso de incidente.
- O histórico antigo do repositório (anterior à reestruturação) contém credenciais do projeto original. Considere-as comprometidas e não as reutilize em nenhum sistema.

## LGPD

- **Minimização**: só os dados necessários (nome, e-mail, perfil). Logs mascaram e-mails, e a equipe de campo não tem CPF, telefone nem endereço.
- **Isolamento**: cada fazenda (controlador dos dados) só vê os próprios registros.
- **Dados no aparelho**: o cache offline e a fila ficam no IndexedDB do navegador e são apagados ao sair da conta, com aviso se houver lançamentos não enviados.
- **Fotos**: reduzidas no aparelho antes do envio. A localização da fazenda só é obtida com a permissão do usuário.

## Riscos conhecidos e próximos passos

| Item | Situação |
|---|---|
| Token JWT no `localStorage` (necessário para o uso offline) | Mitigado pela CSP estrita, que bloqueia scripts injetados. Evolução: token de curta duração com refresh em cookie `HttpOnly`. |
| Limites de tentativa em memória | Adequados para uma instância. Com várias réplicas, mova para Redis ou para o WAF/gateway. |
| React Router 6 (aviso moderado de *open redirect* e de SSR) | Não explorável aqui: o app não navega para URLs vindas do usuário e não usa SSR. Migração para a v7 planejada. |
| Sem MFA | Recomendado para administradores (TOTP) numa próxima versão. |
| Sem revogação individual de token | Trocar o segredo do JWT invalida todos. Evolução: lista de `jti` revogados. |
