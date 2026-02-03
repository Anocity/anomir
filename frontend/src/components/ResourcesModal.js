import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { X, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const MATERIALS = [
  { key: "anima", name: "Anima" },
  { key: "bugiganga", name: "Bugiganga" },
  { key: "lunar", name: "Lunar" },
  { key: "iluminado", name: "Iluminado" },
  { key: "quintessencia", name: "Quintessência" },
  { key: "esfera", name: "Esfera" },
  { key: "platina", name: "Platina" },
  { key: "aco", name: "Aço" }
];

const CRAFT_ITEMS = [
  { key: "garra", name: "Garra", materials: ["aco", "esfera", "lunar"] },
  { key: "escama", name: "Escama", materials: ["aco", "esfera", "lunar"] },
  { key: "couro", name: "Couro", materials: ["aco", "quintessencia", "bugiganga"] },
  { key: "chifre", name: "Chifre", materials: ["platina", "iluminado", "anima"] },
  { key: "olho", name: "Olho", materials: ["platina", "iluminado", "anima"] },
  { key: "esfera_item", name: "Esfera", materials: null }
];

export default function ResourcesModal({ open, onClose, accounts, onAccountUpdate }) {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [localMaterials, setLocalMaterials] = useState({});
  const [localCraftResources, setLocalCraftResources] = useState({ po: 0, ds: 0, cobre: 0 });
  const [craftItems, setCraftItems] = useState([]);
  const saveTimeoutRef = useRef(null);

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId), 
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    if (open && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [open, accounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccount) {
      const mats = selectedAccount.materials || {};
      const initialMats = {};
      MATERIALS.forEach(m => {
        initialMats[m.key] = mats[m.key] || { raro: 0, epico: 0, lendario: 0 };
      });
      setLocalMaterials(initialMats);
      setLocalCraftResources(selectedAccount.craft_resources || { po: 0, ds: 0, cobre: 0 });
      setCraftItems(selectedAccount.craft_items || []);
    }
  }, [selectedAccount]);

  const handleMaterialChange = (matKey, tier, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setLocalMaterials(prev => ({
      ...prev,
      [matKey]: { ...prev[matKey], [tier]: numValue }
    }));
  };

  const handleCraftResourceChange = (key, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setLocalCraftResources(prev => ({ ...prev, [key]: numValue }));
  };

  const handleCraftItemToggle = async (itemKey) => {
    const newItems = craftItems.includes(itemKey)
      ? craftItems.filter(k => k !== itemKey)
      : [...craftItems, itemKey];
    
    setCraftItems(newItems);
    if (selectedAccountId) {
      try {
        await axios.put(`${API}/accounts/${selectedAccountId}`, { craft_items: newItems });
        onAccountUpdate(selectedAccountId, { craft_items: newItems });
      } catch (error) {
        console.error("Erro ao salvar:", error);
      }
    }
  };

  const saveData = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      await axios.put(`${API}/accounts/${selectedAccountId}`, {
        materials: localMaterials,
        craft_resources: localCraftResources
      });
      onAccountUpdate(selectedAccountId, { materials: localMaterials, craft_resources: localCraftResources });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados");
    }
  }, [selectedAccountId, localMaterials, localCraftResources, onAccountUpdate]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveData, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [localMaterials, localCraftResources]);

  const filteredMaterials = useMemo(() => {
    if (craftItems.length === 0) return [];
    const materialKeys = new Set();
    craftItems.forEach(itemKey => {
      const item = CRAFT_ITEMS.find(i => i.key === itemKey);
      if (item && item.materials) {
        item.materials.forEach(mat => materialKeys.add(mat));
      }
    });
    if (materialKeys.size === 0) return [];
    return MATERIALS.filter(mat => materialKeys.has(mat.key));
  }, [craftItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-mir-charcoal border border-white/10 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" data-testid="resources-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-secondary font-bold text-mir-gold uppercase">Recursos</h2>
            <div className="relative">
              <select
                value={selectedAccountId || ""}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="appearance-none bg-mir-obsidian border border-white/20 rounded px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:border-mir-gold cursor-pointer min-w-[150px]"
                data-testid="account-select"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Itens de Criação */}
          <div className="mb-4">
            <span className="text-xs text-slate-400 block mb-2">Itens que a conta possui:</span>
            <div className="flex gap-2 flex-wrap">
              {CRAFT_ITEMS.map(item => (
                <label 
                  key={item.key} 
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all text-xs ${
                    craftItems.includes(item.key)
                      ? 'bg-mir-gold/20 border border-mir-gold/50 text-mir-gold'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={craftItems.includes(item.key)}
                    onChange={() => handleCraftItemToggle(item.key)}
                    className="w-3 h-3 rounded accent-amber-500"
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </div>

          {/* Materiais */}
          {craftItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Selecione os itens de criação acima
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Os itens selecionados não possuem recursos
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-slate-500 uppercase">
                <div>Material</div>
                <div className="text-center text-blue-400">Raro</div>
                <div className="text-center text-purple-400">Épico</div>
                <div className="text-center text-amber-400">Lendário</div>
              </div>
              <div className="space-y-1 mb-4">
                {filteredMaterials.map(mat => (
                  <div key={mat.key} className="grid grid-cols-4 gap-2 items-center">
                    <div className="text-xs text-slate-300">{mat.name}</div>
                    {["raro", "epico", "lendario"].map(tier => (
                      <Input
                        key={tier}
                        type="number"
                        value={localMaterials[mat.key]?.[tier] || 0}
                        onChange={(e) => handleMaterialChange(mat.key, tier, e.target.value)}
                        className={`h-7 text-xs text-center bg-mir-obsidian border-white/10 ${
                          tier === "raro" ? "text-blue-400" : tier === "epico" ? "text-purple-400" : "text-amber-400"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Recursos de Craft */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-xs font-secondary text-white mb-2">Recursos de Craft</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "po", name: "Pó", color: "text-cyan-400" },
                    { key: "ds", name: "DS", color: "text-green-400" },
                    { key: "cobre", name: "Cobre", color: "text-orange-400" }
                  ].map(res => (
                    <div key={res.key}>
                      <label className={`text-[10px] ${res.color}`}>{res.name}</label>
                      <Input
                        type="number"
                        value={localCraftResources[res.key] || 0}
                        onChange={(e) => handleCraftResourceChange(res.key, e.target.value)}
                        className={`h-7 text-xs text-center bg-mir-obsidian border-white/10 ${res.color}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
