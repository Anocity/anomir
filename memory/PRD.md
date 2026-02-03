# MIR4 Account Manager - PRD

## Problem Statement Original
Continuidade do projeto anomir do GitHub com:
1. **Power formatado** - Usar separador de mil padrão (ex: 111.000, 1.518.834)
2. **Nova lógica de Recursos** - Cálculo por item final considerando cadeia Raro → Épico → Lendário

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB
- **Porta Backend**: 8001
- **Porta Frontend**: 3000

## Regras de Craft (Implementadas)
### Custos de Conversão
- **1 Épico** = 10 Raros + 25 Pó + 5.000 DS + 20.000 Cobre
- **1 Lendário** = 10 Épicos + 125 Pó + 25.000 DS + 100.000 Cobre

### Receitas dos Itens Finais
| Item | Material 1 | Material 2 | Material 3 |
|------|-----------|-----------|-----------|
| Garra | 300 Aço L | 100 Esfera L | 100 Lunar L |
| Escama | 300 Aço L | 100 Esfera L | 100 Lunar L |
| Couro | 300 Aço L | 100 Quintessência L | 100 Bugiganga L |
| Chifre | 300 Platina L | 100 Iluminante L | 100 Ânima L |
| Esfera | 300 Platina L | 100 Iluminante L | 100 Ânima L |
| Olho | Sem cálculo | - | - |

## O que foi Implementado (03/02/2026)
- [x] Campo Power com formatação pt-BR (separador de mil)
- [x] Modal de Recursos com seleção de itens finais
- [x] Filtro de materiais por item selecionado
- [x] Cálculo automático "O que falta" considerando cadeia completa
- [x] Item Olho sem cálculo (apenas seleção)
- [x] Auto-save dos dados no MongoDB
- [x] Backend API completo e funcional

## Backlog (P1)
- [ ] Melhorar UX de visualização de múltiplos itens simultaneamente
- [ ] Adicionar gráfico de progresso para cada item

## Backlog (P2)
- [ ] Exportar relatório de recursos
- [ ] Notificações quando item está pronto para craft

## User Personas
- Jogadores de MIR4 que gerenciam múltiplas contas
- Necessitam rastrear bosses, recursos e crafts

## Core Requirements
- Tabela editável inline para contas
- Cálculo automático de USD por boss
- Sistema de confirmação com reset automático (30 dias)
- Gestão de materiais por raridade
- Cálculo de recursos para itens lendários
