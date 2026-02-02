import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

// Opções dos selects
const FLOOR_OPTIONS = ["4F", "5F", "7F", "8F", "9F", "10F"];

const RAID_OPTIONS = [
  "Mina Demoníaca",
  "Covil do Tatu Sombrio",
  "Salão da Ganância",
  "Caserna do Pecador",
  "Cave do Viveiro",
  "Demônio da Alma do Submundo",
  "Mina Abandonada Ululante",
  "Ninho do Dragão de Fogo Escarlate",
  "Altar Oculto"
];

const RAID_BOSS_OPTIONS = [
  "Rei do Touro",
  "Demônio Aracnídeo",
  "Grande Centopeia",
  "Espectro do Osso",
  "Rei Nefariox",
  "Rei Abandonado",
  "Demente Infernal",
  "Trasgo Diabólico",
  "General de Terracota",
  "Asura",
  "Suserano",
  "Sagitário"
];

// Formatar power (100000 → 100k)
const formatPower = (value) => {
  if (!value || value < 1000) return value?.toString() || "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 100000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

export default function AccountInfoPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRefs = useRef({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  };

  const updateAccountInfo = (accountId, field, value) => {
    // Atualiza estado local imediatamente
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        const currentInfo = acc.account_info || {};
        return {
          ...acc,
          account_info: { ...currentInfo, [field]: value }
        };
      }
      return acc;
    }));

    // Debounce save
    if (saveTimeoutRefs.current[accountId]) {
      clearTimeout(saveTimeoutRefs.current[accountId]);
    }

    saveTimeoutRefs.current[accountId] = setTimeout(async () => {
      try {
        const account = accounts.find(a => a.id === accountId);
        const currentInfo = account?.account_info || {};
        await axios.put(`${API}/accounts/${accountId}`, {
          account_info: { ...currentInfo, [field]: value }
        });
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar");
      }
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mir-gold font-secondary text-2xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-3 px-2 pb-48">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-4 bg-mir-charcoal/80 border border-white/5 rounded-lg p-3 shadow-xl">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="text-slate-400 hover:text-white p-1.5"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-secondary font-bold text-mir-gold tracking-wide uppercase" data-testid="page-title">
                Informações das Contas
              </h1>
              <p className="text-slate-400 font-primary text-[10px]">
                Power, Praça, Pico, Raid e Raid Boss
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Contas */}
        <div className="bg-mir-charcoal/50 border border-white/5 rounded-lg shadow-xl overflow-x-auto">
          <table className="w-full text-xs" data-testid="accounts-info-table">
            <thead className="bg-white/5 sticky top-0">
              <tr>
                <th className="py-2 px-3 text-left text-[10px] uppercase tracking-wider font-secondary text-slate-400 border-r border-white/5 min-w-[120px]">
                  Conta
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[100px]">
                  Power
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[80px]">
                  Praça
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[80px]">
                  Praça ATQ
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[80px]">
                  Pico
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[180px]">
                  Raid
                </th>
                <th className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-secondary text-slate-400 min-w-[140px]">
                  Raid Boss
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => {
                const info = account.account_info || {};
                return (
                  <tr
                    key={account.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    data-testid={`account-row-${index}`}
                  >
                    {/* Nome da Conta */}
                    <td className="py-2 px-3 font-primary text-white border-r border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{index + 1}.</span>
                        <span className="truncate">{account.name}</span>
                      </div>
                    </td>

                    {/* Power */}
                    <td className="py-1 px-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={info.power || ""}
                          onChange={(e) => updateAccountInfo(account.id, "power", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-7 text-xs text-center bg-mir-obsidian border-white/10 text-cyan-400 pr-8"
                          data-testid={`power-${index}`}
                        />
                        {info.power >= 100000 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-cyan-400/70 pointer-events-none">
                            {formatPower(info.power)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Praça */}
                    <td className="py-1 px-2">
                      <select
                        value={info.praca || ""}
                        onChange={(e) => updateAccountInfo(account.id, "praca", e.target.value || null)}
                        className="w-full h-7 text-xs text-center bg-mir-obsidian border border-white/10 rounded text-white focus:outline-none focus:border-mir-gold cursor-pointer"
                        data-testid={`praca-${index}`}
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* Praça ATQ */}
                    <td className="py-1 px-2">
                      <select
                        value={info.praca_atq || ""}
                        onChange={(e) => updateAccountInfo(account.id, "praca_atq", e.target.value || null)}
                        className="w-full h-7 text-xs text-center bg-mir-obsidian border border-white/10 rounded text-white focus:outline-none focus:border-mir-gold cursor-pointer"
                        data-testid={`praca-atq-${index}`}
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* Pico */}
                    <td className="py-1 px-2">
                      <select
                        value={info.pico || ""}
                        onChange={(e) => updateAccountInfo(account.id, "pico", e.target.value || null)}
                        className="w-full h-7 text-xs text-center bg-mir-obsidian border border-white/10 rounded text-white focus:outline-none focus:border-mir-gold cursor-pointer"
                        data-testid={`pico-${index}`}
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* Raid */}
                    <td className="py-1 px-2">
                      <select
                        value={info.raid || ""}
                        onChange={(e) => updateAccountInfo(account.id, "raid", e.target.value || null)}
                        className="w-full h-7 text-xs bg-mir-obsidian border border-white/10 rounded text-white focus:outline-none focus:border-mir-gold cursor-pointer"
                        data-testid={`raid-${index}`}
                      >
                        <option value="">-</option>
                        {RAID_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                    {/* Raid Boss */}
                    <td className="py-1 px-2">
                      <select
                        value={info.raid_boss || ""}
                        onChange={(e) => updateAccountInfo(account.id, "raid_boss", e.target.value || null)}
                        className="w-full h-7 text-xs bg-mir-obsidian border border-white/10 rounded text-white focus:outline-none focus:border-mir-gold cursor-pointer"
                        data-testid={`raid-boss-${index}`}
                      >
                        <option value="">-</option>
                        {RAID_BOSS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {accounts.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              Nenhuma conta cadastrada.
            </div>
          )}
        </div>

        {/* Painel Fixo de Power Mínimo */}
        <div className="fixed bottom-4 right-4 bg-mir-charcoal border border-white/10 rounded-lg p-4 shadow-2xl max-w-xs" data-testid="power-info-panel">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-mir-gold" />
            <h3 className="text-sm font-secondary font-bold text-white">Power Mínimo</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            {/* Praça */}
            <div>
              <h4 className="text-mir-gold font-medium mb-1">Praça</h4>
              <div className="space-y-0.5 text-slate-300">
                <div className="flex justify-between">
                  <span>9F:</span>
                  <span className="text-cyan-400">140k</span>
                </div>
                <div className="flex justify-between">
                  <span>10F:</span>
                  <span className="text-cyan-400">208k</span>
                </div>
                <div className="flex justify-between">
                  <span>11F:</span>
                  <span className="text-cyan-400">270k</span>
                </div>
              </div>
            </div>

            {/* Pico */}
            <div>
              <h4 className="text-mir-gold font-medium mb-1">Pico</h4>
              <div className="space-y-0.5 text-slate-300">
                <div className="flex justify-between">
                  <span>9F:</span>
                  <span className="text-purple-400">146k</span>
                </div>
                <div className="flex justify-between">
                  <span>10F:</span>
                  <span className="text-purple-400">214k</span>
                </div>
                <div className="flex justify-between">
                  <span>11F:</span>
                  <span className="text-purple-400">275k</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
