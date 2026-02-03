import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { X, ChevronDown, Calculator } from "lucide-react";
import { Input } from "./ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

// Materiais disponíveis
const MATERIALS = [
  { key: "aco", name: "Aço" },
  { key: "esfera", name: "Esfera" },
  { key: "lunar", name: "Lunar" },
  { key: "quintessencia", name: "Quintessência" },
  { key: "bugiganga", name: "Bugiganga" },
  { key: "platina", name: "Platina" },
  { key: "iluminado", name: "Iluminado" },
  { key: "anima", name: "Ânima" }
];

// Itens finais e suas regras de materiais lendários necessários
const FINAL_ITEMS = {
  garra: {
    name: "Garra",
    recipe: [
      { key: "aco", name: "Aço Lendário", qty: 300 },
      { key: "esfera", name: "Esfera Lendária", qty: 100 },
      { key: "lunar", name: "Lunar Lendário", qty: 100 }
    ]
  },
  escama: {
    name: "Escama",
    recipe: [
      { key: "aco", name: "Aço Lendário", qty: 300 },
      { key: "esfera", name: "Esfera Lendária", qty: 100 },
      { key: "lunar", name: "Lunar Lendário", qty: 100 }
    ]
  },
  couro: {
    name: "Couro",
    recipe: [
      { key: "aco", name: "Aço Lendário", qty: 300 },
      { key: "quintessencia", name: "Quintessência Lendária", qty: 100 },
      { key: "bugiganga", name: "Bugiganga Lendária", qty: 100 }
    ]
  },
  chifre: {
    name: "Chifre",
    recipe: [
      { key: "platina", name: "Platina Lendária", qty: 300 },
      { key: "iluminado", name: "Iluminante Lendário", qty: 100 },
      { key: "anima", name: "Ânima Lendária", qty: 100 }
    ]
  },
  esfera_item: {
    name: "Esfera",
    recipe: [
      { key: "platina", name: "Platina Lendária", qty: 300 },
      { key: "iluminado", name: "Iluminante Lendário", qty: 100 },
      { key: "anima", name: "Ânima Lendária", qty: 100 }
    ]
  },
  olho: {
    name: "Olho",
    recipe: null // Sem regra de cálculo
  }
};

// Custos de craft
const CRAFT_COSTS = {
  epico: { raro: 10, po: 25, cobre: 20000, ds: 5000 },
  lendario: { epico: 10, po: 125, cobre: 100000, ds: 25000 }
};

// Calcula o que falta para um item final
function calculateMissing(itemKey, materials, craftResources) {
  const item = FINAL_ITEMS[itemKey];
  if (!item || !item.recipe) return null;

  const results = [];
  let totalPoNeeded = 0;
  let totalDsNeeded = 0;
  let totalCobreNeeded = 0;

  for (const ingredient of item.recipe) {
    const mat = materials[ingredient.key] || { raro: 0, epico: 0, lendario: 0 };
    const needed = ingredient.qty;
    const have = mat.lendario || 0;
    
    const lendFalta = Math.max(0, needed - have);
    
    if (lendFalta === 0) {
      results.push({
        ...ingredient,
        have,
        missing: 0,
        raroNeeded: 0,
        epicoNeeded: 0,
        lendNeeded: 0
      });
      continue;
    }

    const epicoNecessarioTotal = lendFalta * CRAFT_COSTS.lendario.epico;
    const epicoDisponivel = mat.epico || 0;
    const epicoFalta = Math.max(0, epicoNecessarioTotal - epicoDisponivel);

    const raroNecessarioTotal = epicoFalta * CRAFT_COSTS.epico.raro;
    const raroDisponivel = mat.raro || 0;
    const raroFalta = Math.max(0, raroNecessarioTotal - raroDisponivel);

    const epicosACraftar = epicoFalta;
    if (epicosACraftar > 0) {
      totalPoNeeded += epicosACraftar * CRAFT_COSTS.epico.po;
      totalDsNeeded += epicosACraftar * CRAFT_COSTS.epico.ds;
      totalCobreNeeded += epicosACraftar * CRAFT_COSTS.epico.cobre;
    }

    totalPoNeeded += lendFalta * CRAFT_COSTS.lendario.po;
    totalDsNeeded += lendFalta * CRAFT_COSTS.lendario.ds;
    totalCobreNeeded += lendFalta * CRAFT_COSTS.lendario.cobre;

    results.push({
      ...ingredient,
      have,
      missing: lendFalta,
      raroNeeded: raroFalta,
      epicoNeeded: epicoFalta,
      lendNeeded: lendFalta
    });
  }

  const poAtual = craftResources.po || 0;
  const dsAtual = craftResources.ds || 0;
  const cobreAtual = craftResources.cobre || 0;

  return {
    ingredients: results,
    resources: {
      po: { needed: totalPoNeeded, have: poAtual, missing: Math.max(0, totalPoNeeded - poAtual) },
      ds: { needed: totalDsNeeded, have: dsAtual, missing: Math.max(0, totalDsNeeded - dsAtual) },
      cobre: { needed: totalCobreNeeded, have: cobreAtual, missing: Math.max(0, totalCobreNeeded - cobreAtual) }
    },
    isComplete: results.every(r => r.missing === 0) && 
                totalPoNeeded <= poAtual && 
                totalDsNeeded <= dsAtual && 
                totalCobreNeeded <= cobreAtual
  };
}

export default function ResourcesModal({ open, onClose, accounts, onAccountUpdate }) {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [localMaterials, setLocalMaterials] = useState({});
  const [localCraftResources, setLocalCraftResources] = useState({ po: 0, ds: 0, cobre: 0 });
  const [craftItems, setCraftItems] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Seleciona primeira conta quando modal abre
  useEffect(() => {
    if (open && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
    if (!open) {
      isInitializedRef.current = false;
    }
  }, [open, accounts, selectedAccountId]);

  // Carrega dados da conta selecionada (apenas uma vez ou quando muda conta)
  useEffect(() => {
    if (!selectedAccountId || !accounts.length) return;
    
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    const mats = account.materials || {};
    const initialMats = {};
    MATERIALS.forEach(m => {
      initialMats[m.key] = mats[m.key] || { raro: 0, epico: 0, lendario: 0 };
    });
    setLocalMaterials(initialMats);
    setLocalCraftResources(account.craft_resources || { po: 0, ds: 0, cobre: 0 });
    setCraftItems(account.craft_items || []);
    setIsDirty(false);
    isInitializedRef.current = true;
  }, [selectedAccountId]); // Removido accounts das dependências para evitar re-inicialização

  const handleMaterialChange = (matKey, tier, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setLocalMaterials(prev => ({
      ...prev,
      [matKey]: { ...prev[matKey], [tier]: numValue }
    }));
    setIsDirty(true);
  };

  const handleCraftResourceChange = (key, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setLocalCraftResources(prev => ({ ...prev, [key]: numValue }));
    setIsDirty(true);
  };

  const handleCraftItemToggle = async (itemKey) => {
    const newItems = craftItems.includes(itemKey)
      ? craftItems.filter(k => k !== itemKey)
      : [...craftItems, itemKey];
    
    setCraftItems(newItems);
    if (selectedAccountId) {
      try {
        await axios.put(`${API}/accounts/${selectedAccountId}`, { craft_items: newItems });
        // Não chama onAccountUpdate para evitar re-render
      } catch (error) {
        console.error("Erro ao salvar:", error);
      }
    }
  };

  // Auto-save com debounce - só salva no backend, não atualiza o pai
  useEffect(() => {
    if (!isDirty || !selectedAccountId || !isInitializedRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await axios.put(`${API}/accounts/${selectedAccountId}`, {
          materials: localMaterials,
          craft_resources: localCraftResources
        });
        // Não chama onAccountUpdate durante edição para evitar re-render
        setIsDirty(false);
      } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar dados");
      }
    }, 800); // Aumentado para 800ms
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localMaterials, localCraftResources, isDirty, selectedAccountId]);

  // Atualiza o pai apenas quando fecha o modal
  const handleClose = useCallback(() => {
    if (selectedAccountId && isInitializedRef.current) {
      onAccountUpdate(selectedAccountId, { 
        materials: localMaterials, 
        craft_resources: localCraftResources,
        craft_items: craftItems
      });
    }
    onClose();
  }, [selectedAccountId, localMaterials, localCraftResources, craftItems, onAccountUpdate, onClose]);

  // Filtra materiais com base nos itens selecionados
  const filteredMaterials = useMemo(() => {
    if (craftItems.length === 0) return [];
    
    const materialKeys = new Set();
    craftItems.forEach(itemKey => {
      const item = FINAL_ITEMS[itemKey];
      if (item && item.recipe) {
        item.recipe.forEach(ing => materialKeys.add(ing.key));
      }
    });
    
    if (materialKeys.size === 0) return [];
    return MATERIALS.filter(mat => materialKeys.has(mat.key));
  }, [craftItems]);

  // Calcula o que falta para cada item selecionado
  const missingCalculations = useMemo(() => {
    const results = {};
    craftItems.forEach(itemKey => {
      if (FINAL_ITEMS[itemKey] && FINAL_ITEMS[itemKey].recipe) {
        results[itemKey] = calculateMissing(itemKey, localMaterials, localCraftResources);
      }
    });
    return results;
  }, [craftItems, localMaterials, localCraftResources]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />
      <div className="relative bg-mir-charcoal border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" data-testid="resources-modal">
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
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1" data-testid="close-modal-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Seleção de Itens Finais */}
          <div className="mb-4">
            <span className="text-xs text-slate-400 block mb-2">Selecione os itens que deseja criar:</span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(FINAL_ITEMS).map(([key, item]) => (
                <label 
                  key={key} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-all text-xs ${
                    craftItems.includes(key)
                      ? 'bg-mir-gold/20 border border-mir-gold/50 text-mir-gold'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                  data-testid={`item-${key}`}
                >
                  <input
                    type="checkbox"
                    checked={craftItems.includes(key)}
                    onChange={() => handleCraftItemToggle(key)}
                    className="w-3 h-3 rounded accent-amber-500"
                  />
                  {item.name}
                  {key === 'olho' && <span className="text-[9px] text-slate-500 ml-1">(sem cálculo)</span>}
                </label>
              ))}
            </div>
          </div>

          {craftItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Selecione os itens que deseja criar acima
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Coluna 1: Estoque de Materiais */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-secondary font-bold text-white mb-3 flex items-center gap-2">
                  <span>Estoque de Materiais</span>
                  <span className="text-[10px] text-slate-400 font-normal">(quantidade que você possui)</span>
                </h3>
                
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    Os itens selecionados não possuem materiais
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-slate-500 uppercase">
                      <div>Material</div>
                      <div className="text-center text-blue-400">Raro</div>
                      <div className="text-center text-purple-400">Épico</div>
                      <div className="text-center text-amber-400">Lendário</div>
                    </div>
                    <div className="space-y-1.5">
                      {filteredMaterials.map(mat => (
                        <div key={mat.key} className="grid grid-cols-4 gap-2 items-center">
                          <div className="text-xs text-slate-300">{mat.name}</div>
                          {["raro", "epico", "lendario"].map(tier => (
                            <Input
                              key={`${mat.key}-${tier}`}
                              type="number"
                              value={localMaterials[mat.key]?.[tier] || 0}
                              onChange={(e) => handleMaterialChange(mat.key, tier, e.target.value)}
                              className={`h-7 text-xs text-center bg-mir-obsidian border-white/10 ${
                                tier === "raro" ? "text-blue-400" : tier === "epico" ? "text-purple-400" : "text-amber-400"
                              }`}
                              data-testid={`material-${mat.key}-${tier}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Recursos de Craft */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-secondary text-white mb-2">Recursos de Craft</h4>
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
                          data-testid={`craft-${res.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna 2: O que falta */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-sm font-secondary font-bold text-white mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-mir-gold" />
                  <span>O que falta para criar</span>
                </h3>

                <div className="space-y-4">
                  {craftItems.map(itemKey => {
                    const item = FINAL_ITEMS[itemKey];
                    const calc = missingCalculations[itemKey];
                    
                    if (!item) return null;
                    
                    // Olho não tem cálculo
                    if (itemKey === 'olho') {
                      return (
                        <div key={itemKey} className="p-3 bg-mir-obsidian/50 rounded-lg border border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-mir-gold">{item.name}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Apenas seleção</span>
                          </div>
                          <p className="text-[11px] text-slate-400">Este item não possui regra de cálculo.</p>
                        </div>
                      );
                    }

                    if (!calc) return null;

                    return (
                      <div key={itemKey} className={`p-3 rounded-lg border ${
                        calc.isComplete 
                          ? 'bg-green-900/20 border-green-500/30' 
                          : 'bg-mir-obsidian/50 border-white/5'
                      }`} data-testid={`missing-${itemKey}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-mir-gold">{item.name}</span>
                          {calc.isComplete && (
                            <span className="text-[10px] text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                              ✓ Pronto!
                            </span>
                          )}
                        </div>

                        {/* Materiais Faltando */}
                        <div className="space-y-1 mb-3">
                          <div className="text-[10px] text-slate-500 uppercase mb-1">Materiais Lendários</div>
                          {calc.ingredients.map(ing => (
                            <div key={ing.key} className="flex justify-between text-xs">
                              <span className="text-slate-300">{ing.name}</span>
                              {ing.missing === 0 ? (
                                <span className="text-green-400">✓ {ing.have}/{ing.qty}</span>
                              ) : (
                                <span className="text-red-400">
                                  Falta: {ing.missing.toLocaleString('pt-BR')}
                                  <span className="text-slate-500 ml-1">({ing.have}/{ing.qty})</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Recursos Faltando */}
                        {!calc.isComplete && (
                          <div className="pt-2 border-t border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Recursos para Craft</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {[
                                { key: "po", name: "Pó", color: "cyan" },
                                { key: "ds", name: "DS", color: "green" },
                                { key: "cobre", name: "Cobre", color: "orange" }
                              ].map(res => {
                                const data = calc.resources[res.key];
                                return (
                                  <div key={res.key} className="text-center">
                                    <div className={`text-${res.color}-400 text-[10px]`}>{res.name}</div>
                                    {data.missing === 0 ? (
                                      <div className="text-green-400">✓</div>
                                    ) : (
                                      <div className="text-red-400">-{data.missing.toLocaleString('pt-BR')}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-slate-500">
                  <div className="font-semibold mb-1">Regras de Craft:</div>
                  <div>1 Épico = 10 Raros + 25 Pó + 5.000 DS + 20.000 Cobre</div>
                  <div>1 Lendário = 10 Épicos + 125 Pó + 25.000 DS + 100.000 Cobre</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
