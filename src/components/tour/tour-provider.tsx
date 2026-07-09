"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { TourTooltip } from "@/components/tour/tour-tooltip";
import { TOUR_STEPS, type TourStep } from "@/lib/tour-steps";
import { concluirTour } from "@/server/actions/tour";

type TourContextValue = {
  active: boolean;
  start: () => void;
  startAt: (stepId: string) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour deve ser usado dentro de <TourProvider>.");
  return ctx;
}

export function TourProvider({
  alunoId = null,
  children,
}: {
  alunoId?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const marcado = useRef(false);

  // Passos efetivos: remove os que exigem aluno (se não houver) e resolve {alunoId}.
  const steps = useMemo<TourStep[]>(() => {
    return TOUR_STEPS.filter((s) => !s.requiresAluno || alunoId).map((s) =>
      alunoId ? { ...s, route: s.route.replace("{alunoId}", alunoId) } : s,
    );
  }, [alunoId]);

  const step = active ? steps[index] : null;

  const start = useCallback(() => {
    setIndex(0);
    setRect(null);
    setActive(true);
  }, []);

  const startAt = useCallback(
    (stepId: string) => {
      const i = steps.findIndex((s) => s.id === stepId);
      setIndex(i >= 0 ? i : 0);
      setRect(null);
      setActive(true);
    },
    [steps],
  );

  const encerrar = useCallback(() => {
    setActive(false);
    setRect(null);
    // Marca como visto (só uma vez por sessão de tour).
    if (!marcado.current) {
      marcado.current = true;
      void concluirTour();
    }
  }, []);

  const next = useCallback(() => {
    setRect(null);
    setIndex((i) => {
      if (i >= steps.length - 1) {
        encerrar();
        return i;
      }
      return i + 1;
    });
  }, [encerrar, steps.length]);

  const prev = useCallback(() => {
    setRect(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Localiza o alvo do passo atual (navegando de rota se preciso).
  useEffect(() => {
    if (!step) return;
    let cancelado = false;

    if (step.route !== pathname) {
      router.push(step.route);
      return; // a mudança de pathname re-dispara este efeito
    }
    if (!step.target) {
      setRect(null);
      return;
    }

    const inicio = Date.now();
    let raf = 0;
    const procurar = () => {
      if (cancelado) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // pequeno atraso para o scroll assentar antes de medir
        window.setTimeout(() => {
          if (!cancelado) setRect(el.getBoundingClientRect());
        }, 220);
        return;
      }
      if (Date.now() - inicio < 2500) {
        raf = requestAnimationFrame(procurar);
      } else {
        setRect(null); // fallback central
      }
    };
    raf = requestAnimationFrame(procurar);
    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
    };
  }, [step, pathname, router]);

  // Reposiciona o spotlight em resize/scroll enquanto o passo está visível.
  useEffect(() => {
    if (!step?.target || !active) return;
    const atualizar = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
    };
  }, [step, active]);

  const value = useMemo<TourContextValue>(
    () => ({ active, start, startAt }),
    [active, start, startAt],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && step ? (
        <>
          <TourOverlay rect={rect} />
          <TourTooltip
            step={step}
            rect={rect}
            index={index}
            total={steps.length}
            onPrev={prev}
            onNext={next}
            onSkip={encerrar}
          />
        </>
      ) : null}
    </TourContext.Provider>
  );
}
