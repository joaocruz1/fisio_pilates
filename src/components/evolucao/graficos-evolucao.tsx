"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SerieDor = { data: string; dor: number }[];
export type SeriePeso = { data: string; peso: number }[];
export type SerieFreq = { mes: string; sessoes: number }[];

function Grafico({
  title,
  vazio,
  children,
}: {
  title: string;
  vazio: boolean;
  children: React.ReactElement;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {vazio ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados suficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function GraficosEvolucao({
  dor,
  peso,
  frequencia,
}: {
  dor: SerieDor;
  peso: SeriePeso;
  frequencia: SerieFreq;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Grafico title="Dor ao longo das aulas (0–10)" vazio={dor.length < 2}>
        <LineChart data={dor}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="data" fontSize={11} />
          <YAxis domain={[0, 10]} fontSize={11} width={24} />
          <Tooltip />
          <Line type="monotone" dataKey="dor" stroke="#dc2626" strokeWidth={2} dot={false} />
        </LineChart>
      </Grafico>

      <Grafico title="Aulas por mês" vazio={frequencia.length === 0}>
        <BarChart data={frequencia}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" fontSize={11} />
          <YAxis allowDecimals={false} fontSize={11} width={24} />
          <Tooltip />
          <Bar dataKey="sessoes" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </Grafico>

      <Grafico title="Peso (kg)" vazio={peso.length < 2}>
        <LineChart data={peso}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="data" fontSize={11} />
          <YAxis fontSize={11} width={32} />
          <Tooltip />
          <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={2} dot={false} />
        </LineChart>
      </Grafico>
    </div>
  );
}
