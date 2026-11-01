-- Mapa da Alma: remove os serviços herdados da agência. Ficam só os mapas.
delete from services where slug not in ('mapa-pessoal', 'mapa-casal');
update services set active = true where slug in ('mapa-pessoal', 'mapa-casal');
notify pgrst, 'reload schema';
