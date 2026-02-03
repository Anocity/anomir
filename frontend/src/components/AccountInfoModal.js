import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { X, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const FLOOR_OPTIONS = ["4F", "5F", "6F", "7F", "8F", "9F", "10F"];

const RAID_OPTIONS = [
  "Mina Demoníaca", "Covil do Tatu Sombrio", "Salão da Ganância", "Caserna do Pecador",
  "Cave do Viveiro", "Demônio da Alma do Submundo", "Mina Abandonada Ululante",
  "Ninho do Dragão de Fogo Escarlate", "Altar Oculto"
];

const RAID_BOSS_OPTIONS = [
  "Rei do Touro", "Demônio Aracnídeo", "Grande Centopeia", "Espectro do Osso",
  "Rei Nefariox", "Rei Abandonado", "Demente Infernal", "Trasgo Diabólico",
  "General de Terracota", "Asura", "Suserano", "Sagitário"
];

export default function AccountInfoModal({ open, onClose, accounts, onAccountUpdate, onAccountDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const saveTimeoutRefs = useRef({});

  const updateAccountInfo = (accountId, field, value) => {
    const account = accounts.find(a => a.id === accountId);
    const currentInfo = account?.account_info || {};
    const newInfo = { ...currentInfo, [field]: value };
    
    onAccountUpdate(accountId, { account_info: newInfo });

    if (saveTimeoutRefs.current[accountId]) {
      clearTimeout(saveTimeoutRefs.current[accountId]);
    }

    saveTimeoutRefs.current[accountId] = setTimeout(async () => {
      try {
        await axios.put(`${API}/accounts/${accountId}`, { account_info: newInfo });
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar");
      }
    }, 500);
  };

  const handleDelete = async (accountId) => {
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      onAccountDelete(accountId);
      setDeleteConfirm(null);
      toast.success("Conta deletada");
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-mir-charcoal border border-white/10 rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden" data-testid="account-info-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-secondary font-bold text-mir-gold uppercase">Info Contas</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-x-auto max-h-[calc(85vh-80px)]">
          <table className="w-full text-xs">
            <thead className="bg-white/5 sticky top-0">
              <tr>
                <th className="py-2 px-2 text-left text-[10px] uppercase text-slate-400 min-w-[100px]">Conta</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 w-[60px]">Level</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 w-[90px]">Power</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 w-[65px]">Praça</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 w-[65px]">Praça ATQ</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 w-[65px]">Pico</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 min-w-[140px]">Raid</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-slate-400 min-w-[110px]">Raid Boss</th>
                <th className="py-2 px-2 text-center text-[10px] uppercase text-red-400 w-[50px]">Del</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => {
                const info = account.account_info || {};
                return (
                  <tr key={account.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-1 px-2 text-white">
                      <span className="text-slate-500 text-[10px] mr-1">{index + 1}.</span>
                      {account.name}
                    </td>
                    <td className="py-1 px-1">
                      <Input
                        type="number"
                        value={info.level || ""}
                        onChange={(e) => updateAccountInfo(account.id, "level", parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-6 text-[11px] text-center bg-mir-obsidian border-white/10 text-amber-400 px-1"
                      />
                    </td>
                    <td className="py-1 px-1">
                      <Input
                        type="text"
                        value={info.power ? info.power.toLocaleString('pt-BR') : ""}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                          updateAccountInfo(account.id, "power", parseInt(rawValue) || 0);
                        }}
                        placeholder="0"
                        className="h-6 text-[11px] text-center bg-mir-obsidian border-white/10 text-cyan-400 px-1"
                        data-testid={`power-input-${account.id}`}
                      />
                    </td>
                    <td className="py-1 px-1">
                      <select
                        value={info.praca || ""}
                        onChange={(e) => updateAccountInfo(account.id, "praca", e.target.value || null)}
                        className="w-full h-6 text-[11px] text-center bg-mir-obsidian border border-white/10 rounded text-white"
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <select
                        value={info.praca_atq || ""}
                        onChange={(e) => updateAccountInfo(account.id, "praca_atq", e.target.value || null)}
                        className="w-full h-6 text-[11px] text-center bg-mir-obsidian border border-white/10 rounded text-white"
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <select
                        value={info.pico || ""}
                        onChange={(e) => updateAccountInfo(account.id, "pico", e.target.value || null)}
                        className="w-full h-6 text-[11px] text-center bg-mir-obsidian border border-white/10 rounded text-white"
                      >
                        <option value="">-</option>
                        {FLOOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <select
                        value={info.raid || ""}
                        onChange={(e) => updateAccountInfo(account.id, "raid", e.target.value || null)}
                        className="w-full h-6 text-[11px] bg-mir-obsidian border border-white/10 rounded text-white"
                      >
                        <option value="">-</option>
                        {RAID_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <select
                        value={info.raid_boss || ""}
                        onChange={(e) => updateAccountInfo(account.id, "raid_boss", e.target.value || null)}
                        className="w-full h-6 text-[11px] bg-mir-obsidian border border-white/10 rounded text-white"
                      >
                        <option value="">-</option>
                        {RAID_BOSS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-1 text-center">
                      {deleteConfirm === account.id ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleDelete(account.id)} className="px-1.5 py-0.5 bg-red-600 rounded text-[9px] text-white">Sim</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-0.5 bg-zinc-700 rounded text-[9px] text-white">Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(account.id)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <div className="p-8 text-center text-slate-400">Nenhuma conta cadastrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
