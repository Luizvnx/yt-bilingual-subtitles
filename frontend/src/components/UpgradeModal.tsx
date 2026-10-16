"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  X,
  Crown,
  ArrowRight,
  Clock,
  Mic,
  BookOpen,
} from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: (newTier: "free" | "pro") => void;
  currentTier?: "free" | "pro";
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  onUpgradeSuccess,
  currentTier = "free",
  isAuthenticated = false,
  onOpenAuth,
}: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      onClose();
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billingCycle }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível iniciar a assinatura.");
      }

      if (data.url) {
        // Redireciona para o checkout oficial do Stripe
        window.location.href = data.url;
      } else if (data.tier === "pro") {
        // Modo de demonstração / ativação instantânea
        setSuccessMessage("Parabéns! Seu Plano PRO foi ativado com sucesso!");
        onUpgradeSuccess("pro");
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar assinatura.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevToggle = async () => {
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/dev-toggle", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        onUpgradeSuccess(data.newTier);
        setSuccessMessage(data.message);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(data.error || "Erro ao alternar plano de teste.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro na requisição.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo sofisticado */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Plano de Estudos Pro
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Desbloqueie todo o seu potencial
            </h2>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Estude qualquer vídeo do YouTube sem travas ou limites mensais, com
          ferramentas avançadas de fala e revisão.
        </p>

        {/* Seletor Ciclo Mensal / Anual */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center rounded-full bg-zinc-900 border border-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${billingCycle === "monthly"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${billingCycle === "annual"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              <span>Anual</span>
              <span className="rounded-full bg-amber-400/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                -33%
              </span>
            </button>
          </div>
        </div>

        {/* Preço em Destaque */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-sm text-zinc-400">R$</span>
            <span className="text-4xl font-extrabold tracking-tight text-white">
              {billingCycle === "annual" ? "16,58" : "24,90"}
            </span>
            <span className="text-sm text-zinc-400">/mês</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {billingCycle === "annual"
              ? "Cobrado R$ 199,00 anualmente (equivalente a 2 meses grátis)"
              : "Cobrado mensalmente. Cancele quando quiser sem fidelidade."}
          </p>
        </div>

        {/* Lista de Vantagens Comparativas */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-400">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                Vídeos Ilimitados:
              </span>{" "}
              <span className="text-zinc-400">
                Livre do limite de 3 vídeos por mês do plano gratuito.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                Vídeos Longos de até 60 Minutos:
              </span>{" "}
              <span className="text-zinc-400">
                Estude podcasts, palestras e entrevistas completas (vs 10 min no
                gratuito).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-400">
              <Mic className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                Treinador de Shadowing e Fala:
              </span>{" "}
              <span className="text-zinc-400">
                Grave sua voz com microfone e compare instantaneamente com o
                áudio original.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-400">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                Exportação Oficial para o Anki:
              </span>{" "}
              <span className="text-zinc-400">
                Baixe pacotes .apkg ilimitados para revisão espaçada offline.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-400">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-semibold text-zinc-200">
                Prioridade Máxima de IA:
              </span>{" "}
              <span className="text-zinc-400">
                Tradução instantânea acelerada sem filas de espera.
              </span>
            </div>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-medium">
            {successMessage}
          </div>
        )}

        {/* Botão de Ação Principal */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleCheckout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] px-6 py-3.5 text-sm font-bold text-zinc-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                Processando...
              </span>
            ) : isAuthenticated ? (
              <>
                <span>Assinar Plano PRO Agora</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Entrar para Assinar o Plano PRO</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Botão de Teste Rápido (Ambiente Dev) */}
          {isAuthenticated && (
            <button
              type="button"
              disabled={loading}
              onClick={handleDevToggle}
              className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 underline py-1 transition-colors"
            >
              {currentTier === "pro"
                ? "Simular Downgrade para Estudante (Teste)"
                : "Simular Ativação PRO Instantânea (Teste)"}
            </button>
          )}
        </div>

        {/* Rodapé de Segurança */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
          <span>Pagamento 100% seguro via Stripe / Pix • Cancele quando quiser</span>
        </div>
      </div>
    </div>
  );
}
