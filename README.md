# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## MARIELA PDV — arquitetura de dados

Fluxo:

```text
UI (src/components/pdv, src/routes)
  ↓
Portas / hooks do PDV (src/services/ports.ts, src/features/*)
  ↓
Adaptador selecionado (src/services/pdv-data-source.ts)
  ├── mock  → src/services/mock  (dados locais de apresentação)
  └── api   → src/services/api   (PdvApiClient)
                ↓
              HTTP  →  MARIELA Backend (mariela-backend)
```

O PDV não possui banco próprio, não acessa MongoDB e não reproduz regras de
negócio: preço, estoque, caixa, venda e autenticação são autoridade do backend.

### Variáveis de ambiente

Veja `.env.example`.

- `VITE_API_URL` — URL base do mariela-backend, sem barra final. Todos os
  endpoints ficam sob `${VITE_API_URL}/api/v1/pdv`.
- `VITE_PDV_DATA_SOURCE` — `mock` (padrão) ou `api`. Não há fallback silencioso
  para mock quando `api` está configurado.

### Endpoints reais preparados

| Área | Endpoint |
| --- | --- |
| Auth | `POST /api/v1/pdv/auth/login` |
| Auth | `POST /api/v1/pdv/auth/refresh` (interno ao PdvApiClient) |
| Auth | `POST /api/v1/pdv/auth/logout` |
| Auth | `GET /api/v1/pdv/auth/me` |
| Caixa | `GET /api/v1/pdv/caixa/atual` |
| Caixa | `POST /api/v1/pdv/caixa/abertura` |
| Produtos | `GET /api/v1/pdv/produtos` |
| Produtos | `GET /api/v1/pdv/produtos/:id` |
| Clientes | `GET /api/v1/pdv/clientes` (envelope `{ data, meta }`) |
| Vendas | `POST /api/v1/pdv/vendas` |

Não existem (e não devem ser usados): `GET /api/v1/pdv/produtos/:id/variantes`,
`POST /api/v1/pdv/clientes`, `GET /api/v1/pdv/vendas/minhas`.

### Idempotência

A finalização gera uma única chave por tentativa com `crypto.randomUUID()`,
enviada no header `Idempotency-Key`. O retry da mesma tentativa reutiliza a
mesma chave. Se o backend adotar outro mecanismo, ajustar apenas
`src/services/api/vendas.api.ts`.

### Autenticação isolada

Chaves próprias: `mariela-pdv.accessToken`, `mariela-pdv.refreshToken`,
`mariela-pdv.vendedor`. Nada é importado do Backoffice.

### Scripts

- `npm run test` — testes (Vitest)
- `npm run typecheck`
- `npm run build`
