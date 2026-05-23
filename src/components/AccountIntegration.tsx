import { useState } from 'react';
import { Lock } from 'lucide-react';

export const AccountIntegration = ({ onAddKey }: { onAddKey: (service: string, key: string) => void }) => {
  const [service, setService] = useState('');
  const [key, setKey] = useState('');

  return (
    <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-3 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-brand-cyan" />
        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Integração de Contas</span>
      </div>
      
      <input
        type="text"
        placeholder="Nome do Serviço (ex: API_KEY_X)"
        value={service}
        onChange={(e) => setService(e.target.value)}
        className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2 text-xs text-white"
      />
      
      <input
        type="password"
        placeholder="Chave de Acesso"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        className="w-full bg-white/[0.02] border border-white/5 rounded-lg p-2 text-xs text-white"
      />
      
      <button
        onClick={() => {
            onAddKey(service, key);
            setService('');
            setKey('');
        }}
        className="w-full text-center p-2 rounded-lg border border-brand-green/30 bg-brand-green/10 text-brand-green hover:bg-brand-green/20 text-[9px] font-bold uppercase cursor-pointer"
      >
        Salvar Credencial Local
      </button>
      
      <p className="text-[8px] text-white/30 italic">
        * As credenciais são armazenadas apenas localmente no seu navegador e não são enviadas para nenhum servidor.
      </p>
    </div>
  );
};
