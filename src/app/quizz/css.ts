export const QCSS = `
.qz-w{width:min(560px,100% - 32px);margin:0 auto;padding:0 0 60px}
.qz-bar{position:fixed;top:0;left:0;right:0;height:5px;background:rgba(255,255,255,.1);z-index:60}
.qz-bar i{display:block;height:100%;background:var(--btn);transition:width .4s}
.qz-top{display:flex;justify-content:space-between;align-items:center;padding:24px 0 8px}
.qz-rot{color:var(--mut);font-size:13px}
.qz{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.04));border:1.5px solid rgba(243,223,162,.4);border-radius:24px;padding:26px;box-shadow:0 20px 70px rgba(0,0,0,.45);animation:qin .35s ease both}
@keyframes qin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.qz-h{font-size:clamp(22px,5.4vw,30px);color:#fff;margin:0 0 14px}
.qz-lead{color:var(--mut);font-size:17px;margin:0 0 22px}
.qz-l{display:block;font-size:13px;color:var(--gold);margin:16px 0 6px;letter-spacing:.04em}
.qz-i{width:100%;padding:14px;border-radius:12px;border:1px solid rgba(243,223,162,.3);background:rgba(7,3,26,.55);color:#fff;font-size:16px;font-family:inherit;outline:none}
.qz-i:focus{border-color:var(--gold)}
.qz-s{color:var(--mut);font-size:13px;margin:10px 0 18px}
.qz-e{color:var(--rose);font-size:14px;margin:8px 0 14px}
.qz .btn{margin-top:10px}.qz .btn[disabled]{opacity:.45;cursor:not-allowed}
.qz-box{display:grid;gap:6px;background:rgba(7,3,26,.55);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px;font-size:18px}.qz-box span{color:var(--mut)}
.qz-ops{display:grid;gap:10px}
.qz-op{text-align:left;padding:16px;border-radius:14px;border:1.5px solid var(--line);background:rgba(255,255,255,.05);color:#fff;font-size:16px;font-family:inherit;cursor:pointer;transition:border-color .2s,transform .15s}
.qz-op:hover,.qz-op:focus{border-color:var(--gold);transform:translateY(-2px);outline:none}
.qz-bl{border-top:1px solid var(--line);padding:16px 0}.qz-bl h3{font-size:17px;color:var(--gold);margin-bottom:6px}.qz-bl p{margin:0 0 6px;color:var(--mut);font-size:15px}
.qz-av{color:var(--mut);font-size:12px;text-align:center;margin:20px 0 0;opacity:.8}
`
export const QCSS2 = `
.qz-q{color:#fff;font-weight:700;margin:18px 0 10px}
.qz-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.qz-3 .qz-op{text-align:center;padding:14px 6px}
.qz-an{background:none;border:0;box-shadow:none;padding:6px 0}
.qz-pb{height:10px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:0 auto;max-width:360px}
.qz-pb i{display:block;height:100%;background:var(--btn);border-radius:99px;transition:width .25s}
.qz-pn{color:var(--gold);font-family:Cinzel,serif;margin:8px 0 18px}
.qz-num{animation:fadeUp .6s both}
.em{color:var(--gold)!important;font-weight:600}
`
