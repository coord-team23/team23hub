# Netlify no está deployando — "unrecognized Git contributor"

Desde el commit `7590087` (5 de agosto), **ningún build terminó bien**. Netlify tira:

> One or more builds failed due to an unrecognized Git contributor. Your plan allows only one contributor on private repos.

El plan actual solo reconoce un colaborador en repos privados, y ahora somos dos pusheando directo a `coord-team23/team23hub` (`t34M23` y `coord-team23`). No es un tema de "vincular cuenta" — eso es para una sola persona con dos identidades, no nuestro caso. Todo lo pusheado desde el 5 de agosto quedó en el repo pero nunca llegó al sitio real.

**Dos soluciones:** upgrade a Netlify Pro (colaboradores ilimitados), o hacer público el repo (gratis — el repo es código, no datos; las bases viven en Sheets/Supabase, fuera de git). **Vamos con hacerlo público.**

**Hecho el 2026-10-19:** el repo es público (`gh api -X PATCH repos/coord-team23/team23hub -f private=false`, con la cuenta coord-team23). Antes se revisó todo el historial: el único token que aparece es la anon key de Supabase (pública por diseño) y la API key del header ya se servía en el HTML. El secreto interno de n8n (wf4/wf11) no está en el repo: va un placeholder que el IF rechaza.

Lo que decía la nota original — `Settings → Danger Zone → Change repository visibility → Make public`. Después, Netlify reintenta solo o se dispara con "Trigger deploy".

---

## Pendiente: migrar wf2/3/4/5/9 a validar sesión de Supabase

`wf8` y `wf10` ya lo hacen así — falta extender el mismo patrón a los otros 5, que hoy dependen solo de la API key (expuesta en `index.html`, sin forma de esconderla del cliente). La idea: cada workflow valida el JWT de sesión contra Supabase + chequea `role = "interno"` antes de dejar pasar, la API key queda como segunda capa. `wf2` además pasa de GET a POST (el token viaja en el body).

**Riesgos:** no se puede probar de punta a punta sin n8n real; `wf3` es el más grande y el que más puede romperse (dejarlo para el final); reimportar tira abajo el workflow un rato mientras se prueba; hay que reasignar credentials a mano en cada import; y si algún interno no tiene bien seteado `role="interno"` en `profiles`, queda afuera de golpe. Orden sugerido: `wf2 → wf5 → wf4 → wf9 → wf3`.
