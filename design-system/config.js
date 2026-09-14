/* CONFIG compartido por todas las páginas del hub (index, admin, login, proveedores).
   Un solo lugar para cambiar la instancia de n8n, la clave del header x-team23-key
   o el proyecto de Supabase. La anon key de Supabase es pública por diseño; el
   acceso real lo dan el login y las políticas RLS + la validación del JWT en n8n. */
const CONFIG = {
  N8N_BASE: "https://coordteam23.app.n8n.cloud",
  API_KEY: "coordHUBt23",
  SUPABASE_URL: "https://muvmrkacjhygfuialpyn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dm1ya2Fjamh5Z2Z1aWFscHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTM4NDQsImV4cCI6MjA5OTg4OTg0NH0.zapojPWo2GXKz7ryfxxWJxsTkocUxjL1ocTgOd9TlgI"
};
