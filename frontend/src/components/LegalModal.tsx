"use client";

import React, { useState } from "react";
import { X, ShieldCheck, FileText, HelpCircle, Mail, MessageSquare, CheckCircle } from "lucide-react";

export type LegalModalTab = "terms" | "privacy" | "support";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalModalTab;
}

export function LegalModal({ isOpen, onClose, initialTab = "terms" }: LegalModalProps) {
  const [tab, setTab] = useState<LegalModalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-white/20 bg-zinc-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header com Navegação por Abas */}
        <div className="border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Informações Legais & Atendimento
            </h2>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTab("terms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                tab === "terms"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Termos de Uso</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("privacy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                tab === "privacy"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Privacidade (LGPD)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("support")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                tab === "support"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Dúvidas & Suporte</span>
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto pr-2 text-xs text-zinc-300 space-y-4 leading-relaxed">
          {tab === "terms" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">1. Visão Geral do Serviço</h3>
              <p>
                O <strong>YT Bilingual Subtitles</strong> é uma ferramenta educacional desenvolvida para auxiliar estudantes de idiomas no aprendizado por meio de vídeos públicos disponibilizados no YouTube. A plataforma oferece sincronização de transcrições, traduções automáticas para português e ferramentas de caderno de vocabulário e exportação Anki.
              </p>

              <h3 className="text-sm font-semibold text-white">2. Propriedade Intelectual de Terceiros</h3>
              <p>
                A plataforma <strong>não armazena nem redistribui cópias integrais de áudio ou vídeo de terceiros</strong>. Todo o conteúdo audiovisual é transmitido diretamente pelo reprodutor oficial do YouTube via iframe embed em conformidade com as diretrizes do YouTube / Google LLC. Os direitos autorais dos vídeos pertencem exclusivamente aos seus respectivos canais e criadores.
              </p>

              <h3 className="text-sm font-semibold text-white">3. Planos, Assinaturas e Cancelamento</h3>
              <p>
                O usuário pode usufruir gratuitamente do plano básico ou assinar o Plano PRO para processamento ilimitado. As assinaturas podem ser canceladas a qualquer momento diretamente pelo painel do usuário ou pelo canal de suporte, sem multas rescisórias ou fidelidade obrigatória.
              </p>

              <h3 className="text-sm font-semibold text-white">4. Uso Adequado e Limites</h3>
              <p>
                É vedado qualquer tipo de ataque de negação de serviço, tentativas de engenharia reversa, extração massiva automatizada não autorizada ou violação das quotas estabelecidas por IP e usuário.
              </p>
            </div>
          )}

          {tab === "privacy" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">1. Coleta e Uso de Dados (LGPD)</h3>
              <p>
                Em estrito respeito à Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletamos apenas os dados essenciais para o funcionamento da sua conta: nome completo, endereço de e-mail e hash criptográfico de senha.
              </p>

              <h3 className="text-sm font-semibold text-white">2. Armazenamento e Criptografia</h3>
              <p>
                Suas senhas são criptografadas com algoritmos de derivação segura (PBKDF2/SHA-256 com salt individualizado de alta entropia). Nunca temos acesso à sua senha em texto puro. Cookies de autenticação são transmitidos com flags de segurança (HttpOnly, SameSite estrito).
              </p>

              <h3 className="text-sm font-semibold text-white">3. Compartilhamento com Terceiros</h3>
              <p>
                <strong>Seus dados nunca são vendidos ou compartilhados com corretores de dados</strong>. Processamentos de pagamento são executados exclusivamente pela processadora global Stripe, certificada PCI-DSS Nível 1.
              </p>

              <h3 className="text-sm font-semibold text-white">4. Direitos do Titular</h3>
              <p>
                Você tem o direito de solicitar a qualquer momento a visualização, correção ou exclusão total dos seus dados de nossa base entrando em contato pelo e-mail do suporte.
              </p>
            </div>
          )}

          {tab === "support" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  Canal Oficial de Atendimento
                </h3>
                <p className="text-xs text-zinc-300">
                  Dúvidas sobre assinaturas, problemas na extração de legendas ou sugestões? Fale diretamente com nossa equipe:
                </p>
                <div className="mt-2 text-xs font-mono text-indigo-300 bg-black/40 px-3 py-2 rounded-xl inline-block border border-indigo-500/20">
                  suporte@ytbilingualsubtitles.com
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Perguntas Frequentes (FAQ)</h3>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="font-semibold text-zinc-200">Como funciona o Plano PRO?</p>
                  <p className="text-zinc-400">
                    O Plano PRO remove o limite de vídeos mensais, libera vídeos longos de até 60 minutos e permite download ilimitado de cartões para o Anki (.apkg).
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="font-semibold text-zinc-200">Posso cancelar quando quiser?</p>
                  <p className="text-zinc-400">
                    Sim! O cancelamento é imediato e sem qualquer burocracia ou cobrança surpresa.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="font-semibold text-zinc-200">O vídeo que coloquei não tem legendas, o que fazer?</p>
                  <p className="text-zinc-400">
                    Nossa inteligência artificial transcreve o áudio automaticamente através do modelo Whisper e sincroniza a minutagem para você estudar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="border-t border-white/10 pt-4 mt-4 flex items-center justify-between text-[11px] text-zinc-500">
          <span>YT Bilingual Subtitles • Versão 2.4</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
