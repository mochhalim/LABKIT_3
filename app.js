/* Peminjaman Alat Bengkel TKJ — sederhana, tanpa server. Data di localStorage; cadangan lewat file JSON. */
const KEY = "tkj_peminjaman_v1", $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toLocaleDateString("sv-SE");
const addDays = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE");
const tgl = d => d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
const KONDISI = ["Baik", "Rusak ringan", "Rusak berat", "Hilang"], KC = { "Baik": "ok", "Rusak ringan": "warn", "Rusak berat": "bad", "Hilang": "lost" };
const TABS = [["pinjam", "Peminjaman"], ["kembali", "Pengembalian"], ["data", "Data peminjam"], ["alat", "Daftar alat"], ["laporan", "Laporan"]];
let page = "pinjam", month = today().slice(0, 7), flt = { q: "", s: "all" }, unlocked = sessionStorage.getItem("unl") === "1";

/* ---------- Data ---------- */
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { loans: Array.isArray(d.loans) ? d.loans : [], items: Array.isArray(d.items) ? d.items : [], set: { sekolah: "", admin: "", ...(d.set || {}) }, pin: d.pin || null, lastBackup: d.lastBackup || 0 };
  } catch { return { loans: [], items: [], set: { sekolah: "", admin: "" }, pin: null, lastBackup: 0 }; }
}
let db = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast("Penyimpanan penuh atau diblokir browser. Unduh cadangan sekarang."); } };
function toast(t, undo) { const el = $("#toast"); el.textContent = t; if (undo) el.insertAdjacentHTML("beforeend", ' <button class="btn sm" data-act="undo">Urungkan</button>'); el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), undo ? 7000 : 2800); }
const isLate = l => l.status === "borrowed" && l.due < today();

/* ---------- PIN admin (pencegah salah pakai, bukan keamanan sungguhan) ---------- */
const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tkj:" + s)))].map(b => b.toString(16).padStart(2, "0")).join("");
async function unlock() {
  if (unlocked) return true;
  if (!db.pin) { const p = prompt("Buat PIN admin (4-8 angka):"); if (!/^\d{4,8}$/.test(p || "")) return false; db.pin = await sha(p); save(); }
  else { const p = prompt("Masukkan PIN admin:"); if (!p || await sha(p) !== db.pin) { toast("PIN salah."); return false; } }
  unlocked = true; sessionStorage.setItem("unl", "1"); return true;
}

/* ---------- Komponen ---------- */
const kondChip = l => l.kondisi ? `<span class="chip ${KC[l.kondisi] || ""}">${esc(l.kondisi)}</span>` : "";
function tagHtml(l, withBtn) {
  const late = isLate(l);
  return `<article class="tag ${late ? "late" : l.status === "returned" ? "done" : ""}"><div><h3>${esc(l.barang)} <small>× ${l.jumlah}</small></h3>
    <p><b>${esc(l.nama)}</b> · ${esc(l.kelas)}</p><p class="muted">Dipinjam ${tgl(l.tglPinjam)} · batas kembali ${tgl(l.due)}${l.ext ? ` (diperpanjang ${l.ext}×)` : ""}${l.tujuan ? " · " + esc(l.tujuan) : ""}</p></div>
    <div class="tag-side">${late ? '<span class="chip bad">Terlambat</span>' : ""}${withBtn ? `<button class="btn ghost sm" data-act="ext" data-id="${l.id}">+3 hari</button><button class="btn primary sm" data-act="ret" data-id="${l.id}">Terima kembali</button>` : ""}</div></article>`;
}
function activeList(q = "") {
  q = q.toLowerCase();
  const rows = db.loans.filter(l => l.status === "borrowed" && (!q || [l.nama, l.kelas, l.barang].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => (isLate(b) - isLate(a)) || a.due.localeCompare(b.due));
  return rows.map(l => tagHtml(l, true)).join("") || `<p class="empty">${q ? "Tidak ada yang cocok." : "Tidak ada alat yang sedang dipinjam."}</p>`;
}
function dataTable() {
  const q = flt.q.toLowerCase();
  const rows = [...db.loans].reverse().filter(l => (flt.s === "all" || (flt.s === "late" ? isLate(l) : l.status === flt.s)) && (!q || [l.nama, l.kelas, l.barang].join(" ").toLowerCase().includes(q)));
  if (!rows.length) return '<p class="empty">Belum ada data.</p>';
  return `<div class="tbl"><table><thead><tr><th>Peminjam</th><th>Barang</th><th>Dipinjam</th><th>Batas</th><th>Dikembalikan</th><th>Kondisi</th><th></th></tr></thead><tbody>${rows.map(l => `<tr>
    <td><b>${esc(l.nama)}</b><br><span class="muted">${esc(l.kelas)}</span></td><td>${esc(l.barang)} × ${l.jumlah}${l.tujuan ? `<br><span class="muted">${esc(l.tujuan)}</span>` : ""}</td>
    <td>${tgl(l.tglPinjam)}</td><td>${tgl(l.due)}${isLate(l) ? ' <span class="chip bad">Telat</span>' : ""}</td>
    <td>${l.status === "returned" ? tgl(l.tglKembali) : '<span class="chip">Belum</span>'}</td><td>${kondChip(l)}${l.catatan ? `<br><span class="muted">${esc(l.catatan)}</span>` : ""}</td>
    <td><button class="btn danger sm" data-act="del" data-id="${l.id}">Hapus</button></td></tr>`).join("")}</tbody></table></div>`;
}
function report() {
  const list = db.loans.filter(l => l.tglPinjam.slice(0, 7) === month).sort((a, b) => a.tglPinjam.localeCompare(b.tglPinjam));
  const back = list.filter(l => l.status === "returned"), cnt = k => back.filter(l => l.kondisi === k).length;
  const top = Object.entries(list.reduce((m, l) => (m[l.barang] = (m[l.barang] || 0) + l.jumlah, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5), carry = db.loans.filter(l => l.status === "borrowed" && l.tglPinjam.slice(0, 7) < month);
  const label = new Date(month + "-01T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return `<div class="rep"><div class="rep-head"><h2>LAPORAN PEMINJAMAN ALAT</h2><p><b>${esc(db.set.sekolah || "Bengkel TKJ")}</b></p><p>Periode: ${label}</p></div>
    <div class="rep-sum"><span>Total peminjaman: <b>${list.length}</b></span><span>Sudah kembali: <b>${back.length}</b></span><span>Belum kembali: <b>${list.length - back.length}</b></span>
      ${top.length ? `<span>Barang terbanyak: <b>${top.map(([n, c]) => `${esc(n)} (${c})`).join(", ")}</b></span>` : ""}<span>Kondisi saat kembali — Baik: <b>${cnt("Baik")}</b>, Rusak ringan: <b>${cnt("Rusak ringan")}</b>, Rusak berat: <b>${cnt("Rusak berat")}</b>, Hilang: <b>${cnt("Hilang")}</b></span></div>
    ${list.length ? `<div class="tbl"><table><thead><tr><th>No</th><th>Tgl pinjam</th><th>Nama</th><th>Kelas</th><th>Barang</th><th>Jml</th><th>Tgl kembali</th><th>Kondisi</th><th>Catatan</th></tr></thead><tbody>${list.map((l, i) => `<tr><td>${i + 1}</td><td>${tgl(l.tglPinjam)}</td><td>${esc(l.nama)}</td><td>${esc(l.kelas)}</td><td>${esc(l.barang)}</td><td>${l.jumlah}</td>
      <td>${l.status === "returned" ? tgl(l.tglKembali) : "Belum kembali"}</td><td>${esc(l.kondisi || "-")}</td><td>${esc(l.catatan || "")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">Tidak ada peminjaman pada bulan ini.</p>'}
    ${carry.length ? `<h3 style="margin-top:18px">Belum kembali dari bulan sebelumnya</h3><div class="tbl"><table><thead><tr><th>Tgl pinjam</th><th>Nama</th><th>Kelas</th><th>Barang</th><th>Jml</th><th>Batas</th></tr></thead><tbody>${carry.map(l => `<tr><td>${tgl(l.tglPinjam)}</td><td>${esc(l.nama)}</td><td>${esc(l.kelas)}</td><td>${esc(l.barang)}</td><td>${l.jumlah}</td><td>${tgl(l.due)}</td></tr>`).join("")}</tbody></table></div>` : ""}<div class="sign"><div>Mengetahui,<br>Admin / Laboran<div class="line">${esc(db.set.admin || "(...........................)")}</div></div></div></div>`;
}

const itemRow = () => `<div class="irow"><input name="barang" required maxlength="100" list="dl-b" placeholder="Nama barang, mis. LAN tester" aria-label="Nama barang"><input name="jumlah" type="number" min="1" max="50" value="1" required aria-label="Jumlah"><button type="button" class="btn danger sm" data-act="rmitem" aria-label="Hapus baris">✕</button></div>`;
const backupNote = () => db.loans.length && Date.now() - db.lastBackup > 7 * 864e5
  ? `<div class="note no-print"><span>⚠️ Cadangan data ${db.lastBackup ? "sudah lebih dari 7 hari" : "belum pernah dibuat"}.</span><button class="btn sm ghost" data-act="tab" data-id="laporan">Buka Cadangan</button></div>` : "";

let undoBuf = null;
const norm = s => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const findItem = n => db.items.find(i => norm(i.nama) === norm(n));
const stokInfo = i => { const L = db.loans.filter(l => l.itemId === i.id), sum = a => a.reduce((x, l) => x + l.jumlah, 0);
  const out = sum(L.filter(l => l.status === "borrowed")), lost = sum(L.filter(l => l.kondisi === "Hilang")); return { out, lost, avail: i.stok - out - lost }; };
const linkLoans = () => db.loans.forEach(l => { if (!l.itemId) { const it = findItem(l.barang); if (it) l.itemId = it.id; } });

/* ---------- Halaman ---------- */
const V = {
  pinjam() {
    const act = db.loans.filter(l => l.status === "borrowed"), m = today().slice(0, 7);
    const done = db.loans.filter(l => l.status === "returned" && (l.tglKembali || "").slice(0, 7) === m).length;
    const uniq = k => [...new Set(db.loans.map(l => l[k]).filter(Boolean))].slice(-60).map(v => `<option value="${esc(v)}">`).join("");
    return `${backupNote()}<div class="stats"><div class="tile big"><span>Sedang dipinjam</span><strong>${act.length}</strong></div><div class="tile late"><span>Terlambat</span><strong>${act.filter(isLate).length}</strong></div><div class="tile"><span>Kembali bulan ini</span><strong>${done}</strong></div></div>
    <form id="f-pinjam" class="card"><h2>Form peminjaman</h2><p class="muted">Isi data diri dan tulis nama barang yang dipinjam.</p>
      <div class="grid2"><label>Nama peminjam<input name="nama" required maxlength="60" list="dl-n" autocomplete="off"></label>
      <label>Kelas<input name="kelas" required maxlength="20" placeholder="XI TKJ 1"></label>
      <div class="span2"><span class="lbl">Barang yang dipinjam</span><div id="items">${itemRow()}</div><button type="button" class="btn ghost sm" data-act="additem">+ Tambah barang</button></div>
      
      <label>Tanggal kembali<input name="due" type="date" required min="${today()}" max="${addDays(14)}" value="${addDays(3)}"></label>
      <label class="span2">Keperluan (opsional)<input name="tujuan" maxlength="100" placeholder="Contoh: praktik crimping kabel UTP"></label></div>
      <datalist id="dl-n">${uniq("nama")}</datalist><datalist id="dl-b">${db.items.length ? db.items.map(i => `<option value="${esc(i.nama)}" label="tersedia ${stokInfo(i).avail}">`).join("") : uniq("barang")}</datalist>
      <button class="btn primary">Catat peminjaman</button></form>`;
  },
  kembali() { return `<section class="card"><h2>Pengembalian</h2><p class="muted">Periksa barang, lalu catat keadaannya saat dikembalikan.</p><div class="toolbar"><input id="q" type="search" placeholder="Cari nama, kelas, atau barang" aria-label="Cari"></div><div id="list" class="stack">${activeList()}</div></section>`; },
  data() {
    return `<section class="card"><h2>Data peminjam</h2><div class="toolbar"><input id="dq" type="search" placeholder="Cari nama, kelas, atau barang" value="${esc(flt.q)}" aria-label="Cari">
      <select id="ds" aria-label="Status">${[["all", "Semua"], ["borrowed", "Belum kembali"], ["late", "Terlambat"], ["returned", "Sudah kembali"]].map(([v, t]) => `<option value="${v}" ${flt.s === v ? "selected" : ""}>${t}</option>`).join("")}</select></div><div id="tbl">${dataTable()}</div></section>`;
  },
  alat() {
    const rows = db.items.map(i => { const s = stokInfo(i); return `<tr><td><b>${esc(i.nama)}</b></td><td>${i.stok}</td><td>${s.out}</td><td>${s.lost}</td><td><span class="chip ${s.avail > 0 ? "ok" : "bad"}">${s.avail}</span></td>
      <td><button class="btn ghost sm" data-act="stok" data-id="${i.id}">Ubah stok</button> <button class="btn danger sm" data-act="delitem" data-id="${i.id}">Hapus</button></td></tr>`; }).join("");
    return `<section class="card"><h2>Daftar alat &amp; stok</h2><p class="muted">Jika daftar ini terisi, peminjaman hanya bisa memilih alat dari sini dan stok dicek otomatis. Alat hilang mengurangi stok.</p>
      <form id="f-alat" class="toolbar"><input name="nama" required maxlength="60" placeholder="Nama alat"><input name="stok" type="number" min="0" max="999" value="1" required style="width:90px" aria-label="Stok"><button class="btn primary">Tambah</button></form>
      ${rows ? `<div class="tbl"><table><thead><tr><th>Alat</th><th>Stok</th><th>Dipinjam</th><th>Hilang</th><th>Tersedia</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Belum ada alat.</p>'}
      <div class="actions"><button class="btn ghost" data-act="seed">Buat daftar dari riwayat</button></div></section>`;
  },
  laporan() {
    const last = db.lastBackup ? new Date(db.lastBackup).toLocaleDateString("id-ID") : "belum pernah";
    return `<section class="card no-print"><h2>Laporan bulanan</h2><div class="grid2"><label>Bulan<input id="month" type="month" value="${month}"></label><span></span>
      <label>Nama sekolah / bengkel (untuk kop)<input data-set="sekolah" value="${esc(db.set.sekolah)}" maxlength="80" placeholder="SMK ... / Bengkel TKJ"></label>
      <label>Nama admin (untuk tanda tangan)<input data-set="admin" value="${esc(db.set.admin)}" maxlength="60"></label></div>
      <div class="actions"><button class="btn primary" data-act="print">Cetak laporan</button><button class="btn ghost" data-act="csv">Unduh CSV (Excel)</button></div></section>${report()}
      <section class="card no-print" style="margin-top:18px"><h2>Cadangan data</h2><p class="muted">Data tersimpan di browser perangkat ini. Unduh cadangan secara rutin. Cadangan terakhir: <b>${last}</b>.</p>
        <div class="actions"><button class="btn primary" data-act="backup">Unduh cadangan</button><button class="btn ghost" data-act="restore">Pulihkan dari cadangan</button><button class="btn ghost" data-act="setpin">Ganti PIN</button></div>
        <input id="restore-file" type="file" accept=".json" class="hidden"></section>`;
  }
};
function draw() {
  $("#tabs").innerHTML = TABS.map(([k, l]) => `<button class="tab ${k === page ? "on" : ""} ${(k === "laporan" || k === "alat") && !unlocked ? "lock" : ""}" data-act="tab" data-id="${k}">${l}</button>`).join("");
  $("#view").innerHTML = V[page]();
}
async function go(p) { if ((p === "laporan" || p === "alat") && !(await unlock())) return; page = p; draw(); window.scrollTo(0, 0); }

/* ---------- Aksi ---------- */
async function openReturn(id) {
  if (!(await unlock())) return;
  const l = db.loans.find(x => x.id === id); if (!l || l.status !== "borrowed") return;
  $("#f-ret").dataset.id = id;
  $("#f-ret").innerHTML = `<h2>Terima pengembalian</h2><p><b>${esc(l.barang)}</b> × ${l.jumlah}<br><span class="muted">${esc(l.nama)} · ${esc(l.kelas)}</span></p>
    <fieldset><legend>Keadaan barang saat dikembalikan</legend>${KONDISI.map((k, i) => `<label class="opt"><input type="radio" name="kondisi" value="${k}" ${i ? "" : "checked"}><span>${k}</span></label>`).join("")}</fieldset>
    <label>Jumlah dikembalikan (dari ${l.jumlah})<input name="qty" type="number" min="1" max="${l.jumlah}" value="${l.jumlah}" required></label>
    <label>Catatan (opsional)<input name="catatan" maxlength="120" placeholder="Contoh: kabel ujung patah"></label>
    <div class="actions"><button type="button" class="btn ghost" data-act="cancel">Batal</button><button class="btn primary">Simpan pengembalian</button></div>`;
  $("#dlg").showModal();
}
function download(name, blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
const actions = {
  tab: id => go(id), ret: openReturn,
  additem: () => $("#items").insertAdjacentHTML("beforeend", itemRow()),
  ext: async id => { if (!(await unlock())) return; const l = db.loans.find(x => x.id === id); if (!l) return; const d = new Date(l.due + "T00:00:00"); d.setDate(d.getDate() + 3); l.due = d.toLocaleDateString("sv-SE"); l.ext = (l.ext || 0) + 1; save(); toast("Tenggat diperpanjang 3 hari."); draw(); },
  csv: () => { const q = v => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const rows = db.loans.filter(l => l.tglPinjam.slice(0, 7) === month).sort((a, b) => a.tglPinjam.localeCompare(b.tglPinjam));
    const head = ["Tgl pinjam", "Nama", "Kelas", "Barang", "Jumlah", "Batas kembali", "Tgl kembali", "Kondisi", "Catatan", "Keperluan"];
    const body = rows.map(l => [l.tglPinjam, l.nama, l.kelas, l.barang, l.jumlah, l.due, l.tglKembali, l.kondisi, l.catatan, l.tujuan].map(q).join(","));
    download(`laporan-${month}.csv`, new Blob(["\ufeff" + [head.map(q).join(","), ...body].join("\r\n")], { type: "text/csv" })); }, cancel: () => $("#dlg").close(), print: () => window.print(),
  del: async id => { if (!(await unlock())) return; const i = db.loans.findIndex(l => l.id === id); if (i < 0) return; undoBuf = { i, l: db.loans[i] }; db.loans.splice(i, 1); save(); draw(); toast("Data dihapus.", true); },
  undo: () => { if (!undoBuf) return; db.loans.splice(Math.min(undoBuf.i, db.loans.length), 0, undoBuf.l); undoBuf = null; save(); draw(); $("#toast").classList.remove("show"); },
  stok: id => { const i = db.items.find(x => x.id === id); if (!i) return; const v = prompt(`Stok total ${i.nama}:`, i.stok); if (v === null) return; const n = parseInt(v, 10); if (!(n >= 0)) return toast("Angka tidak valid."); i.stok = n; save(); draw(); },
  delitem: id => { const i = db.items.find(x => x.id === id); if (!i) return; if (db.loans.some(l => l.itemId === id && l.status === "borrowed")) return toast("Masih ada yang dipinjam."); if (confirm(`Hapus ${i.nama} dari daftar alat?`)) { db.items = db.items.filter(x => x.id !== id); save(); draw(); } },
  seed: () => { const mx = {}; db.loans.forEach(l => { const k = norm(l.barang); if (!k || findItem(l.barang)) return; mx[k] = { nama: l.barang.trim(), stok: Math.max(mx[k]?.stok || 0, l.jumlah) }; });
    const v = Object.values(mx); if (!v.length) return toast("Tidak ada nama baru."); v.forEach(x => db.items.push({ id: crypto.randomUUID(), ...x })); linkLoans(); save(); toast(`${v.length} alat dibuat. Periksa stoknya.`); draw(); },
  backup: () => { db.lastBackup = Date.now(); save(); const { pin, ...d } = db; download(`cadangan-peminjaman-${today()}.json`, new Blob([JSON.stringify(d, null, 1)], { type: "application/json" })); draw(); },
  restore: () => $("#restore-file").click(),
  setpin: async () => { const p = prompt("PIN admin baru (4-8 angka):"); if (!/^\d{4,8}$/.test(p || "")) return toast("PIN harus 4-8 angka."); db.pin = await sha(p); save(); toast("PIN diganti."); }
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (b?.dataset.act === "rmitem") { if ($("#items").children.length > 1) b.closest(".irow").remove(); return; } if (b) actions[b.dataset.act]?.(b.dataset.id); });

document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "f-pinjam") {
    const f = new FormData(e.target), due = f.get("due");
    if (due < today() || due > addDays(14)) return toast("Tanggal kembali harus antara hari ini dan 14 hari ke depan.");
    const names = f.getAll("barang").map(x => x.trim()), qty = f.getAll("jumlah").map(x => Math.min(50, Math.max(1, parseInt(x, 10) || 1))), trx = crypto.randomUUID(), need = {};
    for (let i = 0; i < names.length; i++) { if (!names[i]) continue; const it = findItem(names[i]);
      if (db.items.length && !it) return toast(`"${names[i]}" tidak ada di Daftar alat.`);
      if (it) { need[it.id] = (need[it.id] || 0) + qty[i]; const av = stokInfo(it).avail; if (need[it.id] > av) return toast(`Stok ${it.nama} tersisa ${Math.max(0, av)}.`); } }
    let n = 0;
    names.forEach((b, i) => { if (!b) return; n++; const it = findItem(b);
      db.loans.push({ id: crypto.randomUUID(), trx, itemId: it?.id, nama: f.get("nama").trim(), kelas: f.get("kelas").trim(), barang: it ? it.nama : b,
        jumlah: qty[i], tujuan: f.get("tujuan").trim(), tglPinjam: today(), due, status: "borrowed" }); });
    save(); toast(n > 1 ? `${n} barang tercatat.` : "Peminjaman tercatat."); draw();
  }
  if (e.target.id === "f-alat") { const f = new FormData(e.target), nama = f.get("nama").trim().replace(/\s+/g, " ");
    if (findItem(nama)) return toast("Alat itu sudah ada.");
    db.items.push({ id: crypto.randomUUID(), nama, stok: Math.max(0, parseInt(f.get("stok"), 10) || 0) }); linkLoans(); save(); toast("Alat ditambahkan."); draw(); }
  if (e.target.id === "f-ret") {
    const l = db.loans.find(x => x.id === e.target.dataset.id), f = new FormData(e.target); if (!l || l.status !== "borrowed") return;
    const k = Math.min(l.jumlah, Math.max(1, parseInt(f.get("qty"), 10) || l.jumlah)); let r = l;
    if (k < l.jumlah) { r = { ...l, id: crypto.randomUUID(), jumlah: k }; l.jumlah -= k; db.loans.push(r); }
    r.status = "returned"; r.tglKembali = today(); r.kondisi = KONDISI.includes(f.get("kondisi")) ? f.get("kondisi") : "Baik"; r.catatan = (f.get("catatan") || "").trim();
    save(); $("#dlg").close(); toast("Pengembalian dicatat."); draw();
  }
});
document.addEventListener("input", e => {
  if (e.target.id === "q") $("#list").innerHTML = activeList(e.target.value);
  if (e.target.id === "dq") { flt.q = e.target.value; $("#tbl").innerHTML = dataTable(); }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "ds") { flt.s = t.value; $("#tbl").innerHTML = dataTable(); }
  if (t.id === "month" && t.value) { month = t.value; draw(); }
  if (t.dataset.set) { db.set[t.dataset.set] = t.value.trim(); save(); draw(); }
  if (t.id === "restore-file" && t.files[0]) {
    try { const d = JSON.parse(await t.files[0].text()); if (!Array.isArray(d.loans)) throw Error();
      if (!confirm("Pulihkan cadangan? Data saat ini akan diganti.")) return;
      const loans = d.loans.filter(l => l && l.id && l.nama && l.barang && /^\d{4}-\d{2}-\d{2}$/.test(l.tglPinjam || "") && /^\d{4}-\d{2}-\d{2}$/.test(l.due || ""))
        .map(l => ({ ...l, jumlah: Math.max(1, parseInt(l.jumlah, 10) || 1), status: l.status === "returned" ? "returned" : "borrowed" }));
      db = { ...db, loans, items: Array.isArray(d.items) ? d.items.filter(i => i && i.id && i.nama).map(i => ({ id: i.id, nama: String(i.nama), stok: Math.max(0, parseInt(i.stok, 10) || 0) })) : db.items, set: { ...db.set, ...(d.set || {}) } }; save(); toast(`${loans.length} data dipulihkan.`); draw();
    } catch { toast("Berkas cadangan tidak valid."); }
  }
});
draw();

/* ---------- PWA: bisa dipasang sebagai aplikasi + berjalan offline ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
let installEv = null;
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEv = e; $("#install").classList.remove("hidden"); });
addEventListener("appinstalled", () => { installEv = null; $("#install").classList.add("hidden"); toast("Aplikasi terpasang."); });
if (ios && !standalone) $("#install").classList.remove("hidden");
$("#install").onclick = async () => {
  if (installEv) { installEv.prompt(); await installEv.userChoice; installEv = null; $("#install").classList.add("hidden"); }
  else toast("Di Safari: ketuk tombol Bagikan, lalu pilih Tambah ke Layar Utama.");
};
