import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Input } from "./ui/input";

export default function EditableTable({ accounts, bossPrices, onUpdate, onToggleConfirm, onRefresh }) {
  const [editingCell, setEditingCell] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const handleCellClick = (accountId, field, currentValue) => {
    setEditingCell({ accountId, field });
    setTempValue(currentValue?.toString() || "");
  };

  const handleCellBlur = async (accountId, field) => {
    if (editingCell) {
      let finalValue = tempValue;

      if (field === "name" || field === "sala_pico") {
        finalValue = tempValue;
      } else if (field === "gold") {
        finalValue = parseFloat(tempValue) || 0;
      } else if (field.startsWith("bosses.") || field.startsWith("special_bosses.")) {
        finalValue = Math.max(0, parseInt(tempValue) || 0);
      }

      const [mainField, subField] = field.split(".");
      if (subField) {
        const account = accounts.find(acc => acc.id === accountId);
        const updatedSubField = {
          ...account[mainField],
          [subField]: finalValue
        };
        await onUpdate(accountId, mainField, updatedSubField);
      } else {
        await onUpdate(accountId, field, finalValue);
      }
      // Removido onRefresh() para evitar reload da página
    }
    setEditingCell(null);
    setTempValue("");
  };

  const handleKeyDown = (e, accountId, field) => {
    if (e.key === "Enter") {
      handleCellBlur(accountId, field);
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setTempValue("");
    }
  };

  const renderCell = (account, field, value) => {
    const isEditing = editingCell?.accountId === account.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => handleCellBlur(account.id, field)}
          onKeyDown={(e) => handleKeyDown(e, account.id, field)}
          className="h-6 bg-mir-obsidian border-mir-gold/50 text-white font-mono text-[10px] px-1 no-spinner w-full"
          type={field === "name" || field === "sala_pico" ? "text" : "number"}
        />
      );
    }

    if (field === "name" || field === "sala_pico") {
      return (
        <div
          onClick={() => handleCellClick(account.id, field, value)}
          className="cursor-pointer hover:bg-white/10 h-6 flex items-center px-1 rounded transition-colors text-white text-[11px]"
          data-testid={`cell-${field}-${account.id}`}
        >
          {value || "-"}
        </div>
      );
    }

    if (field === "gold") {
      const goldValue = typeof value === 'number' ? value : 0;
      const textColor = goldValue > 0 ? "text-mir-blue" : "text-transparent";
      return (
        <div
          onClick={() => handleCellClick(account.id, field, value)}
          className={`cursor-pointer hover:bg-white/10 h-6 flex items-center justify-end px-1 rounded transition-colors ${textColor} text-[11px]`}
          data-testid={`cell-${field}-${account.id}`}
        >
          {goldValue > 0 ? goldValue.toLocaleString('pt-BR') : ""}
        </div>
      );
    }

    const numValue = typeof value === 'number' ? value : 0;
    const textColor = numValue > 0 ? "text-green-400" : "text-slate-600";
    const displayValue = numValue > 0 ? value : "-";

    return (
      <div
        onClick={() => handleCellClick(account.id, field, value)}
        className={`cursor-pointer hover:bg-white/10 h-6 flex items-center justify-center rounded transition-colors ${textColor} text-[10px] font-mono`}
        data-testid={`cell-${field}-${account.id}`}
      >
        {displayValue}
      </div>
    );
  };

  const calculateTotals = () => {
    if (!accounts || accounts.length === 0) return null;

    const totals = {
      medio2: 0, grande2: 0, medio4: 0, grande4: 0,
      medio6: 0, grande6: 0, medio7: 0, grande7: 0,
      medio8: 0, grande8: 0,
      xama: 0, praca_4f: 0, cracha_epica: 0, gold: 0
    };

    accounts.forEach(account => {
      Object.keys(account.bosses).forEach(key => {
        if (totals.hasOwnProperty(key)) {
          totals[key] += account.bosses[key];
        }
      });
      Object.keys(account.special_bosses).forEach(key => {
        if (totals.hasOwnProperty(key)) {
          totals[key] += account.special_bosses[key];
        }
      });
      totals.gold += account.gold;
    });

    return totals;
  };

  const calculateTotalUSD = () => {
    if (!bossPrices || !accounts || accounts.length === 0) return null;

    const usdTotals = {
      medio2: 0, grande2: 0, medio4: 0, grande4: 0,
      medio6: 0, grande6: 0, medio7: 0, grande7: 0,
      medio8: 0, grande8: 0,
      xama: 0, praca_4f: 0, cracha_epica: 0
    };

    accounts.forEach(account => {
      usdTotals.medio2 += account.bosses.medio2 * bossPrices.medio2_price;
      usdTotals.grande2 += account.bosses.grande2 * bossPrices.grande2_price;
      usdTotals.medio4 += account.bosses.medio4 * bossPrices.medio4_price;
      usdTotals.grande4 += account.bosses.grande4 * bossPrices.grande4_price;
      usdTotals.medio6 += account.bosses.medio6 * bossPrices.medio6_price;
      usdTotals.grande6 += account.bosses.grande6 * bossPrices.grande6_price;
      usdTotals.medio7 += (account.bosses.medio7 || 0) * bossPrices.medio7_price;
      usdTotals.grande7 += (account.bosses.grande7 || 0) * bossPrices.grande7_price;
      usdTotals.medio8 += (account.bosses.medio8 || 0) * bossPrices.medio8_price;
      usdTotals.grande8 += (account.bosses.grande8 || 0) * bossPrices.grande8_price;
      usdTotals.xama += account.special_bosses.xama * bossPrices.xama_price;
      usdTotals.praca_4f += account.special_bosses.praca_4f * bossPrices.praca_4f_price;
      usdTotals.cracha_epica += account.special_bosses.cracha_epica * bossPrices.cracha_epica_price;
    });

    return usdTotals;
  };

  const totals = calculateTotals();
  const usdTotals = calculateTotalUSD();

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400 font-primary text-base" data-testid="no-accounts-message">
          Nenhuma conta cadastrada. Clique em "Nova Conta" para começar!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <style>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <table className="w-full text-[10px]" data-testid="accounts-table">
        <thead className="bg-white/5 sticky top-0">
          <tr>
            <th className="py-1.5 px-1 text-center text-[9px] uppercase tracking-wider font-secondary text-slate-400 border-r border-white/5 w-6">#</th>
            <th className="py-1.5 px-2 text-left text-[9px] uppercase tracking-wider font-secondary text-slate-400 border-r border-white/5 min-w-[80px]">Nome</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">M2</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">G2</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">M4</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">G4</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">M6</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">G6</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">M7</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">G7</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">M8</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-7">G8</th>
            <th className="py-1.5 px-1 text-left text-[9px] uppercase text-slate-400 border-l border-white/5 w-14">Sala</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 border-l border-white/5 w-8">Xa</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-8">Pç</th>
            <th className="py-1.5 px-0.5 text-center text-[9px] uppercase text-slate-400 w-8">Cr</th>
            <th className="py-1.5 px-1 text-right text-[9px] uppercase text-slate-400 border-l border-white/5 w-16">Gold</th>
            <th className="py-1.5 px-1 text-center text-[9px] uppercase text-slate-400 border-l border-white/5 w-8">Cf</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, index) => (
            <tr
              key={account.id}
              className={`border-b border-white/5 hover:bg-white/5 transition-colors ${account.confirmed ? 'bg-green-900/10' : ''}`}
              data-testid={`account-row-${index}`}
            >
              <td className="py-0.5 px-1 text-center font-mono text-slate-500 border-r border-white/5 text-[9px]">
                {index + 1}
              </td>
              <td className="py-0.5 px-1 font-primary text-white border-r border-white/5">
                {renderCell(account, "name", account.name)}
              </td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.medio2", account.bosses.medio2)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.grande2", account.bosses.grande2)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.medio4", account.bosses.medio4)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.grande4", account.bosses.grande4)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.medio6", account.bosses.medio6)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.grande6", account.bosses.grande6)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.medio7", account.bosses.medio7 || 0)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.grande7", account.bosses.grande7 || 0)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.medio8", account.bosses.medio8 || 0)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "bosses.grande8", account.bosses.grande8 || 0)}</td>
              <td className="py-0.5 px-1 font-primary text-mir-gold border-l border-white/5 text-[10px]">{renderCell(account, "sala_pico", account.sala_pico)}</td>
              <td className="py-0.5 px-0.5 border-l border-white/5">{renderCell(account, "special_bosses.xama", account.special_bosses.xama)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "special_bosses.praca_4f", account.special_bosses.praca_4f)}</td>
              <td className="py-0.5 px-0.5">{renderCell(account, "special_bosses.cracha_epica", account.special_bosses.cracha_epica)}</td>
              <td className="py-0.5 px-1 border-l border-white/5">{renderCell(account, "gold", account.gold)}</td>
              <td className="py-0.5 px-1 text-center border-l border-white/5">
                <button
                  onClick={() => onToggleConfirm(account.id, account.confirmed)}
                  className={`h-5 w-5 p-0 flex items-center justify-center rounded transition-colors ${account.confirmed ? 'text-green-500' : 'text-slate-500 hover:text-green-500'}`}
                  data-testid={`confirm-account-btn-${index}`}
                >
                  {account.confirmed ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                </button>
              </td>
            </tr>
          ))}
          
          {totals && (
            <tr className="bg-mir-gold/10 border-t border-mir-gold/50 font-bold">
              <td className="py-1 px-1 border-r border-white/5"></td>
              <td className="py-1 px-1 text-left text-[9px] uppercase text-mir-gold border-r border-white/5">Total</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.medio2}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.grande2}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.medio4}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.grande4}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.medio6}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.grande6}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.medio7}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.grande7}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.medio8}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.grande8}</td>
              <td className="py-1 px-1 border-l border-white/5"></td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white border-l border-white/5">{totals.xama}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.praca_4f}</td>
              <td className="py-1 px-0.5 text-center font-mono text-[9px] text-white">{totals.cracha_epica}</td>
              <td className="py-1 px-1 text-right font-mono text-[9px] text-mir-blue border-l border-white/5">{totals.gold.toLocaleString('pt-BR')}</td>
              <td className="py-1 px-1 border-l border-white/5"></td>
            </tr>
          )}
          
          {usdTotals && (
            <tr className="bg-green-900/20 border-t border-green-500/30 font-bold">
              <td className="py-2 px-2 border-r border-white/5"></td>
              <td className="py-2 px-3 text-left text-xs uppercase text-green-400 border-r border-white/5">Total USD</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.medio2.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.grande2.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.medio4.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.grande4.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.medio6.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.grande6.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.medio7.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.grande7.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.medio8.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.grande8.toFixed(2)}</td>
              <td className="py-2 px-3 border-l border-white/5"></td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400 border-l border-white/5">${usdTotals.xama.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.praca_4f.toFixed(2)}</td>
              <td className="py-2 px-2 text-center font-mono text-[10px] text-green-400">${usdTotals.cracha_epica.toFixed(2)}</td>
              <td className="py-2 px-3 border-l border-white/5"></td>
              <td className="py-2 px-3 border-l border-white/5"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
