import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Settings, FileText } from "lucide-react";
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
      // Atualiza apenas o estado local sem recarregar
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
      toast.success("Contagem confirmada! Resetará em 30 dias.");
      // Atualiza apenas o estado local
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, confirmed: true, confirmed_at: new Date().toISOString() } : acc
      ));
    } catch (error) {
      console.error("Erro ao confirmar conta:", error);
      toast.error("Erro ao confirmar conta");
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      await axios.delete(`${API}/accounts/${accountId}`);
      toast.success("Conta deletada!");
      // Remove do estado local sem recarregar
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar conta");
    }
  };

  const handleSavePrices = async (priceData) => {
    try {
      await axios.put(`${API}/boss-prices`, priceData);
      toast.success("Preços atualizados com sucesso!");
      setShowPriceDialog(false);
      // Atualiza apenas o estado local
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
                onClick={() => setShowPriceDialog(true)}
                variant="outline"
                className="bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 text-sm px-3 py-2"
                data-testid="config-prices-btn"
              >
                <Settings className="w-4 h-4 mr-1" />
                Preços USD
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
            onConfirm={handleConfirmAccount}
            onDelete={handleDeleteAccount}
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
