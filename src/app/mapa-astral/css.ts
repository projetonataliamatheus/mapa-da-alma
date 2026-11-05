export const CSS = `
:root{--bg:#07031a;--bg2:#140a33;--card:rgba(255,255,255,.055);--line:rgba(243,223,162,.26);--gold:#f3dfa2;--gold2:#c9a24a;--txt:#f6f1ff;--mut:#c9bde6;--btn:linear-gradient(135deg,#fff0b8,#e3b94f 55%,#b98a2e);--rose:#ff8fb1}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.sky{position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 78% -8%,#5a2bb3 0%,transparent 62%),radial-gradient(700px 500px at 0% 30%,#2a1066 0%,transparent 60%),linear-gradient(180deg,var(--bg2),var(--bg) 70%)}
.sky::before,.sky::after{content:"";position:absolute;inset:0;background-image:radial-gradient(1.2px 1.2px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 33% 64%,#fff 50%,transparent 51%),radial-gradient(1.6px 1.6px at 55% 28%,#f3dfa2 50%,transparent 51%),radial-gradient(1px 1px at 72% 78%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 90% 42%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 22% 88%,#f3dfa2 50%,transparent 51%),radial-gradient(1.4px 1.4px at 64% 10%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 44% 48%,#fff 50%,transparent 51%);background-size:420px 420px;opacity:.7}
.sky::after{background-size:260px 260px;opacity:.35;transform:translate(60px,40px)}
.w{width:min(1120px,100% - 32px);margin-inline:auto}
h1,h2,h3,h4{font-family:Cinzel,Georgia,"Times New Roman",serif;letter-spacing:.02em;line-height:1.15;margin:0}
.top{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.logo{font-family:Cinzel,Georgia,serif;font-weight:700;letter-spacing:.2em;color:var(--gold);font-size:15px;text-decoration:none;display:flex;gap:10px;align-items:center}
.logo i{font-style:normal;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1px solid var(--line)}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:15px 28px;border-radius:999px;font-weight:800;font-size:16px;text-decoration:none;color:#2a1259;background:var(--btn);box-shadow:0 10px 34px rgba(227,185,79,.38),inset 0 1px 0 rgba(255,255,255,.6);transition:transform .18s,box-shadow .18s;border:0;cursor:pointer;font-family:inherit;text-align:center}
.btn::after{content:"";position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);transform:skewX(-20deg);animation:shine 3.6s ease-in-out infinite}
.btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 16px 42px rgba(227,185,79,.55)}
.btn:active{transform:scale(.98)}
.btn.sec{background:rgba(255,255,255,.06);color:var(--gold);border:1.5px solid var(--line);box-shadow:none}.btn.sec::after{display:none}
.btn.sm{padding:10px 20px;font-size:14px}
.btn.big{width:100%;padding:18px 26px;font-size:17px}
.pulse{animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 10px 34px rgba(227,185,79,.38),0 0 0 0 rgba(243,223,162,.5)}50%{box-shadow:0 10px 34px rgba(227,185,79,.5),0 0 0 14px rgba(243,223,162,0)}}
@keyframes shine{0%,55%{left:-70%}100%{left:130%}}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:center;padding:30px 0 70px}
.kick{display:inline-block;color:var(--gold);border:1px solid var(--line);background:rgba(243,223,162,.07);border-radius:999px;padding:6px 14px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
h1{font-size:clamp(30px,5vw,54px);color:#fff}
h1 em{font-style:normal;background:linear-gradient(90deg,#fff0b8,#e3b94f,#ff9ec0);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:clamp(16px,2vw,19px);color:var(--mut);margin:18px 0 24px;max-width:560px}
.mini{display:flex;flex-wrap:wrap;gap:8px 18px;margin:22px 0 0;color:var(--mut);font-size:14px;padding:0;list-style:none}
.mini li::before{content:"✓";color:var(--gold);margin-right:6px}
.heroR{position:relative}
.wheel{position:absolute;inset:-60px -40px auto auto;width:min(520px,95%);aspect-ratio:1;opacity:.5;z-index:-1;animation:spin 90s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sec{padding:60px 0}
.sec>h2,.h2{font-size:clamp(24px,3.6vw,40px);text-align:center;color:#fff;margin-bottom:12px}
.sub{text-align:center;color:var(--mut);max-width:660px;margin:0 auto 34px}
.grid{display:grid;gap:16px}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;backdrop-filter:blur(8px);transition:transform .25s,border-color .25s,box-shadow .25s}
.grid .card:hover{transform:translateY(-4px);border-color:rgba(243,223,162,.6);box-shadow:0 14px 40px rgba(0,0,0,.35)}
.card .ic{font-size:30px;color:var(--gold);display:block;margin-bottom:10px;font-family:Georgia,serif}
.card h3,.card h4{font-size:18px;color:#fff;margin-bottom:8px}
.card p{margin:0 0 8px;color:var(--mut);font-size:15px}
.num{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:Cinzel,serif;font-weight:700;color:#2a1259;background:var(--btn);margin-bottom:12px}
.senal{border-color:rgba(255,143,177,.35);background:linear-gradient(180deg,rgba(255,143,177,.08),rgba(255,255,255,.03))}
.price{max-width:540px;margin:0 auto;text-align:center;background:linear-gradient(180deg,rgba(243,223,162,.14),rgba(255,255,255,.04));border:1.5px solid var(--gold2);border-radius:26px;padding:34px 24px;box-shadow:0 0 80px rgba(201,162,74,.18)}
.price .v{font-family:Cinzel,serif;font-size:60px;color:var(--gold);line-height:1}
.price small{display:block;color:var(--mut);margin:8px 0 18px}
.price ul{list-style:none;padding:0;margin:0 0 22px;text-align:left;display:inline-block}
.price li{margin:6px 0}.price li::before{content:"✦";color:var(--gold);margin-right:10px}
.trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;color:var(--mut);font-size:13px;margin-top:16px}
details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:10px 0}
summary{cursor:pointer;font-weight:600;color:#fff;list-style:none}summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:var(--gold);font-size:20px;line-height:1}details[open] summary::after{content:"–"}
details p{color:var(--mut);margin:10px 0 0}
.foot{border-top:1px solid var(--line);padding:30px 0 100px;color:var(--mut);font-size:13px;text-align:center}.foot p{max-width:780px;margin:8px auto}
.stick{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(7,3,26,.92);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:none}
/* teste gratuito */
.tf,.an,.res{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.04));border:1.5px solid rgba(243,223,162,.4);border-radius:24px;padding:26px;box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 60px rgba(120,70,220,.25);backdrop-filter:blur(10px)}
.tf-t h3{font-size:24px;color:#fff}.tf-t p{color:var(--mut);margin:8px 0 18px;font-size:15px}
.tf label,.tf legend{display:block;font-size:13px;color:var(--gold);margin:14px 0 6px;letter-spacing:.04em;padding:0}.tf fieldset{border:0;margin:0;padding:0}
.tf input,.tf select{width:100%;padding:14px 14px;border-radius:12px;border:1px solid rgba(243,223,162,.3);background:rgba(7,3,26,.55);color:#fff;font-size:16px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
.tf input:focus,.tf select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(243,223,162,.18)}
.tf select option{color:#111}
.dt{display:grid;grid-template-columns:.8fr 1.4fr 1fr;gap:10px}
.tf .btn{margin-top:20px}
.err{color:#ffb4b4;background:rgba(255,80,80,.12);border:1px solid rgba(255,120,120,.4);padding:10px 12px;border-radius:10px;font-size:14px;margin:14px 0 0}
.fine{font-size:12px;color:var(--mut);text-align:center;margin:12px 0 0}
.an{text-align:center;padding:36px 22px}.an h3{font-size:22px;margin:22px 0 16px;color:#fff}
.an-orb{position:relative;width:110px;height:110px;margin:0 auto}
.an-orb i{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(243,223,162,.7);border-top-color:transparent;animation:spin 3s linear infinite}
.an-orb i:nth-child(2){inset:12px;animation-duration:2s;animation-direction:reverse;border-color:rgba(255,143,177,.7);border-bottom-color:transparent}
.an-orb i:nth-child(3){inset:26px;animation-duration:1.4s}
.an-orb b{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;color:var(--gold);animation:tw 1.6s ease-in-out infinite}
@keyframes tw{50%{opacity:.4;transform:scale(.85)}}
.an-l{list-style:none;padding:0;margin:0 auto;max-width:360px;text-align:left}
.an-l li{padding:6px 0;color:rgba(201,189,230,.45);font-size:15px;transition:all .4s;display:flex;gap:10px}
.an-l li.now{color:#fff;transform:translateX(4px)}.an-l li.ok{color:var(--gold)}
.res{padding:22px;max-width:1040px;margin:30px auto 0}
.res-h{text-align:center;margin-bottom:18px}.res-h h3{font-size:clamp(22px,3.4vw,32px);color:#fff;margin-bottom:8px}.res-h p{color:var(--mut);font-size:14px;margin:0}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.nums div{background:rgba(7,3,26,.5);border:1px solid var(--line);border-radius:14px;padding:12px 6px}
.nums small{display:block;color:var(--mut);font-size:11px;letter-spacing:.05em;text-transform:uppercase}.nums b{font-family:Cinzel,serif;font-size:24px;color:var(--gold)}
.res .card{margin:14px 0}.res .em{color:var(--gold)!important;font-style:italic}
.sub-t{text-align:center;font-size:clamp(20px,3vw,28px);margin:30px 0 14px;color:#fff}
.tri{display:grid;grid-template-columns:1fr 1fr;gap:14px}.tri .card{margin:0}
.pir{margin:10px auto 12px;text-align:center;font-family:"Cinzel",Georgia,serif;overflow:hidden}
.pir-r{display:flex;justify-content:center;gap:1px;width:100%;opacity:0;animation:fadeUp .5s forwards}
.pir-r span{flex:1 1 0;min-width:0;max-width:17px;text-align:center;font-size:clamp(8px,2.5vw,12px);color:var(--gold);line-height:1.55}
.pir-r:first-child span{color:#fff;text-shadow:0 0 10px rgba(243,223,162,.8)}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.arc{font-size:14px!important}.seq{background:rgba(255,143,177,.1);border:1px solid rgba(255,143,177,.45);border-radius:12px;padding:10px 12px;color:#fff!important;font-size:14px!important}
.seq b{display:block;color:var(--rose);font-family:Cinzel,serif;letter-spacing:.06em;margin-bottom:2px}
.warn{border-color:rgba(255,143,177,.5);background:linear-gradient(180deg,rgba(255,143,177,.1),rgba(255,255,255,.03))}.warn ul{margin:0;padding-left:20px;color:#fff}.warn li{margin:8px 0}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips span{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--txt);background:rgba(7,3,26,.4)}
.lock{position:relative;margin-top:22px;border-radius:22px;overflow:hidden;border:1.5px solid var(--gold2);background:rgba(7,3,26,.6)}
.lock-b{position:absolute;inset:0;filter:blur(6px);opacity:.4;padding:24px;color:var(--mut);overflow:hidden}
.lock-c{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;text-align:center;padding:34px 22px;background:linear-gradient(180deg,rgba(7,3,26,.5),rgba(7,3,26,.92) 35%)}
.lock-c h3{font-size:clamp(19px,2.8vw,26px);color:#fff}.lock-c h3 em{font-style:normal;color:var(--gold)}.lock-c>p{max-width:520px;color:var(--mut);margin:0}
.lk{font-size:30px}.pr b{font-family:Cinzel,serif;font-size:40px;color:var(--gold);display:block;line-height:1}.pr small{color:var(--mut)}
.lock-c .btn{max-width:460px}
.done{text-align:center}.done h3{font-size:22px;color:#fff;margin:6px 0}.done p{color:var(--mut);margin:0 0 14px}
#resultado:empty{display:none}
.rv{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s ease}.rv.in{opacity:1;transform:none}
.nojs .rv{opacity:1;transform:none}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding-top:6px;gap:28px}.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr}.stick{display:block}.top .btn{display:none}.wheel{inset:-30px -120px auto auto;opacity:.3}}
@media(max-width:640px){.g4,.g2,.tri{grid-template-columns:1fr}.tf,.an,.res{padding:18px 14px;border-radius:20px}.res .card{padding:16px}.nums b{font-size:20px}.sec{padding:40px 0}.hero{padding-bottom:40px}.btn.big{padding:16px 18px;font-size:16px}.lock-c{padding:26px 14px}.dt{grid-template-columns:.8fr 1.3fr 1fr;gap:8px}.wheel{display:none}h1{font-size:clamp(27px,8vw,38px)}.foot{padding-bottom:110px}}
@media(max-width:420px){.nums{grid-template-columns:1fr 1fr 1fr;gap:6px}.nums small{font-size:9px}.chips span{font-size:12px}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv{opacity:1;transform:none}}
`
