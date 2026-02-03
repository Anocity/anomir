import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Settings, FileText, DollarSign, Coins } from "lucide-react";
import { Button } from "../components/ui/button";
import EditableTable from "../components/EditableTable";
import BossPriceDialog from "../components/BossPriceDialog";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [bossPrices, setBossPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, pricesRes] = await Promise.all([
        axios.get(`${API}/accounts`),
        axios.get(`${API}/boss-prices`)
      ]);
      
      setAccounts(accountsRes.data);
      setBossPrices(pricesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Calcula totais (Boss + Gold) de todas as contas
  const totals = useMemo(() => {
    if (!bossPrices || accounts.length === 0) return { bossValue: 0, goldValue: 0, totalGold: 0 };
    
    let bossValue = 0;
    let totalGold = 0;
    
    accounts.forEach(acc => {
      const bosses = acc.bosses || {};
      const special = acc.special_bosses || {};
      
      bossValue += (bosses.medio2 || 0) * (bossPrices.medio2_price || 0);
      bossValue += (bosses.grande2 || 0) * (bossPrices.grande2_price || 0);
      bossValue += (bosses.medio4 || 0) * (bossPrices.medio4_price || 0);
      bossValue += (bosses.grande4 || 0) * (bossPrices.grande4_price || 0);
      bossValue += (bosses.medio6 || 0) * (bossPrices.medio6_price || 0);
      bossValue += (bosses.grande6 || 0) * (bossPrices.grande6_price || 0);
      bossValue += (bosses.medio7 || 0) * (bossPrices.medio7_price || 0);
      bossValue += (bosses.grande7 || 0) * (bossPrices.grande7_price || 0);
      bossValue += (bosses.medio8 || 0) * (bossPrices.medio8_price || 0);
      bossValue += (bosses.grande8 || 0) * (bossPrices.grande8_price || 0);
      bossValue += (special.xama || 0) * (bossPrices.xama_price || 0);
      bossValue += (special.praca_4f || 0) * (bossPrices.praca_4f_price || 0);
      bossValue += (special.cracha_epica || 0) * (bossPrices.cracha_epica_price || 0);
      
      totalGold += acc.gold || 0;
    });
    
    const goldValue = totalGold * (bossPrices.gold_price || 0);
    
    return { bossValue, goldValue, totalGold };
  }, [accounts, bossPrices]);

  const handleAddAccount = async () => {
    try {
      const newAccount = {
        name: "Nova Conta",
        bosses: {
          medio2: 0,
          grande2: 0,
          medio4: 0,
          grande4: 0,
          medio6: 0,
          grande6: 0,
          medio7: 0,
          grande7: 0,
          medio8: 0,
          grande8: 0
        },
        sala_pico: "",
        special_bosses: {
          xama: 0,
          praca_4f: 0,
          cracha_epica: 0
        },
        materials: {
          anima: { raro: 0, epico: 0, lendario: 0 },
          bugiganga: { raro: 0, epico: 0, lendario: 0 },
          lunar: { raro: 0, epico: 0, lendario: 0 },
          iluminado: { raro: 0, epico: 0, lendario: 0 },
          quintessencia: { raro: 0, epico: 0, lendario: 0 },
          esfera: { raro: 0, epico: 0, lendario: 0 },
          platina: { raro: 0, epico: 0, lendario: 0 },
          aco: { raro: 0, epico: 0, lendario: 0 }
        },
        craft_resources: { po: 0, ds: 0, cobre: 0 },
        gold: 0
      };
      
      const response = await axios.post(`${API}/accounts`, newAccount);
      setAccounts([...accounts, response.data]);
      toast.success("Nova conta adicionada!");
    } catch (error) {
      console.error("Erro ao adicionar conta:", error);
      toast.error("Erro ao adicionar conta");
    }
  };

  const handleUpdateAccount = async (accountId, field, value) => {
    try {
      await axios.put(`${API}/accounts/${accountId}`, { [field]: value });
      setAccounts(prev => prev.map(acc => {
        if (acc.id === accountId) {
          if (field.includes('.')) {
            const [mainField, subField] = field.split('.');
            return { ...acc, [mainField]: { ...acc[mainField], [subField]: value } };
          }
          return { ...acc, [field]: value };
        }
        return acc;
      }));
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      toast.error("Erro ao atualizar conta");
    }
  };

  const handleConfirmAccount = async (accountId) => {
    try {
      await axios.post(`${API}/accounts/${accountId}/confirm`);
      toast.success("Contagem confirmada!");
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, confirmed: true, confirmed_at: new Date().toISOString() } : acc
      ));
    } catch (error) {
      console.error("Erro ao confirmar conta:", error);
      toast.error("Erro ao confirmar conta");
    }
  };

  const handleToggleConfirm = async (accountId, currentValue) => {
    try {
      const newValue = !currentValue;
      await axios.put(`${API}/accounts/${accountId}`, { confirmed: newValue });
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, confirmed: newValue } : acc
      ));
    } catch (error) {
      console.error("Erro ao alternar confirmação:", error);
      toast.error("Erro ao alternar confirmação");
    }
  };

  const handleSavePrices = async (priceData) => {
    try {
      await axios.put(`${API}/boss-prices`, priceData);
      toast.success("Preços atualizados com sucesso!");
      setShowPriceDialog(false);
      setBossPrices(priceData);
    } catch (error) {
      console.error("Erro ao atualizar preços:", error);
      toast.error("Erro ao atualizar preços");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mir-gold font-secondary text-2xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 px-3">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-4 bg-mir-charcoal/80 border border-white/5 rounded-lg p-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-secondary font-bold text-mir-gold tracking-wide uppercase" data-testid="dashboard-title">
                MIR4 Manager
              </h1>
              <p className="text-slate-400 font-primary text-xs mt-1">
                Gerencie suas contas e bosses
              </p>
            </div>
            
            {/* Totais Card */}
            <div className="flex gap-3 mr-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-[10px] text-green-400 uppercase">Boss Total</span>
                </div>
                <div className="text-lg font-bold text-green-400" data-testid="total-boss-value">
                  ${totals.bossValue.toFixed(2)}
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] text-amber-400 uppercase">Gold Total</span>
                </div>
                <div className="text-lg font-bold text-amber-400" data-testid="total-gold-value">
                  {totals.totalGold.toLocaleString('pt-BR')} <span className="text-xs font-normal">(${totals.goldValue.toFixed(2)})</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAddAccount}
                className="bg-mir-gold text-black font-bold uppercase tracking-wider hover:bg-amber-400 shadow-[0_0_10px_rgba(255,215,0,0.3)] transition-all text-sm px-3 py-2"
                data-testid="add-account-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova Conta
              </Button>
              <Button
                onClick={() => navigate("/accounts/info")}
                variant="outline"
                className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 text-sm px-3 py-2"
                data-testid="accounts-info-btn"
              >
                <FileText className="w-4 h-4 mr-1" />
                Info Contas
              </Button>
              <Button
                onClick={() => navigate("/account/" + (accounts[0]?.id || "") + "/resources")}
                variant="outline"
                className="bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 text-sm px-3 py-2"
                data-testid="resources-btn"
                disabled={accounts.length === 0}
              >
                <FileText className="w-4 h-4 mr-1" />
                Recursos
              </Button>
              <Button
                onClick={() => setShowPriceDialog(true)}
                variant="outline"
                className="bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 text-sm px-3 py-2"
                data-testid="config-prices-btn"
              >
                <Settings className="w-4 h-4 mr-1" />
                Preços
              </Button>
            </div>
          </div>
        </div>

        {/* Editable Table */}
        <div className="bg-mir-charcoal/50 border border-white/5 rounded-lg shadow-2xl overflow-hidden">
          <EditableTable
            accounts={accounts}
            bossPrices={bossPrices}
            onUpdate={handleUpdateAccount}
            onToggleConfirm={handleToggleConfirm}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {/* Price Dialog */}
      <BossPriceDialog
        open={showPriceDialog}
        onOpenChange={setShowPriceDialog}
        bossPrices={bossPrices}
        onSave={handleSavePrices}
      />
    </div>
  );
}
