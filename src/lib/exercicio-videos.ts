/**
 * Links de BUSCA de vídeo por exercício, gerados DETERMINISTICAMENTE pelo nome —
 * sem curadoria nem coluna no banco. Cobrem 100% do catálogo e nunca "quebram"
 * (abrem em nova aba). Para reprodução DENTRO do app, o id do vídeo é resolvido
 * via YouTube Data API em src/server/actions/video.ts (chave opcional).
 */
export type VideoLinks = {
  youtubeSearch: string;
  tiktokSearch: string;
};

export function linksVideoExercicio(nome: string): VideoLinks {
  const q = `Pilates ${nome.trim()} exercício`;
  return {
    youtubeSearch: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    tiktokSearch: `https://www.tiktok.com/search?q=${encodeURIComponent(`Pilates ${nome.trim()}`)}`,
  };
}
