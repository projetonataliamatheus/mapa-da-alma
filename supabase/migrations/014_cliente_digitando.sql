-- Cliente digitando: a IA espera ele terminar antes de ler e responder (sem gastar IA à toa).
alter table leads add column if not exists typing_until timestamptz;
