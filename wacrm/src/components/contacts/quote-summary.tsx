import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Quote } from "@/lib/contacts/quote";

/** Orçamento do lead (ADR 0013): Implantação, Mensalidade "a partir de", economia da Combinação e prazo. */
export function QuoteSummary({ quote, className = "" }: { quote: Quote; className?: string }) {
  const money = (value: number) => formatCurrency(value, quote.moeda, "pt-BR");
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-xs ${className}`}>
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <DollarSign className="h-3.5 w-3.5" />
        Orçamento
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        {/* Orçamentos antigos (sem Mensalidade) guardavam o total enviado pelo navegador, não a Implantação */}
        <span className="font-semibold text-foreground">
          {money(quote.implantacao)}
          {quote.mensalidade !== null && " de Implantação"}
        </span>
        {quote.mensalidade !== null && (
          <span className="text-muted-foreground">+ a partir de {money(quote.mensalidade)}/mês</span>
        )}
        {quote.economia > 0 && <span className="text-muted-foreground">Combinação: economiza {money(quote.economia)}</span>}
        {quote.prazoDiasUteis !== null && (
          <span className="text-muted-foreground">Prazo: até {quote.prazoDiasUteis} dias úteis</span>
        )}
      </span>
    </div>
  );
}
