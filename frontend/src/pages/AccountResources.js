import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Trophy, Sword, Shield, Gem, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

// Materiais na ordem fixa
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

// Itens de criação e seus materiais compatíveis
const CRAFT_ITEMS = [
  { key: "garra", name: "Garra", materials: ["aco", "esfera", "lunar"] },
  { key: "escama", name: "Escama", materials: ["aco", "esfera", "lunar"] },
  { key: "couro", name: "Couro", materials: ["aco", "quintessencia", "bugiganga"] },
  { key: "chifre", name: "Chifre", materials: ["platina", "iluminado", "anima"] },
  { key: "olho", name: "Olho", materials: null }, // Sem filtro
  { key: "esfera_item", name: "Esfera", materials: null } // Sem filtro, apenas anotação
];

// Custos de craft
const CRAFT_COSTS = {
  epico: { raro: 10, po: 25, ds: 5000, cobre: 20000 },
  lendario: { epico: 10, po: 125, ds: 25000, cobre: 100000 }
};

// Receitas dos objetivos lendários
const OBJECTIVES = {
  arma: {
    name: "Arma Lendária",
    icon: Sword,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    barColor: "bg-red-400",
    ingredients: [
      { key: "aco", name: "Aço", required: 300 },
      { key: "esfera", name: "Esfera", required: 100 },
      { key: "lunar", name: "Lunar", required: 100 }
    ]
  },
  torso: {
    name: "Torso Lendário",
    icon: Shield,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    barColor: "bg-blue-400",
    ingredients: [
      { key: "aco", name: "Aço", required: 300 },
      { key: "quintessencia", name: "Quintessência", required: 100 },
      { key: "bugiganga", name: "Bugiganga", required: 100 }
    ]
  },
  colar: {
    name: "Colar Lendário",
    icon: Gem,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    barColor: "bg-purple-400",
    ingredients: [
      { key: "platina", name: "Platina", required: 300 },
      { key: "iluminado", name: "Iluminado", required: 100 },
      { key: "anima", name: "Anima", required: 100 }
    ]
  }
};

// Função para calcular craft em cadeia para um material específico
function calculateCraftableLegendary(material, craftRes) {
  let raro = material.raro || 0;
  let epico = material.epico || 0;
  let lendario = material.lendario || 0;
  let po = craftRes.po;
  let ds = craftRes.ds;
  let cobre = craftRes.cobre;

  // Passo A: craftar épicos a partir de raros
  const epicosPorRaro = Math.floor(raro / CRAFT_COSTS.epico.raro);
  const epicosPorPo = Math.floor(po / CRAFT_COSTS.epico.po);
  const epicosPorDs = Math.floor(ds / CRAFT_COSTS.epico.ds);
  const epicosPorCobre = Math.floor(cobre / CRAFT_COSTS.epico.cobre);
  const epicosCraftaveis = Math.min(epicosPorRaro, epicosPorPo, epicosPorDs, epicosPorCobre);

  epico += epicosCraftaveis;
  raro -= epicosCraftaveis * CRAFT_COSTS.epico.raro;
  po -= epicosCraftaveis * CRAFT_COSTS.epico.po;
  ds -= epicosCraftaveis * CRAFT_COSTS.epico.ds;
  cobre -= epicosCraftaveis * CRAFT_COSTS.epico.cobre;

  // Passo B: craftar lendários a partir de épicos
  const lendPorEpico = Math.floor(epico / CRAFT_COSTS.lendario.epico);
  const lendPorPo = Math.floor(po / CRAFT_COSTS.lendario.po);
  const lendPorDs = Math.floor(ds / CRAFT_COSTS.lendario.ds);
  const lendPorCobre = Math.floor(cobre / CRAFT_COSTS.lendario.cobre);
  const lendCraftaveis = Math.min(lendPorEpico, lendPorPo, lendPorDs, lendPorCobre);

  const lendTotal = lendario + lendCraftaveis;
  po -= lendCraftaveis * CRAFT_COSTS.lendario.po;
  ds -= lendCraftaveis * CRAFT_COSTS.lendario.ds;
  cobre -= lendCraftaveis * CRAFT_COSTS.lendario.cobre;

  return {
    lendTotal,
    remainingResources: { po, ds, cobre },
    craftDetails: {
      epicosCraftados: epicosCraftaveis,
      lendCraftados: lendCraftaveis
    }
  };
}

// Função para calcular progresso de um objetivo considerando craft em cadeia
function calculateObjectiveWithCraft(objectiveKey, materials, craftResources) {
  const objective = OBJECTIVES[objectiveKey];
  let po = craftResources.po || 0;
  let ds = craftResources.ds || 0;
  let cobre = craftResources.cobre || 0;

  const ingredientResults = [];
  let minProgress = Infinity;

  // Processa cada ingrediente do objetivo em sequência
  // Os recursos são compartilhados e consumidos em ordem
  for (const ing of objective.ingredients) {
    const mat = materials[ing.key] || { raro: 0, epico: 0, lendario: 0 };
    const result = calculateCraftableLegendary(mat, { po, ds, cobre });
    
    // Atualiza recursos restantes para próximo ingrediente
    po = result.remainingResources.po;
    ds = result.remainingResources.ds;
    cobre = result.remainingResources.cobre;

    const have = result.lendTotal;
    const missing = Math.max(0, ing.required - have);
    const progress = Math.min(1, have / ing.required);

    ingredientResults.push({
      ...ing,
      have,
      missing,
      progress,
      craftDetails: result.craftDetails
    });

    minProgress = Math.min(minProgress, progress);
  }

  // Verifica se recursos são gargalo
  const resourceBottleneck = {
    po: po < 0,
    ds: ds < 0,
    cobre: cobre < 0
  };

  return {
    progress: minProgress === Infinity ? 0 : minProgress,
    percentage: Math.round((minProgress === Infinity ? 0 : minProgress) * 100),
    ingredients: ingredientResults,
    remainingResources: { po: Math.max(0, po), ds: Math.max(0, ds), cobre: Math.max(0, cobre) },
    resourceBottleneck
  };
}

// Calcula quanto recurso falta para completar objetivo
function calculateResourceDeficit(objectiveKey, materials, craftResources) {
  const objective = OBJECTIVES[objectiveKey];
  let totalPoNeeded = 0;
  let totalDsNeeded = 0;
  let totalCobreNeeded = 0;

  for (const ing of objective.ingredients) {
    const mat = materials[ing.key] || { raro: 0, epico: 0, lendario: 0 };
    const lendarioAtual = mat.lendario || 0;
    const epicoAtual = mat.epico || 0;
    const raroAtual = mat.raro || 0;

    const lendFalta = Math.max(0, ing.required - lendarioAtual);
    if (lendFalta === 0) continue;

    // Quanto épico precisa para fazer os lendários faltantes
    const epicoNecessario = lendFalta * CRAFT_COSTS.lendario.epico;
    const epicoFalta = Math.max(0, epicoNecessario - epicoAtual);

    // Quanto raro precisa para fazer os épicos faltantes
    const raroNecessario = epicoFalta * CRAFT_COSTS.epico.raro;
    const raroFalta = Math.max(0, raroNecessario - raroAtual);

    // Recursos para craftar épicos
    const epicosACraftar = Math.ceil(epicoFalta);
    totalPoNeeded += epicosACraftar * CRAFT_COSTS.epico.po;
    totalDsNeeded += epicosACraftar * CRAFT_COSTS.epico.ds;
    totalCobreNeeded += epicosACraftar * CRAFT_COSTS.epico.cobre;

    // Recursos para craftar lendários
    totalPoNeeded += lendFalta * CRAFT_COSTS.lendario.po;
    totalDsNeeded += lendFalta * CRAFT_COSTS.lendario.ds;
    totalCobreNeeded += lendFalta * CRAFT_COSTS.lendario.cobre;
  }

  const poAtual = craftResources.po || 0;
  const dsAtual = craftResources.ds || 0;
  const cobreAtual = craftResources.cobre || 0;

  return {
    po: Math.max(0, totalPoNeeded - poAtual),
    ds: Math.max(0, totalDsNeeded - dsAtual),
    cobre: Math.max(0, totalCobreNeeded - cobreAtual)
  };
}

export default function AccountResources() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localMaterials, setLocalMaterials] = useState({});
  const [localCraftResources, setLocalCraftResources] = useState({ po: 0, ds: 0, cobre: 0 });
  const [craftItem, setCraftItem] = useState(null);

  const fetchAccount = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/accounts/${accountId}`);
      setAccount(response.data);
      
      // Inicializa materiais
      const mats = response.data.materials || {};
      const initialMats = {};
      MATERIALS.forEach(m => {
        initialMats[m.key] = mats[m.key] || { raro: 0, epico: 0, lendario: 0 };
      });
      setLocalMaterials(initialMats);
      
      // Inicializa recursos de craft
      setLocalCraftResources(response.data.craft_resources || { po: 0, ds: 0, cobre: 0 });
      
      // Carrega item de criação salvo
      setCraftItem(response.data.craft_item || null);
    } catch (error) {
      console.error("Erro ao carregar conta:", error);
      toast.error("Erro ao carregar dados da conta");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [accountId, navigate]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

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

  const handleCraftItemChange = async (value) => {
    setCraftItem(value);
    // Salva imediatamente no banco
    try {
      await axios.put(`${API}/accounts/${accountId}`, { craft_item: value });
    } catch (error) {
      console.error("Erro ao salvar item:", error);
    }
  };

  const saveData = async () => {
    try {
      await axios.put(`${API}/accounts/${accountId}`, {
        materials: localMaterials,
        craft_resources: localCraftResources
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados");
    }
  };

  // Auto-save com debounce (salva 500ms após última alteração)
  const saveTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (!account) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveData();
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localMaterials, localCraftResources]);

  // Filtra materiais com base no item de criação selecionado
  const filteredMaterials = useMemo(() => {
    if (!craftItem) return MATERIALS;
    const selectedItem = CRAFT_ITEMS.find(item => item.key === craftItem);
    if (!selectedItem || !selectedItem.materials) return MATERIALS;
    return MATERIALS.filter(mat => selectedItem.materials.includes(mat.key));
  }, [craftItem]);

  // Calcula objetivos usando useMemo para performance
  const objectiveResults = useMemo(() => {
    const results = {};
    Object.keys(OBJECTIVES).forEach(key => {
      results[key] = {
        ...calculateObjectiveWithCraft(key, localMaterials, localCraftResources),
        deficit: calculateResourceDeficit(key, localMaterials, localCraftResources)
      };
    });
    return results;
  }, [localMaterials, localCraftResources]);

  // Encontra objetivo mais próximo
  const closest = useMemo(() => {
    let best = null;
    let highestProgress = -1;
    
    Object.entries(objectiveResults).forEach(([key, result]) => {
      if (result.percentage > highestProgress) {
        highestProgress = result.percentage;
        best = { key, ...OBJECTIVES[key], ...result };
      }
    });
    
    return best;
  }, [objectiveResults]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mir-gold font-secondary text-2xl">Carregando...</div>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="min-h-screen py-3 px-2">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-3 bg-mir-charcoal/80 border border-white/5 rounded-lg p-3 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/")}
                variant="ghost"
                className="text-slate-400 hover:text-white p-1.5"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-secondary font-bold text-mir-gold tracking-wide uppercase" data-testid="account-name">
                  {account.name}
                </h1>
                <p className="text-slate-400 font-primary text-[10px]">
                  Recursos e Objetivos Lendários
                </p>
              </div>
            </div>
            
            {/* Select Item de Criação */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Item:</span>
              <div className="relative">
                <select
                  value={craftItem || ""}
                  onChange={(e) => handleCraftItemChange(e.target.value || null)}
                  className="appearance-none bg-mir-obsidian border border-white/20 rounded px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:border-mir-gold cursor-pointer min-w-[120px]"
                  data-testid="craft-item-select"
                >
                  <option value="">Todos</option>
                  {CRAFT_ITEMS.map(item => (
                    <option key={item.key} value={item.key}>{item.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Coluna 1: Materiais */}
          <div className="lg:col-span-2 bg-mir-charcoal/50 border border-white/5 rounded-lg p-3 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-secondary font-bold text-white" data-testid="materials-title">
                Materiais por Raridade
              </h2>
              {craftItem && (
                <span className="text-[10px] text-mir-gold bg-mir-gold/10 px-2 py-0.5 rounded">
                  Filtro: {CRAFT_ITEMS.find(i => i.key === craftItem)?.name}
                </span>
              )}
            </div>
            
            {/* Header da tabela */}
            <div className="grid grid-cols-4 gap-1 mb-2 text-[10px] text-slate-500 uppercase">
              <div>Material</div>
              <div className="text-center text-blue-400">Raro</div>
              <div className="text-center text-purple-400">Épico</div>
              <div className="text-center text-amber-400">Lendário</div>
            </div>
            
            {/* Linhas de materiais */}
            <div className="space-y-1">
              {filteredMaterials.map(mat => (
                <div key={mat.key} className="grid grid-cols-4 gap-1 items-center">
                  <div className="text-xs text-slate-300 truncate" title={mat.name}>
                    {mat.name}
                  </div>
                  {["raro", "epico", "lendario"].map(tier => (
                    <Input
                      key={tier}
                      type="number"
                      value={localMaterials[mat.key]?.[tier] || 0}
                      onChange={(e) => handleMaterialChange(mat.key, tier, e.target.value)}
                      className={`h-7 text-xs text-center bg-mir-obsidian border-white/10 ${
                        tier === "raro" ? "text-blue-400" : 
                        tier === "epico" ? "text-purple-400" : "text-amber-400"
                      }`}
                      data-testid={`material-${mat.key}-${tier}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Recursos de Craft */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <h3 className="text-xs font-secondary font-bold text-white mb-2">Recursos de Craft</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "po", name: "Pó", color: "text-cyan-400" },
                  { key: "ds", name: "DS", color: "text-green-400" },
                  { key: "cobre", name: "Cobre", color: "text-orange-400" }
                ].map(res => (
                  <div key={res.key} className="flex flex-col gap-1">
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

            {/* Legenda de Craft */}
            <div className="mt-3 pt-2 border-t border-white/10 text-[9px] text-slate-500">
              <div className="flex gap-4">
                <span>1 Épico = 10R + 25 Pó + 5k DS + 20k Cu</span>
                <span>1 Lendário = 10E + 125 Pó + 25k DS + 100k Cu</span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Objetivos Lendários */}
          <div className="bg-mir-charcoal/50 border border-white/5 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-mir-gold" />
              <h2 className="text-sm font-secondary font-bold text-white" data-testid="objectives-title">
                Objetivos Lendários
              </h2>
            </div>

            {/* Objetivo Mais Próximo */}
            {closest && (
              <div className={`mb-3 p-2 rounded-lg ${closest.bgColor} border ${closest.borderColor}`} data-testid="closest-objective">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <closest.icon className={`w-3.5 h-3.5 ${closest.color}`} />
                  <span className={`text-xs font-bold ${closest.color}`}>
                    Mais Próximo: {closest.name}
                  </span>
                  <span className="ml-auto text-base font-bold text-white">
                    {closest.percentage}%
                  </span>
                </div>
                <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full ${closest.barColor} transition-all duration-300`}
                    style={{ width: `${closest.percentage}%` }}
                  />
                </div>
                {/* Materiais faltando */}
                <div className="space-y-0.5 text-[10px]">
                  {closest.ingredients.filter(ing => ing.missing > 0).map(ing => (
                    <div key={ing.key} className="flex justify-between">
                      <span className="text-slate-300">{ing.name} L</span>
                      <span className="text-red-400">Falta: {ing.missing}</span>
                    </div>
                  ))}
                  {/* Recursos faltando */}
                  {closest.deficit.po > 0 && (
                    <div className="flex justify-between text-cyan-400/70">
                      <span>Pó</span>
                      <span>Falta: {closest.deficit.po.toLocaleString()}</span>
                    </div>
                  )}
                  {closest.deficit.ds > 0 && (
                    <div className="flex justify-between text-green-400/70">
                      <span>DS</span>
                      <span>Falta: {closest.deficit.ds.toLocaleString()}</span>
                    </div>
                  )}
                  {closest.deficit.cobre > 0 && (
                    <div className="flex justify-between text-orange-400/70">
                      <span>Cobre</span>
                      <span>Falta: {closest.deficit.cobre.toLocaleString()}</span>
                    </div>
                  )}
                  {closest.percentage === 100 && (
                    <div className="text-green-400 font-bold">✓ Pronto para craft!</div>
                  )}
                </div>
              </div>
            )}

            {/* Todos os Objetivos */}
            <div className="space-y-2">
              {Object.entries(OBJECTIVES).map(([key, obj]) => {
                const result = objectiveResults[key];
                const Icon = obj.icon;
                const isClosest = closest?.key === key;
                
                return (
                  <div 
                    key={key} 
                    className={`p-2 rounded-lg border transition-all ${
                      isClosest 
                        ? `${obj.bgColor} ${obj.borderColor}` 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                    data-testid={`objective-${key}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3 h-3 ${obj.color}`} />
                      <span className={`text-xs font-medium ${isClosest ? obj.color : 'text-white'}`}>
                        {obj.name}
                      </span>
                      <span className={`ml-auto text-xs font-bold ${
                        result.percentage === 100 ? 'text-green-400' : 'text-slate-300'
                      }`}>
                        {result.percentage}%
                      </span>
                    </div>
                    <div className="h-1 bg-black/30 rounded-full overflow-hidden mb-1.5">
                      <div 
                        className={`h-full ${result.percentage === 100 ? 'bg-green-400' : obj.barColor} transition-all duration-300`}
                        style={{ width: `${result.percentage}%` }}
                      />
                    </div>
                    {/* Detalhes dos ingredientes */}
                    <div className="grid grid-cols-3 gap-1 text-[9px]">
                      {result.ingredients.map(ing => (
                        <div key={ing.key} className="flex flex-col">
                          <span className="text-slate-500 truncate">{ing.name}</span>
                          <span className={ing.missing > 0 ? 'text-red-400' : 'text-green-400'}>
                            {ing.have}/{ing.required}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
