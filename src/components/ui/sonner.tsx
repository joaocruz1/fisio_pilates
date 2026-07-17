"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, SpinnerIcon } from "@phosphor-icons/react"

// O tema do toast é 100% CSS: as vars abaixo apontam para tokens que já trocam
// sozinhos sob `.dark` no <html>. `theme="light"` é um literal ESTÁTICO de
// propósito — nunca chamar useTheme() aqui.
//
// Por quê: o efeito do timer de auto-dismiss do sonner tem `toast`/`deleteToast`
// nas deps, e o re-run chama startTimer() com o tempo restante INTEIRO (só o
// ramo de pausa decrementa). Ou seja, toda re-execução devolve a duração cheia
// ao toast — se algo faz o Toaster remontar, os toasts viram imortais. Foi o que
// aconteceu na primeira tentativa de dark mode. Aqui o React nunca fica sabendo
// que o tema existe: sem useTheme(), sem subscrição, e o literal mantém
// desligado o branch `system` (que registraria listeners de matchMedia).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CheckCircleIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <WarningIcon className="size-4" />
        ),
        error: (
          <XCircleIcon className="size-4" />
        ),
        loading: (
          <SpinnerIcon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // richColors (passado em app/layout.tsx) usa este outro conjunto de
          // vars; sem mapeá-las, os toasts coloridos usariam os defaults do
          // sonner e ignorariam o tema.
          "--success-bg": "var(--success)",
          "--success-text": "var(--success-foreground)",
          "--success-border": "var(--success)",
          "--error-bg": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)",
          "--error-border": "var(--destructive)",
          "--warning-bg": "var(--warning)",
          "--warning-text": "var(--warning-foreground)",
          "--warning-border": "var(--warning)",
          "--info-bg": "var(--info)",
          "--info-text": "var(--info-foreground)",
          "--info-border": "var(--info)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
