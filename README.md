# MIR4 Account Manager

Sistema compacto de gerenciamento de contas do jogo MIR4 com cálculo automático de valores em USD e sistema de confirmação automática.

## 🎮 Funcionalidades

- ✅ **Tabela Editável Compacta** (1200x800px): Clique e edite inline
- ✅ **Numeração de Contas**: Organização visual clara
- ✅ **Sistema de Confirmação**: Marque contagem concluída
- ✅ **Reset Automático**: Dados resetam após 30 dias da confirmação
- ✅ **Gerenciamento de Bosses**: M2-G8
- ✅ **Bosses Especiais**: Xama, Praça 4F, Cracha Épica
- ✅ **Cálculo USD Automático**: Totais em tempo real
- ✅ **Sem Spinners**: Campos numéricos limpos

## 🚀 Deploy Rápido

### Backend: Railway + MongoDB Atlas

1. **MongoDB Atlas** (5 min):
   - Criar cluster gratuito M0
   - Copiar connection string

2. **Railway** (5 min):
   - Deploy do `/backend`
   - Variáveis: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`

3. **Frontend: Vercel** (3 min):
   - Deploy do `/frontend`
   - Variável: `REACT_APP_BACKEND_URL`

Ver: `DEPLOY_GUIDE.md` para detalhes

## 💻 Desenvolvimento Local

### Requisitos:
- Node.js 18+
- Python 3.11+
- MongoDB (local ou Atlas)

### Backend:
```bash
cd backend
pip install -r requirements.txt

# Configurar .env
MONGO_URL=mongodb://localhost:27017
DB_NAME=mir4_manager
CORS_ORIGINS=http://localhost:3000

# Iniciar
uvicorn server:app --reload --port 8001
```

### Frontend:
```bash
cd frontend
yarn install

# Configurar .env
REACT_APP_BACKEND_URL=http://localhost:8001

# Iniciar
yarn start
```

## 📊 Sistema de Confirmação

- **Confirmar**: Click no ícone ⭕ → vira ✅
- **Reset Automático**: 30 dias após confirmação
- **Visual**: Linha fica verde quando confirmada

## 🎯 Layout Compacto

- **Tamanho**: 1200px x 800px (~1/4 Full HD)
- **Fontes**: Reduzidas (10px-12px)
- **Espaçamento**: Otimizado
- **Campos**: Sem spinners

## 🔧 Tecnologias

**Backend:**
- FastAPI + Motor (MongoDB async)
- Pydantic para validação
- Sistema de reset automático

**Frontend:**
- React 18
- Tailwind CSS
- Shadcn UI
- Axios

## 📝 Licença

MIT
